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

type PaymentReceiptPayload = {
  requestCode?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;

  path?: string;
  originalFileName?: string;
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
}: {
  requestCode: string;
  whatsappCountryCode: string;
  whatsappNumber: string;
  calculatedPrice?: number | null;
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

    const priceRow =
      typeof calculatedPrice ===
      "number"
        ? `
          <tr>
            <td style="padding:10px 0;font-weight:700">
              Montant attendu
            </td>

            <td style="padding:10px 0;text-align:right">
              ${calculatedPrice.toLocaleString("fr-FR")} TL
            </td>
          </tr>
        `
        : "";

    const {
      error,
    } =
      await resend.emails.send({
        from:
         process.env.RESEND_FROM_EMAIL ??
  "IF Sigorta <onboarding@resend.dev>",

        to:
          adminEmail,

        subject:
          `Nouveau dekont à vérifier — ${requestCode}`,

        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:32px;color:#102B20;background:#F6F8F5">
            <div style="background:#ffffff;border:1px solid #E2EAE0;border-radius:18px;padding:32px">

              <div style="font-size:24px;font-weight:700;color:#0B5D3B;margin-bottom:8px">
                IF Sigorta
              </div>

              <div style="font-size:18px;font-weight:700;margin-bottom:24px">
                Nouveau dekont à vérifier
              </div>

              <p style="margin:0 0 24px;line-height:1.6">
                Le client a transmis un nouveau justificatif après le refus de son paiement.
              </p>

              <table style="width:100%;border-collapse:collapse;margin-bottom:24px">

                <tr>
                  <td style="padding:10px 0;font-weight:700">
                    Source
                  </td>

                  <td style="padding:10px 0;text-align:right">
                    Client direct
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 0;font-weight:700">
                    Matricule
                  </td>

                  <td style="padding:10px 0;text-align:right">
                    ${escapeEmailHtml(requestCode)}
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 0;font-weight:700">
                    WhatsApp
                  </td>

                  <td style="padding:10px 0;text-align:right">
                    ${escapeEmailHtml(whatsappCountryCode)}
                    ${escapeEmailHtml(whatsappNumber)}
                  </td>
                </tr>

                ${priceRow}

              </table>

              <div style="padding:16px;border-radius:12px;background:#EEF6EC;line-height:1.6">
                Le paiement est maintenant en attente de vérification.
                Connectez-vous à l’espace administrateur IF Sigorta
                pour contrôler le nouveau dekont.
              </div>

            </div>
          </div>
        `,
      });

    if (
      error
    ) {
      console.error(
        "Erreur notification e-mail nouveau dekont :",
        error,
      );
    }
  } catch (
    emailError
  ) {
    /*
     * Une erreur Resend ne doit jamais
     * annuler le renvoi du dekont.
     */

    console.error(
      "Envoi de la notification e-mail nouveau dekont impossible :",
      emailError,
    );
  }
}

export async function POST(
  request: Request,
) {
  const serviceClient =
    createServiceClient();

  /*
   * Ces variables permettent d'effectuer
   * un rollback propre si une étape échoue.
   */

  let pendingStoragePath:
    | string
    | null = null;

  let finalStoragePath:
    | string
    | null = null;

  let previousDocument:
    | {
        id: string;
        storage_path:
          | string
          | null;
        original_file_name:
          | string
          | null;
        mime_type:
          | string
          | null;
        file_size:
          | number
          | null;
        uploaded_at:
          | string
          | null;
      }
    | null = null;

  let paymentId:
    | string
    | null = null;

  let previousPayment:
    | {
        status:
          | string
          | null;
        submitted_at:
          | string
          | null;
        verified_at:
          | string
          | null;
        verified_by:
          | string
          | null;
        rejection_reason:
          | string
          | null;
      }
    | null = null;

  let requestId:
    | string
    | null = null;

  let requestLocked =
    false;

  let documentUpdated =
    false;

  let paymentUpdated =
    false;

  let fileMoved =
    false;

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

    /*
     * ============================================
     * 2. LECTURE DU JSON
     * ============================================
     */

    let body:
      PaymentReceiptPayload;

    try {
      body =
        (await request.json()) as
          PaymentReceiptPayload;
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

    const suppliedPath =
      body.path
        ?.trim() ??
      "";

    const originalFileName =
      body.originalFileName
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
     * 3. VALIDATION
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
      !suppliedPath ||
      !originalFileName
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
     * ============================================
     * 5. RECHERCHE DU DOSSIER DIRECT
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

    requestId =
      insuranceRequest.id;

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
     * 7. VÉRIFICATION DU STATUT
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
     * 8. VÉRIFICATION DU CHEMIN TEMPORAIRE
     * ============================================
     *
     * Le client ne peut finaliser qu'un fichier
     * préparé pour CE dossier et pour CE workflow.
     */

    const expectedPrefix =
      `pending/direct/payment-reupload/${insuranceRequest.id}/`;

    if (
      !suppliedPath.startsWith(
        expectedPrefix,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Le chemin du justificatif est invalide.",
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

    pendingStoragePath =
      suppliedPath;

    /*
     * ============================================
     * 9. VÉRIFICATION DU FICHIER DANS SUPABASE
     * ============================================
     *
     * On ne fait pas confiance uniquement aux
     * métadonnées envoyées par le navigateur.
     */

    const pendingDirectory =
      suppliedPath
        .split("/")
        .slice(
          0,
          -1,
        )
        .join("/");

    const pendingFileName =
      suppliedPath
        .split("/")
        .at(
          -1,
        ) ??
      "";

    const {
      data:
        pendingFiles,
      error:
        pendingFilesError,
    } =
      await serviceClient.storage
        .from(
          BUCKET_NAME,
        )
        .list(
          pendingDirectory,
          {
            limit: 100,

            search:
              pendingFileName,
          },
        );

    if (
      pendingFilesError
    ) {
      throw new Error(
        pendingFilesError.message,
      );
    }

    const pendingFile =
      pendingFiles?.find(
        (file) =>
          file.name ===
          pendingFileName,
      );

    if (
      !pendingFile
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Le fichier téléversé est introuvable.",
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
      typeof pendingFile.metadata
        ?.size ===
        "number" &&
      pendingFile.metadata.size >
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
     * 10. PAIEMENT EXISTANT
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
          `
            id,
            status,
            submitted_at,
            verified_at,
            verified_by,
            rejection_reason
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

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    paymentId =
      payment.id;

    previousPayment = {
      status:
        payment.status,

      submitted_at:
        payment.submitted_at,

      verified_at:
        payment.verified_at,

      verified_by:
        payment.verified_by,

      rejection_reason:
        payment.rejection_reason,
    };

    /*
     * ============================================
     * 11. ANCIEN DOCUMENT
     * ============================================
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
            storage_path,
            original_file_name,
            mime_type,
            file_size,
            uploaded_at
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
        .maybeSingle();

    if (
      existingDocumentError
    ) {
      throw new Error(
        existingDocumentError.message,
      );
    }

    previousDocument =
      existingDocument ??
      null;

    /*
     * ============================================
     * 12. VERROUILLAGE ATOMIQUE DU DOSSIER
     * ============================================
     *
     * Cela empêche deux renvois simultanés de
     * finaliser le même paiement.
     */

    const now =
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
            now,
        })
        .eq(
          "id",
          insuranceRequest.id,
        )
        .eq(
          "source",
          "direct",
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
      lockError
    ) {
      throw new Error(
        lockError.message,
      );
    }

    if (
      !lockedRequest
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Le statut du dossier a changé entre-temps.",
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
     * 13. DÉPLACEMENT DU FICHIER
     * ============================================
     */

    const safeName =
      sanitizeFileName(
        originalFileName,
      );

    finalStoragePath =
      `${insuranceRequest.id}/payment_receipt/` +
      `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

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
        `Déplacement du dekont impossible : ${moveError.message}`,
      );
    }

    fileMoved =
      true;

    /*
     * ============================================
     * 14. MISE À JOUR DU DOCUMENT
     * ============================================
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
              finalStoragePath,

            original_file_name:
              originalFileName,

            mime_type:
              mimeType,

            file_size:
              fileSize,

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

    documentUpdated =
      true;

    /*
     * ============================================
     * 15. REMISE DU PAIEMENT EN VÉRIFICATION
     * ============================================
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

    paymentUpdated =
      true;

    /*
     * ============================================
     * 16. HISTORIQUE
     * ============================================
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
     * ============================================
     * 17. EMAIL ADMIN
     * ============================================
     */

    await sendPaymentAdminEmail({
      requestCode:
        insuranceRequest.request_code,

      whatsappCountryCode,

      whatsappNumber,

      calculatedPrice:
        insuranceRequest.calculated_price,
    });

    /*
     * ============================================
     * 18. SUPPRESSION DE L'ANCIEN FICHIER
     * ============================================
     *
     * La ligne uploaded_documents pointe maintenant
     * vers le nouveau fichier.
     *
     * On supprime donc l'ancien objet Storage pour
     * éviter l'accumulation de données sensibles.
     *
     * Une erreur de nettoyage ne doit pas annuler
     * le renvoi qui vient de réussir.
     */

    if (
      previousDocument
        ?.storage_path &&
      previousDocument
        .storage_path !==
        finalStoragePath
    ) {
      const {
        error:
          oldFileDeleteError,
      } =
        await serviceClient.storage
          .from(
            BUCKET_NAME,
          )
          .remove([
            previousDocument
              .storage_path,
          ]);

      if (
        oldFileDeleteError
      ) {
        console.error(
          "Suppression de l'ancien dekont impossible :",
          oldFileDeleteError.message,
        );
      }
    }

    /*
     * Tout est finalisé.
     *
     * On désactive les marqueurs utilisés
     * par le rollback.
     */

    pendingStoragePath =
      null;

    finalStoragePath =
      null;

    fileMoved =
      false;

    documentUpdated =
      false;

    paymentUpdated =
      false;

    requestLocked =
      false;

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
     * ============================================
     * ROLLBACK
     * ============================================
     *
     * On essaie de remettre le dossier dans
     * l'état qui précédait cette tentative.
     */

    console.error(
      "Erreur renvoi dekont :",
      error,
    );

    /*
     * 1. Restaurer le paiement.
     */

    if (
      paymentUpdated &&
      paymentId &&
      previousPayment
    ) {
      const {
        error:
          paymentRollbackError,
      } =
        await serviceClient
          .from(
            "payments",
          )
          .update({
            status:
              previousPayment.status,

            submitted_at:
              previousPayment.submitted_at,

            verified_at:
              previousPayment.verified_at,

            verified_by:
              previousPayment.verified_by,

            rejection_reason:
              previousPayment.rejection_reason,
          })
          .eq(
            "id",
            paymentId,
          );

      if (
        paymentRollbackError
      ) {
        console.error(
          "Rollback du paiement impossible :",
          paymentRollbackError.message,
        );
      }
    }

    /*
     * 2. Restaurer uploaded_documents.
     */

    if (
      documentUpdated &&
      requestId
    ) {
      if (
        previousDocument
      ) {
        const {
          error:
            documentRollbackError,
        } =
          await serviceClient
            .from(
              "uploaded_documents",
            )
            .update({
              storage_path:
                previousDocument.storage_path,

              original_file_name:
                previousDocument.original_file_name,

              mime_type:
                previousDocument.mime_type,

              file_size:
                previousDocument.file_size,

              uploaded_at:
                previousDocument.uploaded_at,
            })
            .eq(
              "id",
              previousDocument.id,
            );

        if (
          documentRollbackError
        ) {
          console.error(
            "Rollback du document impossible :",
            documentRollbackError.message,
          );
        }
      } else {
        const {
          error:
            documentDeleteError,
        } =
          await serviceClient
            .from(
              "uploaded_documents",
            )
            .delete()
            .eq(
              "request_id",
              requestId,
            )
            .eq(
              "document_type",
              "payment_receipt",
            );

        if (
          documentDeleteError
        ) {
          console.error(
            "Suppression du document créé pendant le rollback impossible :",
            documentDeleteError.message,
          );
        }
      }
    }

    /*
     * 3. Remettre le fichier final dans pending.
     *
     * Cela permet au client de retenter la
     * finalisation sans devoir réuploader le fichier.
     */

    if (
      fileMoved &&
      finalStoragePath &&
      pendingStoragePath
    ) {
      const {
        error:
          moveRollbackError,
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
        moveRollbackError
      ) {
        console.error(
          "Rollback du fichier impossible :",
          moveRollbackError.message,
        );
      }
    }

    /*
     * 4. Restaurer le statut du dossier.
     */

    if (
      requestLocked &&
      requestId
    ) {
      const {
        error:
          requestRollbackError,
      } =
        await serviceClient
          .from(
            "insurance_requests",
          )
          .update({
            status:
              "payment_rejected",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            requestId,
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
        requestRollbackError
      ) {
        console.error(
          "Rollback du statut du dossier impossible :",
          requestRollbackError.message,
        );
      }
    }

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