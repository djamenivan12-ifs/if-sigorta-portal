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

type UploadUrlPayload = {
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
  const sanitized =
    fileName
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      )
      .replace(
        /_+/g,
        "_",
      )
      .replace(
        /^_+|_+$/g,
        "");

  return (
    sanitized ||
    "payment-receipt"
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
) {
  const serviceClient =
    createServiceClient();

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
          "tracking-payment-receipt-upload-url-ip",

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
     * 2. LECTURE DU JSON
     * ============================================
     */

    let body:
      UploadUrlPayload;

    try {
      body =
        (await request.json()) as
          UploadUrlPayload;
    } catch {
      return NextResponse.json(
        {
          success: false,

          error:
            "Requête invalide.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
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
        ?.trim()
        .toLowerCase() ??
      "";

    const fileSize =
      Number(
        body.fileSize,
      );

    /*
     * ============================================
     * 3. VALIDATION DES INFORMATIONS
     * ============================================
     */

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

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    if (
      !fileName
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Le nouveau dekont est obligatoire.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    if (
      !ALLOWED_FILE_TYPES.includes(
        mimeType,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Format non accepté. Utilisez PDF, JPG, JPEG ou PNG.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    if (
      !Number.isFinite(
        fileSize,
      ) ||
      fileSize <= 0
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Le fichier est vide ou invalide.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    if (
      fileSize >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Le fichier ne doit pas dépasser 10 Mo.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 4. RATE LIMIT PAR IDENTITÉ
     * ============================================
     */

    const identityLimit =
      await consumeRateLimit({
        namespace:
          "tracking-payment-receipt-upload-url-identity",

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
     * ============================================
     * 5. RECHERCHE DU DOSSIER DIRECT
     * ============================================
     *
     * Cette route appartient uniquement au suivi
     * public des clients directs.
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
        .eq(
          "source",
          "direct",
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

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 6. VÉRIFICATION DU NUMÉRO WHATSAPP
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
      return NextResponse.json(
        {
          success: false,

          error:
            "Les informations de suivi ne correspondent pas au dossier.",
        },
        {
          status: 403,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 7. LE PAIEMENT DOIT ÊTRE REFUSÉ
     * ============================================
     */

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

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 8. VÉRIFICATION DU PAIEMENT EXISTANT
     * ============================================
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
          "id",
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

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 9. CRÉATION DU CHEMIN TEMPORAIRE
     * ============================================
     *
     * Le navigateur pourra écrire uniquement dans
     * ce chemin grâce au token signé Supabase.
     */

    const uploadSessionId =
      crypto.randomUUID();

    const safeFileName =
      sanitizeFileName(
        fileName,
      );

    const pendingPath =
      `pending/direct/payment-reupload/` +
      `${insuranceRequest.id}/` +
      `${uploadSessionId}/` +
      `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    /*
     * ============================================
     * 10. CRÉATION DE L'URL SIGNÉE
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
          pendingPath,
        );

    if (
      signedUploadError ||
      !signedUpload?.token
    ) {
      throw new Error(
        signedUploadError
          ?.message ||
          "Impossible de préparer le téléversement du dekont.",
      );
    }

    /*
     * ============================================
     * 11. RÉPONSE
     * ============================================
     */

    return NextResponse.json(
      {
        success: true,

        requestId:
          insuranceRequest.id,

        requestCode:
          insuranceRequest.request_code,

        uploadSessionId,

        path:
          pendingPath,

        token:
          signedUpload.token,
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
    console.error(
      "Erreur préparation upload nouveau dekont :",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
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