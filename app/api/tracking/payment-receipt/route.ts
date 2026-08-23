import {
  NextResponse,
} from "next/server";

import {
  logActivity,
} from "@/lib/activity/logActivity";

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

function validateFile(
  file: File,
) {
  if (
    !ALLOWED_FILE_TYPES.includes(
      file.type,
    )
  ) {
    throw new Error(
      "Format non accepté. Utilisez PDF, JPG, JPEG ou PNG.",
    );
  }

  if (
    file.size === 0
  ) {
    throw new Error(
      "Le fichier est vide.",
    );
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    throw new Error(
      "Le fichier ne doit pas dépasser 10 Mo.",
    );
  }
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
) {
  const serviceClient =
    createServiceClient();

  let uploadedStoragePath:
    | string
    | null = null;

  try {
    /*
     * ============================================
     * 1. RATE LIMIT PAR ADRESSE IP
     * ============================================
     */
    const clientIp =
      getClientIp(
        request,
      );

    const ipLimit =
      await consumeRateLimit({
        namespace:
          "tracking-payment-receipt-ip",

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

    const formData =
      await request.formData();

    const requestCode =
      formData
        .get(
          "requestCode",
        )
        ?.toString()
        .trim()
        .toUpperCase() ??
      "";

    const whatsappCountryCode =
      formData
        .get(
          "whatsappCountryCode",
        )
        ?.toString()
        .trim() ??
      "";

    const whatsappNumber =
      formData
        .get(
          "whatsappNumber",
        )
        ?.toString()
        .replace(
          /\D/g,
          "",
        ) ??
      "";

    const paymentReceiptFile =
      formData.get(
        "paymentReceiptFile",
      );

    if (
      !requestCode ||
      !whatsappCountryCode ||
      !whatsappNumber
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Les informations de suivi sont incomplètes.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !(
        paymentReceiptFile instanceof
        File
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nouveau dekont est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    validateFile(
      paymentReceiptFile,
    );

    /*
     * ============================================
     * 2. RATE LIMIT PAR IDENTITÉ DE SUIVI
     * ============================================
     *
     * Plus strict que le simple suivi, car cette
     * route permet de téléverser un nouveau fichier
     * et de remettre le dossier en vérification.
     */
    const identityLimit =
      await consumeRateLimit({
        namespace:
          "tracking-payment-receipt-identity",

        identifier:
          `${requestCode}|${whatsappCountryCode}|${whatsappNumber}`,

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

    /*
     * Recherche du dossier avec
     * vérification du WhatsApp.
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
          "request_code",
          requestCode,
        )
        .maybeSingle();

    if (
      requestError
    ) {
      throw new Error(
        requestError.message,
      );
    }

    if (
      !insuranceRequest
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Dossier introuvable.",
        },
        {
          status: 404,
        },
      );
    }

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
      return NextResponse.json(
        {
          success: false,
          error:
            "Les informations de suivi ne correspondent pas au dossier.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      insuranceRequest.status !==
      "payment_rejected"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Un nouveau justificatif ne peut être envoyé que pour un paiement refusé.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Recherche du paiement.
     */
    const {
      data:
        payment,
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
            status
          `,
        )
        .eq(
          "request_id",
          insuranceRequest.id,
        )
        .maybeSingle();

    if (
      paymentError
    ) {
      throw new Error(
        paymentError.message,
      );
    }

    if (
      !payment
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Aucun paiement n’est associé à ce dossier.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Upload du nouveau dekont.
     */
    const safeName =
      sanitizeFileName(
        paymentReceiptFile.name,
      );

    uploadedStoragePath =
      `${insuranceRequest.id}/payment_receipt/` +
      `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const fileBuffer =
      await paymentReceiptFile.arrayBuffer();

    const {
      error:
        uploadError,
    } =
      await serviceClient.storage
        .from(
          BUCKET_NAME,
        )
        .upload(
          uploadedStoragePath,
          fileBuffer,
          {
            contentType:
              paymentReceiptFile.type,

            cacheControl:
              "3600",

            upsert:
              false,
          },
        );

    if (
      uploadError
    ) {
      throw new Error(
        `Téléversement impossible : ${uploadError.message}`,
      );
    }

    const now =
      new Date().toISOString();

    /*
     * Ancien document actif.
     */
    const {
      data:
        existingDocument,
      error:
        existingDocumentError,
    } =
      await serviceClient
        .from(
          "uploaded_documents",
        )
        .select(
          `
            id,
            storage_path
          `,
        )
        .eq(
          "request_id",
          insuranceRequest.id,
        )
        .eq(
          "document_type",
          "payment_receipt",
        )
        .order(
          "uploaded_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          1,
        )
        .maybeSingle();

    if (
      existingDocumentError
    ) {
      throw new Error(
        existingDocumentError.message,
      );
    }

    /*
 * Mise à jour du justificatif de paiement.
 *
 * La table uploaded_documents possède une
 * contrainte unique sur :
 *
 * request_id + document_type
 *
 * On remplace donc la ligne existante au lieu
 * d'en créer une deuxième.
 */
const {
  error:
    documentUpdateError,
} =
  await serviceClient
    .from(
      "uploaded_documents",
    )
    .upsert(
      {
        request_id:
          insuranceRequest.id,

        document_type:
          "payment_receipt",

        storage_path:
          uploadedStoragePath,

        original_file_name:
          paymentReceiptFile.name,

        mime_type:
          paymentReceiptFile.type,

        file_size:
          paymentReceiptFile.size,

        uploaded_at:
          now,
      },
      {
        onConflict:
          "request_id,document_type",
      },
    );

if (
  documentUpdateError
) {
  throw new Error(
    documentUpdateError.message,
  );
}

    /*
     * Remise du paiement en attente de vérification.
     */
    const {
      error:
        paymentUpdateError,
    } =
      await serviceClient
        .from(
          "payments",
        )
        .update({
          status:
            "submitted",

          submitted_at:
            now,

          verified_at:
            null,

          verified_by:
            null,

          rejection_reason:
            null,
        })
        .eq(
          "id",
          payment.id,
        );

    if (
      paymentUpdateError
    ) {
      throw new Error(
        paymentUpdateError.message,
      );
    }

    /*
     * Retour du dossier en payment_review.
     */
    const {
      data:
        updatedRequest,
      error:
        requestUpdateError,
    } =
      await serviceClient
        .from(
          "insurance_requests",
        )
        .update({
          status:
            "payment_review",

          updated_at:
            now,
        })
        .eq(
          "id",
          insuranceRequest.id,
        )
        .eq(
          "status",
          "payment_rejected",
        )
        .select(
          "id",
        )
        .maybeSingle();

    if (
      requestUpdateError
    ) {
      throw new Error(
        requestUpdateError.message,
      );
    }

    if (
      !updatedRequest
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le statut du dossier a changé entre-temps.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Historique.
     */
    await logActivity({
      requestId:
        insuranceRequest.id,

      userId:
        null,

      action:
        "payment_reuploaded",

      description:
        "Un nouveau justificatif de paiement a été envoyé par le client après refus.",
    });

    /*
     * On conserve l'ancien fichier pour l'historique.
     * Il n'est donc pas supprimé du Storage.
     *
     * Si plus tard tu veux ne garder qu'un seul dekont,
     * on pourra supprimer existingDocument.storage_path.
     */
    void existingDocument;

    uploadedStoragePath =
      null;

    return NextResponse.json(
      {
        success: true,

        status:
          "payment_review",
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",

          "X-RateLimit-Remaining":
            String(
              Math.min(
                ipLimit.remaining,
                identityLimit.remaining,
              ),
            ),
        },
      },
    );
  } catch (
    error
  ) {
    /*
     * Nettoyage du nouveau fichier
     * uniquement si la procédure échoue.
     */
    if (
      uploadedStoragePath
    ) {
      const {
        error:
          cleanupError,
      } =
        await serviceClient.storage
          .from(
            BUCKET_NAME,
          )
          .remove([
            uploadedStoragePath,
          ]);

      if (
        cleanupError
      ) {
        console.error(
          "Nettoyage du nouveau dekont impossible :",
          cleanupError.message,
        );
      }
    }

    console.error(
      "Erreur renvoi dekont :",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}