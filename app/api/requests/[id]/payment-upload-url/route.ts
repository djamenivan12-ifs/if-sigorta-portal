import {
  NextResponse,
} from "next/server";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/security/rateLimit";

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

const IP_RATE_LIMIT =
  10;

const IDENTITY_RATE_LIMIT =
  5;

const RATE_LIMIT_WINDOW_SECONDS =
  10 * 60;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PaymentUploadUrlPayload = {
  requestCode?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;
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

function rateLimitedResponse(
  retryAfterSeconds: number,
) {
  return NextResponse.json(
    {
      success: false,

      error:
        "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.",
    },
    {
      status: 429,

      headers: {
        "Retry-After":
          String(
            Math.max(
              1,
              retryAfterSeconds,
            ),
          ),

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
  const {
    id,
  } =
    await context.params;

  /*
   * ============================================
   * 1. IDENTIFIANT
   * ============================================
   */

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
   * 2. RATE LIMIT PAR IP
   * ============================================
   */

  const clientIp =
    getClientIp(
      request,
    );

  const ipLimit =
    await consumeRateLimit({
      namespace:
        "request-payment-upload-url-ip",

      identifier:
        clientIp,

      limit:
        IP_RATE_LIMIT,

      windowSeconds:
        RATE_LIMIT_WINDOW_SECONDS,
    });

  if (
    !ipLimit.allowed
  ) {
    return rateLimitedResponse(
      ipLimit.retryAfterSeconds,
    );
  }

  /*
   * ============================================
   * 3. BODY
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

  const requestCode =
    body.requestCode
      ?.trim()
      .toUpperCase() ??
    "";

  const whatsappCountryCode =
    body.whatsappCountryCode
      ?.trim() ??
    "";

  const whatsappNumber =
    body.whatsappNumber
      ?.replace(
        /\D/g,
        "",
      ) ??
    "";

  const fileName =
    body.fileName
      ?.trim() ??
    "";

  const mimeType =
    body.mimeType
      ?.trim() ??
    "";

  const fileSize =
    Number(
      body.fileSize,
    );

  if (
    !requestCode ||
    !whatsappCountryCode ||
    !whatsappNumber
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Les informations du dossier sont incomplètes.",
      },
      400,
    );
  }

  /*
   * ============================================
   * 4. VALIDATION DU FICHIER
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

  /*
   * ============================================
   * 5. RATE LIMIT PAR IDENTITÉ
   * ============================================
   */

  const identityLimit =
    await consumeRateLimit({
      namespace:
        "request-payment-upload-url-identity",

      identifier:
        `${id}|${requestCode}|${whatsappCountryCode}|${whatsappNumber}`,

      limit:
        IDENTITY_RATE_LIMIT,

      windowSeconds:
        RATE_LIMIT_WINDOW_SECONDS,
    });

  if (
    !identityLimit.allowed
  ) {
    return rateLimitedResponse(
      identityLimit.retryAfterSeconds,
    );
  }

  const serviceClient =
    createServiceClient();

  /*
   * ============================================
   * 6. DOSSIER DIRECT
   * ============================================
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
          status,

          client:clients (
            whatsapp_country_code,
            whatsapp_number
          )
        `,
      )
      .eq(
        "id",
        id,
      )
      .eq(
        "request_code",
        requestCode,
      )
      .eq(
        "source",
        "direct",
      )
      .maybeSingle();

  if (
    requestError
  ) {
    console.error(
      "Erreur vérification dossier paiement direct :",
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

  if (
    !insuranceRequest
  ) {
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
   * 7. VÉRIFICATION WHATSAPP
   * ============================================
   */

  const clientRelation =
    insuranceRequest.client;

  const client =
    Array.isArray(
      clientRelation,
    )
      ? (
          clientRelation[0] ??
          null
        )
      : clientRelation;

  const storedCountryCode =
    client
      ?.whatsapp_country_code
      ?.trim() ??
    "";

  const storedWhatsappNumber =
    client
      ?.whatsapp_number
      ?.replace(
        /\D/g,
        "",
      ) ??
    "";

  if (
    storedCountryCode !==
      whatsappCountryCode ||
    storedWhatsappNumber !==
      whatsappNumber
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Les informations ne correspondent pas au dossier.",
      },
      403,
    );
  }

  /*
   * ============================================
   * 8. STATUT
   * ============================================
   *
   * Cette route concerne uniquement le premier
   * paiement.
   *
   * Le nouvel envoi après refus est géré par
   * /api/tracking/payment-receipt.
   */

  if (
    insuranceRequest.status !==
    "waiting_payment"
  ) {
    let errorMessage =
      "Ce dossier n'est plus en attente de paiement.";

    if (
      insuranceRequest.status ===
      "payment_review"
    ) {
      errorMessage =
        "Le justificatif de paiement a déjà été envoyé.";
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
   * 9. PAIEMENT EXISTANT
   * ============================================
   */

  const {
    data:
      existingPayment,
    error:
      existingPaymentError,
  } =
    await serviceClient
      .from(
        "payments",
      )
      .select(
        "id",
      )
      .eq(
        "request_id",
        id,
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    existingPaymentError
  ) {
    console.error(
      "Erreur vérification paiement existant :",
      existingPaymentError,
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

  if (
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
   * 10. CHEMIN TEMPORAIRE
   * ============================================
   */

  const safeFileName =
    sanitizeFileName(
      fileName,
    );

  const uploadSessionId =
    crypto.randomUUID();

  const storagePath =
    `pending/direct/payment/` +
    `${id}/${uploadSessionId}/` +
    `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

  /*
   * ============================================
   * 11. URL SIGNÉE
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
      "Erreur création URL signée dekont client :",
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
   * 12. RÉPONSE
   * ============================================
   */

  return jsonResponse(
    {
      success: true,

      requestId:
        insuranceRequest.id,

      requestCode:
        insuranceRequest.request_code,

      uploadSessionId,

      path:
        storagePath,

      token:
        signedUpload.token,
    },
    200,
  );
}