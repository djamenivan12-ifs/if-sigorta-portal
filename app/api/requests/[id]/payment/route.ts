import {
  NextResponse,
} from "next/server";

import {
  Resend,
} from "resend";

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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PaymentPayload = {
  requestCode?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;
  path?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
};

function jsonResponse(
  body: Record<string, unknown>,
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

function escapeEmailHtml(
  value: string,
) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendPaymentAdminEmail({
  requestCode,
  whatsappCountryCode,
  whatsappNumber,
  calculatedPrice,
  firstName,
  lastName,
  durationYears,
}: {
  requestCode: string;
  whatsappCountryCode: string;
  whatsappNumber: string;
  calculatedPrice?: number | null;
  firstName: string;
  lastName: string;
  durationYears?: number | null;
}) {
  const apiKey =
    process.env.RESEND_API_KEY;

  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL;

  if (
    !apiKey ||
    !adminEmail
  ) {
    console.error(
      "Notification e-mail paiement non envoyée : configuration Resend absente.",
    );

    return;
  }

  try {
    const resend =
      new Resend(
        apiKey,
      );

    const safeFirstName =
      escapeEmailHtml(
        firstName.trim() ||
          "—",
      );

    const safeLastName =
      escapeEmailHtml(
        lastName.trim() ||
          "—",
      );

    const safeRequestCode =
      escapeEmailHtml(
        requestCode,
      );

    const safeWhatsapp =
      escapeEmailHtml(
        `${whatsappCountryCode}${whatsappNumber}`,
      );

    const amountLabel =
      typeof calculatedPrice ===
      "number"
        ? `${calculatedPrice.toLocaleString(
            "fr-FR",
          )} TL`
        : "—";

    const durationLabel =
      typeof durationYears ===
      "number"
        ? `${durationYears} ${
            durationYears === 1
              ? "an"
              : "ans"
          }`
        : "—";

    const {
      error,
    } =
      await resend.emails.send({
        from:
          "IF Sigorta <onboarding@resend.dev>",

        to:
          adminEmail,

        subject:
          `Nouveau paiement reçu — ${requestCode}`,

        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:32px;color:#102B20;background:#F6F8F5">
            <div style="background:#ffffff;border:1px solid #E2EAE0;border-radius:18px;padding:32px">

              <div style="font-size:24px;font-weight:700;color:#0B5D3B;margin-bottom:24px">
                IF Sigorta
              </div>

              <div style="font-size:20px;font-weight:700;margin-bottom:24px">
                Nouveau paiement reçu
              </div>

              <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:15px">

                <tr>
                  <td style="padding:8px 0;font-weight:700">Source :</td>
                  <td style="padding:8px 0">Client direct</td>
                </tr>

                <tr>
                  <td style="padding:8px 0;font-weight:700">Client :</td>
                  <td style="padding:8px 0">${safeFirstName} ${safeLastName}</td>
                </tr>

                <tr>
                  <td style="padding:8px 0;font-weight:700">Matricule :</td>
                  <td style="padding:8px 0">${safeRequestCode}</td>
                </tr>

                <tr>
                  <td style="padding:8px 0;font-weight:700">WhatsApp :</td>
                  <td style="padding:8px 0">${safeWhatsapp}</td>
                </tr>

                <tr>
                  <td style="padding:8px 0;font-weight:700">Montant attendu :</td>
                  <td style="padding:8px 0">${amountLabel}</td>
                </tr>

                <tr>
                  <td style="padding:8px 0;font-weight:700">Durée :</td>
                  <td style="padding:8px 0">${durationLabel}</td>
                </tr>

              </table>

              <p style="margin:0;line-height:1.7">
                Le client vient de transmettre son justificatif de paiement.
                Connectez-vous à l'espace administrateur pour vérifier le paiement.
              </p>

            </div>
          </div>
        `,
      });

    if (error) {
      console.error(
        "Erreur notification e-mail paiement :",
        error,
      );
    }
  } catch (
    emailError
  ) {
    /*
     * Une erreur Resend ne doit jamais
     * annuler un paiement enregistré.
     */
    console.error(
      "Envoi de la notification e-mail paiement impossible :",
      emailError,
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
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
   * 1. RATE LIMIT PAR IP
   * ============================================
   */

  const clientIp =
    getClientIp(
      request,
    );

  const ipLimit =
    await consumeRateLimit({
      namespace:
        "request-first-payment-ip",

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

  const serviceClient =
    createServiceClient();

  let pendingStoragePath:
    | string
    | null = null;

  let finalStoragePath:
    | string
    | null = null;

  let storageMoved =
    false;

  let documentId:
    | string
    | null = null;

  let paymentId:
    | string
    | null = null;

  let requestLocked =
    false;

  let operationCompleted =
    false;

  try {
    /*
     * ============================================
     * 2. BODY JSON
     * ============================================
     */

    let body:
      PaymentPayload;

    try {
      body =
        await request.json() as
          PaymentPayload;
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

    pendingStoragePath =
      body.path
        ?.trim() ??
      "";

    const originalFileName =
      body.originalFileName
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

    if (
      !pendingStoragePath ||
      !originalFileName
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            "Le justificatif de paiement est obligatoire.",
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
     * 3. RATE LIMIT PAR IDENTITÉ
     * ============================================
     */

    const identityLimit =
      await consumeRateLimit({
        namespace:
          "request-first-payment-identity",

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

    /*
     * ============================================
     * 4. CHEMIN TEMPORAIRE
     * ============================================
     */

    const expectedPendingPrefix =
      `pending/direct/payment/${id}/`;

    if (
      !pendingStoragePath.startsWith(
        expectedPendingPrefix,
      )
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            "Le justificatif envoyé n'est pas valide pour ce dossier.",
        },
        403,
      );
    }

    /*
     * ============================================
     * 5. DOSSIER DIRECT
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
            calculated_price,
            insurance_duration_years,

            client:clients (
              first_name,
              last_name,
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
      throw new Error(
        requestError.message,
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
     * 6. WHATSAPP
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

    const firstName =
      client
        ?.first_name
        ?.trim() ??
      "";

    const lastName =
      client
        ?.last_name
        ?.trim() ??
      "";

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
     * 7. STATUT
     * ============================================
     */

    if (
      insuranceRequest.status !==
      "waiting_payment"
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            insuranceRequest.status ===
              "payment_review"
              ? "Le justificatif de paiement a déjà été envoyé."
              : "Ce dossier n'est plus en attente de paiement.",
        },
        409,
      );
    }

    /*
     * ============================================
     * 8. PAIEMENT EXISTANT
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
      throw new Error(
        existingPaymentError.message,
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
     * 9. VERROU ATOMIQUE
     * ============================================
     */

    const lockTime =
      new Date().toISOString();

    const {
      data:
        lockedRequest,
      error:
        lockError,
    } =
      await serviceClient
        .from(
          "insurance_requests",
        )
        .update({
          status:
            "payment_review",

          updated_at:
            lockTime,
        })
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
        .eq(
          "status",
          "waiting_payment",
        )
        .select(
          "id",
        )
        .maybeSingle();

    if (
      lockError
    ) {
      throw new Error(
        lockError.message,
      );
    }

    if (
      !lockedRequest
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            "Le justificatif de paiement est déjà en cours d'enregistrement ou a déjà été envoyé.",
        },
        409,
      );
    }

    requestLocked =
      true;

    /*
     * ============================================
     * 10. DÉPLACEMENT STORAGE
     * ============================================
     */

    const safeFileName =
      sanitizeFileName(
        originalFileName,
      );

    finalStoragePath =
      `${id}/payment_receipt/` +
      `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    const {
      error:
        moveError,
    } =
      await serviceClient.storage
        .from(
          BUCKET_NAME,
        )
        .move(
          pendingStoragePath,
          finalStoragePath,
        );

    if (
      moveError
    ) {
      throw new Error(
        `Déplacement du justificatif impossible : ${moveError.message}`,
      );
    }

    storageMoved =
      true;

    const now =
      new Date().toISOString();

    /*
     * ============================================
     * 11. DOCUMENT
     * ============================================
     */

    const {
      data:
        savedDocument,
      error:
        documentError,
    } =
      await serviceClient
        .from(
          "uploaded_documents",
        )
        .insert({
          request_id:
            id,

          document_type:
            "payment_receipt",

          storage_path:
            finalStoragePath,

          original_file_name:
            originalFileName,

          mime_type:
            mimeType,

          file_size:
            fileSize,

          uploaded_at:
            now,
        })
        .select(
          "id",
        )
        .single();

    if (
      documentError ||
      !savedDocument
    ) {
      throw new Error(
        `Enregistrement du justificatif impossible : ${
          documentError?.message ??
          "erreur inconnue"
        }`,
      );
    }

    documentId =
      savedDocument.id;

    /*
     * ============================================
     * 12. PAIEMENT
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
        .insert({
          request_id:
            id,

          payment_method:
            "bank_transfer",

          expected_amount:
            insuranceRequest.calculated_price,

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
        .select(
          "id",
        )
        .single();

    if (
      paymentError ||
      !payment
    ) {
      throw new Error(
        `Enregistrement du paiement impossible : ${
          paymentError?.message ??
          "erreur inconnue"
        }`,
      );
    }

    paymentId =
      payment.id;

    /*
     * ============================================
     * 13. HISTORIQUE
     * ============================================
     */

    try {
      await logActivity({
        requestId:
          id,

        userId:
          null,

        action:
          "payment_uploaded",

        description:
          "Le justificatif de paiement (dekont) a été envoyé par le client.",
      });
    } catch (
      logError
    ) {
      /*
       * Une erreur d'historique ne doit pas
       * annuler un paiement valide.
       */
      console.error(
        "Impossible d'enregistrer l'activité du paiement client :",
        logError,
      );
    }

    /*
     * ============================================
     * 14. EMAIL ADMIN
     * ============================================
     */

    await sendPaymentAdminEmail({
      requestCode:
        insuranceRequest.request_code,

      whatsappCountryCode:
        storedCountryCode,

      whatsappNumber:
        storedWhatsappNumber,

      calculatedPrice:
        insuranceRequest.calculated_price,

      firstName,

      lastName,

      durationYears:
        insuranceRequest.insurance_duration_years,
    });

    /*
     * ============================================
     * 15. SUCCÈS
     * ============================================
     */

    operationCompleted =
      true;

    requestLocked =
      false;

    pendingStoragePath =
      null;

    finalStoragePath =
      null;

    storageMoved =
      false;

    documentId =
      null;

    paymentId =
      null;

    return jsonResponse(
      {
        success: true,

        requestId:
          insuranceRequest.id,

        requestCode:
          insuranceRequest.request_code,

        status:
          "payment_review",
      },
      201,
    );
  } catch (
    error
  ) {
    /*
     * ============================================
     * ROLLBACK
     * ============================================
     */

    if (
      paymentId
    ) {
      const {
        error:
          paymentCleanupError,
      } =
        await serviceClient
          .from(
            "payments",
          )
          .delete()
          .eq(
            "id",
            paymentId,
          );

      if (
        paymentCleanupError
      ) {
        console.error(
          "Nettoyage du paiement impossible :",
          paymentCleanupError.message,
        );
      }
    }

    if (
      documentId
    ) {
      const {
        error:
          documentCleanupError,
      } =
        await serviceClient
          .from(
            "uploaded_documents",
          )
          .delete()
          .eq(
            "id",
            documentId,
          );

      if (
        documentCleanupError
      ) {
        console.error(
          "Nettoyage du document impossible :",
          documentCleanupError.message,
        );
      }
    }

    /*
     * Le fichier a été déplacé vers sa destination
     * définitive : on tente de le remettre dans
     * pending pour permettre une nouvelle tentative.
     */

    if (
      storageMoved &&
      finalStoragePath &&
      pendingStoragePath
    ) {
      const {
        error:
          rollbackMoveError,
      } =
        await serviceClient.storage
          .from(
            BUCKET_NAME,
          )
          .move(
            finalStoragePath,
            pendingStoragePath,
          );

      if (
        rollbackMoveError
      ) {
        console.error(
          "Restauration du dekont vers pending impossible :",
          rollbackMoveError.message,
        );
      } else {
        storageMoved =
          false;
      }
    }

    /*
     * Le dossier revient à waiting_payment
     * uniquement si cette requête avait obtenu
     * le verrou.
     */

    if (
      requestLocked &&
      !operationCompleted
    ) {
      const {
        error:
          rollbackStatusError,
      } =
        await serviceClient
          .from(
            "insurance_requests",
          )
          .update({
            status:
              "waiting_payment",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            id,
          )
          .eq(
            "source",
            "direct",
          )
          .eq(
            "status",
            "payment_review",
          );

      if (
        rollbackStatusError
      ) {
        console.error(
          "Restauration du statut waiting_payment impossible :",
          rollbackStatusError.message,
        );
      }
    }

    console.error(
      "Erreur dépôt paiement client :",
      error,
    );

    return jsonResponse(
      {
        success: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      500,
    );
  }
}