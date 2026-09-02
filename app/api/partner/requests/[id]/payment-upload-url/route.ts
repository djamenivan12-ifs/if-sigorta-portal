import {
  NextResponse,
} from "next/server";

import {
  requireApiPartner,
} from "@/lib/auth/requireApiPartner";

import {
  createServiceClient,
} from "@/lib/supabase/service";

const BUCKET_NAME =
  "insurance-documents";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PaymentUploadUrlPayload = {
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
};

function sanitizeFileName(
  fileName: string,
) {
  return fileName
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
}

function jsonResponse(
  body: Record<
    string,
    unknown
  >,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  /*
   * ============================================
   * 1. AUTHENTIFICATION PARTENAIRE
   * ============================================
   */

  const auth =
    await requireApiPartner();

  if (!auth.success) {
    return auth.response;
  }

  const {
    partner,
  } = auth;

  const {
    id,
  } =
    await context.params;

  if (!id) {
    return jsonResponse(
      {
        success: false,

        error:
          "Identifiant du dossier absent.",
      },
      400,
    );
  }

  /*
   * ============================================
   * 2. BODY
   * ============================================
   */

  let body:
    PaymentUploadUrlPayload;

  try {
    body =
      await request.json() as
        PaymentUploadUrlPayload;
  } catch {
    return jsonResponse(
      {
        success: false,

        error:
          "Les données envoyées sont invalides.",
      },
      400,
    );
  }

  const fileName =
    body.fileName?.trim() ??
    "";

  const mimeType =
    body.mimeType?.trim() ??
    "";

  const fileSize =
    Number(
      body.fileSize,
    );

  /*
   * ============================================
   * 3. VALIDATION DU FICHIER
   * ============================================
   */

  if (!fileName) {
    return jsonResponse(
      {
        success: false,

        error:
          "Le nom du fichier est obligatoire.",
      },
      400,
    );
  }

  if (
    !ALLOWED_FILE_TYPES.includes(
      mimeType,
    )
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Format non accepté. Utilisez PDF, JPG, JPEG ou PNG.",
      },
      400,
    );
  }

  if (
    !Number.isFinite(
      fileSize,
    ) ||
    fileSize <= 0
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Le fichier est vide ou invalide.",
      },
      400,
    );
  }

  if (
    fileSize >
    MAX_FILE_SIZE
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Le fichier ne doit pas dépasser 10 Mo.",
      },
      400,
    );
  }

  const serviceClient =
    createServiceClient();

  /*
   * ============================================
   * 4. DOSSIER PARTENAIRE
   * ============================================
   *
   * Sécurité :
   *
   * Le partenaire ne peut préparer un upload
   * que pour un dossier qui lui appartient.
   */

  const {
    data:
      insuranceRequest,
    error:
      requestError,
  } =
    await serviceClient
      .from(
        "insurance_requests",
      )
      .select(
        `
          id,
          request_code,
          status
        `,
      )
      .eq(
        "id",
        id,
      )
      .eq(
        "source",
        "partner",
      )
      .eq(
        "partner_id",
        partner.id,
      )
      .maybeSingle();

  if (requestError) {
    console.error(
      "Erreur vérification dossier partenaire :",
      requestError,
    );

    return jsonResponse(
      {
        success: false,

        error:
          "Impossible de vérifier le dossier.",
      },
      500,
    );
  }

  if (!insuranceRequest) {
    return jsonResponse(
      {
        success: false,

        error:
          "Dossier introuvable.",
      },
      404,
    );
  }

  /*
   * ============================================
   * 5. STATUT AUTORISÉ
   * ============================================
   *
   * Deux situations seulement :
   *
   * waiting_payment
   * → premier paiement
   *
   * payment_rejected
   * → nouveau justificatif après refus
   */

  const isFirstPayment =
    insuranceRequest.status ===
    "waiting_payment";

  const isRejectedPayment =
    insuranceRequest.status ===
    "payment_rejected";

  if (
    !isFirstPayment &&
    !isRejectedPayment
  ) {
    let errorMessage =
      "Ce dossier ne peut pas recevoir de justificatif de paiement.";

    if (
      insuranceRequest.status ===
      "payment_review"
    ) {
      errorMessage =
        "Le justificatif de paiement est déjà en cours de vérification.";
    }

    if (
      insuranceRequest.status ===
      "payment_confirmed"
    ) {
      errorMessage =
        "Le paiement de ce dossier est déjà confirmé.";
    }

    if (
      insuranceRequest.status ===
      "policy_preparation" ||
      insuranceRequest.status ===
      "policy_available"
    ) {
      errorMessage =
        "Le paiement de ce dossier a déjà été traité.";
    }

    if (
      insuranceRequest.status ===
      "cancelled"
    ) {
      errorMessage =
        "Ce dossier est annulé.";
    }

    return jsonResponse(
      {
        success: false,

        error:
          errorMessage,
      },
      409,
    );
  }

  /*
   * ============================================
   * 6. PAIEMENT EXISTANT
   * ============================================
   */

  const {
    data:
      existingPayment,
    error:
      paymentError,
  } =
    await serviceClient
      .from(
        "payments",
      )
      .select(
        `
          id,
          status,
          rejection_reason
        `,
      )
      .eq(
        "request_id",
        id,
      )
      .maybeSingle();

  if (paymentError) {
    console.error(
      "Erreur vérification paiement partenaire :",
      paymentError,
    );

    return jsonResponse(
      {
        success: false,

        error:
          "Impossible de vérifier le paiement.",
      },
      500,
    );
  }

  /*
   * ============================================
   * 7. COHÉRENCE PREMIER PAIEMENT
   * ============================================
   *
   * waiting_payment ne doit pas posséder
   * de paiement existant.
   */

  if (
    isFirstPayment &&
    existingPayment
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Un paiement est déjà associé à ce dossier.",
      },
      409,
    );
  }

  /*
   * ============================================
   * 8. COHÉRENCE PAIEMENT REFUSÉ
   * ============================================
   *
   * payment_rejected doit obligatoirement
   * posséder une ligne payment en rejected.
   *
   * Cette ligne sera réutilisée lors de la
   * finalisation du nouveau justificatif.
   */

  if (
    isRejectedPayment &&
    !existingPayment
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Aucun paiement refusé n'est associé à ce dossier.",
      },
      409,
    );
  }

  if (
    isRejectedPayment &&
    existingPayment?.status !==
      "rejected"
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Le paiement associé à ce dossier n'est pas dans un état permettant un nouvel envoi.",
      },
      409,
    );
  }

  /*
   * ============================================
   * 9. CHEMIN STORAGE TEMPORAIRE
   * ============================================
   *
   * Le fichier reste dans pending jusqu'à
   * finalisation par l'API /payment.
   */

  const safeFileName =
    sanitizeFileName(
      fileName,
    );

  const uploadSessionId =
    crypto.randomUUID();

  const storagePath =
    `pending/partner/${partner.id}/payment/` +
    `${id}/${uploadSessionId}/` +
    `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

  /*
   * ============================================
   * 10. URL SIGNÉE
   * ============================================
   */

  const {
    data:
      signedUpload,
    error:
      signedUploadError,
  } =
    await serviceClient.storage
      .from(
        BUCKET_NAME,
      )
      .createSignedUploadUrl(
        storagePath,
      );

  if (
    signedUploadError ||
    !signedUpload
  ) {
    console.error(
      "Erreur création URL signée dekont partenaire :",
      signedUploadError,
    );

    return jsonResponse(
      {
        success: false,

        error:
          "Impossible de préparer le téléversement du justificatif.",
      },
      500,
    );
  }

  /*
   * ============================================
   * 11. RÉPONSE
   * ============================================
   */

  return jsonResponse(
    {
      success: true,

      requestId:
        insuranceRequest.id,

      requestCode:
        insuranceRequest.request_code,

      paymentMode:
        isRejectedPayment
          ? "resubmission"
          : "initial",

      uploadSessionId,

      path:
        storagePath,

      token:
        signedUpload.token,
    },
    200,
  );
}