import {
  NextResponse,
} from "next/server";

import { Resend } from "resend";

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
  isResubmission,
}: {
  requestCode: string;
  whatsappCountryCode: string;
  whatsappNumber: string;
  calculatedPrice?: number | null;
  firstName: string;
  lastName: string;
  durationYears?: number | null;
  isResubmission: boolean;
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
      new Resend(apiKey);

    const subject =
      isResubmission
        ? `Nouveau dekont reçu — ${requestCode}`
        : `Nouveau paiement reçu — ${requestCode}`;

    const safeFirstName =
      escapeEmailHtml(
        firstName.trim() || "—",
      );

    const safeLastName =
      escapeEmailHtml(
        lastName.trim() || "—",
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
      typeof calculatedPrice === "number"
        ? `${calculatedPrice.toLocaleString("fr-FR")} TL`
        : "—";

    const durationLabel =
      typeof durationYears === "number"
        ? `${durationYears} ${durationYears === 1 ? "an" : "ans"}`
        : "—";

    const {
      data,
      error,
    } =
      await resend.emails.send({
        from:
          "IF Sigorta <onboarding@resend.dev>",

        to:
          adminEmail,

        subject,

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

              <p style="margin:0 0 20px;line-height:1.7">
                ${
                  isResubmission
                    ? "Le client vient de transmettre un nouveau justificatif de paiement après le refus du précédent."
                    : "Le client vient de transmettre son justificatif de paiement."
                }
              </p>

              <p style="margin:0;line-height:1.7">
                Connectez-vous à l'espace administrateur pour vérifier le paiement.
              </p>
            </div>
          </div>
        `,
      });

    if (
      error
    ) {
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
     * annuler le paiement ou le dekont.
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

  const serviceClient =
    createServiceClient();

  /*
   * Ressources créées par CETTE requête.
   *
   * Elles permettent un nettoyage précis
   * si une erreur intervient.
   */

  let uploadedStoragePath:
    | string
    | null = null;

  let documentId:
    | string
    | null = null;

  let paymentId:
    | string
    | null = null;

  /*
   * Indique si cette requête a obtenu
   * le verrou waiting_payment →
   * payment_review.
   */

  let requestLocked =
    false;

  /*
   * Permet d'éviter de remettre le dossier
   * en waiting_payment après un succès.
   */

  let operationCompleted =
    false;

  try {
    /*
     * ============================================
     * 1. IDENTIFIANT
     * ============================================
     */

    if (!id) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Identifiant du dossier absent.",
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

    /*
     * ============================================
     * 3. FORM DATA
     * ============================================
     */

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
            "Les informations du dossier sont incomplètes.",
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
      !(
        paymentReceiptFile instanceof
        File
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Le justificatif de paiement est obligatoire.",
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

    validateFile(
      paymentReceiptFile,
    );

    /*
     * ============================================
     * 4. RATE LIMIT PAR IDENTITÉ
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
     * 5. RECHERCHE DU DOSSIER
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
     * 6. VÉRIFICATION WHATSAPP
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
      return NextResponse.json(
        {
          success: false,

          error:
            "Les informations ne correspondent pas au dossier.",
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
     * 7. VÉRIFICATION DU STATUT
     * ============================================
     */

    if (
      insuranceRequest.status !==
      "waiting_payment"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            insuranceRequest.status ===
              "payment_review"
              ? "Le justificatif de paiement a déjà été envoyé."
              : "Ce dossier n'est plus en attente de paiement.",
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
     * 8. VÉRIFICATION PAIEMENT EXISTANT
     * ============================================
     *
     * Cela protège aussi contre un état
     * incohérent dans lequel le dossier serait
     * waiting_payment alors qu'un paiement
     * existe déjà.
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
      return NextResponse.json(
        {
          success: false,

          error:
            "Un paiement est déjà associé à ce dossier.",
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
     * 9. VERROU ATOMIQUE
     * ============================================
     *
     * C'est ici que l'on bloque les doubles
     * soumissions concurrentes.
     *
     * Deux requêtes peuvent avoir lu
     * waiting_payment plus haut.
     *
     * Mais une seule pourra modifier une ligne
     * qui EST ENCORE waiting_payment.
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
      /*
       * Une autre requête a probablement
       * pris le verrou juste avant celle-ci.
       */

      return NextResponse.json(
        {
          success: false,

          error:
            "Le justificatif de paiement est déjà en cours d'enregistrement ou a déjà été envoyé.",
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

    requestLocked =
      true;

    /*
     * ============================================
     * 10. UPLOAD STORAGE
     * ============================================
     */

    const safeName =
      sanitizeFileName(
        paymentReceiptFile.name,
      );

    uploadedStoragePath =
      `${id}/payment_receipt/` +
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

    /*
     * ============================================
     * 11. ENREGISTREMENT DU DOCUMENT
     * ============================================
     */

    const now =
      new Date().toISOString();

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
            uploadedStoragePath,

          original_file_name:
            paymentReceiptFile.name,

          mime_type:
            paymentReceiptFile.type,

          file_size:
            paymentReceiptFile.size,

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

    /*
     * On mémorise précisément l'UUID de
     * la ligne créée par CETTE requête.
     */

    documentId =
      savedDocument.id;

    /*
     * ============================================
     * 12. CRÉATION DU PAIEMENT
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

    /*
     * Notification e-mail admin après réception du paiement.
     * Une erreur Resend ne doit jamais annuler le paiement.
     */
    await sendPaymentAdminEmail({
      requestCode,
      whatsappCountryCode,
      whatsappNumber,
      calculatedPrice:
        insuranceRequest.calculated_price,
      firstName,
      lastName,
      durationYears:
        insuranceRequest.insurance_duration_years,
      isResubmission:
        false,
    });

    /*
     * ============================================
     * 14. SUCCÈS
     * ============================================
     *
     * Le dossier est déjà en payment_review
     * depuis le verrou atomique.
     */

    operationCompleted =
      true;

    requestLocked =
      false;

    /*
     * Ces valeurs sont remises à null pour
     * empêcher le catch de toucher aux
     * ressources après un succès.
     */

    uploadedStoragePath =
      null;

    documentId =
      null;

    paymentId =
      null;

    return NextResponse.json(
      {
        success:
          true,

        requestId:
          id,

        requestCode,

        status:
          "payment_review",
      },
      {
        status:
          201,

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
     * ============================================
     * ROLLBACK
     * ============================================
     *
     * Ordre :
     * 1. paiement
     * 2. ligne uploaded_documents
     * 3. fichier Storage
     * 4. statut du dossier
     */

    /*
     * 1. Paiement créé par cette requête.
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

      paymentId =
        null;
    }

    /*
     * 2. Document précis créé par cette requête.
     */

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

      documentId =
        null;
    }

    /*
     * 3. Fichier Storage précis créé
     * par cette requête.
     */

    if (
      uploadedStoragePath
    ) {
      const {
        error:
          storageCleanupError,
      } =
        await serviceClient.storage
          .from(
            BUCKET_NAME,
          )
          .remove([
            uploadedStoragePath,
          ]);

      if (
        storageCleanupError
      ) {
        console.error(
          "Nettoyage du dekont impossible :",
          storageCleanupError.message,
        );
      }

      uploadedStoragePath =
        null;
    }

    /*
     * 4. Libération du verrou.
     *
     * On ne remet en waiting_payment que si
     * CETTE requête avait réellement obtenu
     * le verrou et n'avait pas terminé.
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
      "Erreur premier dépôt dekont :",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof
          Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}