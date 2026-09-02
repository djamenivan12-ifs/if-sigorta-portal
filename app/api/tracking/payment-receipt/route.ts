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
  isResubmission,
}: {
  requestCode: string;
  whatsappCountryCode: string;
  whatsappNumber: string;
  calculatedPrice?: number | null;
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
        ? `Nouveau dekont à vérifier — ${requestCode}`
        : `Nouveau paiement à vérifier — ${requestCode}`;

    const title =
      isResubmission
        ? "Nouveau dekont à vérifier"
        : "Nouveau paiement à vérifier";

    const message =
      isResubmission
        ? "Le client a transmis un nouveau justificatif après le refus de son paiement."
        : "Le client a déclaré son paiement et transmis son justificatif de virement.";

    const priceRow =
      typeof calculatedPrice === "number"
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
          "IF Sigorta <onboarding@resend.dev>",

        to:
          adminEmail,

        subject,

        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:32px;color:#102B20;background:#F6F8F5">
            <div style="background:#ffffff;border:1px solid #E2EAE0;border-radius:18px;padding:32px">
              <div style="font-size:24px;font-weight:700;color:#0B5D3B;margin-bottom:8px">
                IF Sigorta
              </div>

              <div style="font-size:18px;font-weight:700;margin-bottom:24px">
                ${title}
              </div>

              <p style="margin:0 0 24px;line-height:1.6">
                ${message}
              </p>

              <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
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
                pour contrôler le dekont.
              </div>
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
     * ============================================
     * 3. RECHERCHE DU DOSSIER
     * ============================================
     *
     * Cette route appartient au parcours public.
     *
     * Un dossier partenaire ne doit jamais pouvoir
     * être retrouvé ou modifié depuis cette API.
     *
     * Le filtre source = direct est donc appliqué
     * directement dans la requête Supabase.
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
        },
      );
    }

    /*
     * ============================================
     * 4. VÉRIFICATION WHATSAPP
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
     * ============================================
     * 5. RECHERCHE DU PAIEMENT
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
     * ============================================
     * 6. UPLOAD DU NOUVEAU DEKONT
     * ============================================
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
     * ============================================
     * 7. ANCIEN DOCUMENT
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
     * ============================================
     * 8. MISE À JOUR DU JUSTIFICATIF
     * ============================================
     *
     * uploaded_documents possède une contrainte
     * unique :
     *
     * request_id + document_type
     *
     * On remplace donc la ligne existante.
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
     * ============================================
     * 9. REMISE DU PAIEMENT EN VÉRIFICATION
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

    /*
     * ============================================
     * 10. RETOUR DU DOSSIER EN PAYMENT_REVIEW
     * ============================================
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
     * ============================================
     * 11. HISTORIQUE
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
     * 12. NOTIFICATION E-MAIL ADMIN
     * ============================================
     *
     * Une erreur Resend ne doit jamais
     * annuler le renvoi du dekont.
     */
    await sendPaymentAdminEmail({
      requestCode:
        insuranceRequest.request_code,

      whatsappCountryCode,

      whatsappNumber,

      calculatedPrice:
        insuranceRequest.calculated_price,

      isResubmission:
        true,
    });

    /*
     * On conserve l'ancien fichier pour l'historique.
     *
     * Si plus tard tu veux ne garder qu'un seul
     * dekont, on pourra supprimer
     * existingDocument.storage_path.
     */
    void existingDocument;

    /*
     * La procédure est terminée avec succès.
     *
     * On remet cette variable à null afin que le
     * bloc catch ne supprime pas le fichier.
     */
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
     * ============================================
     * NETTOYAGE EN CAS D'ÉCHEC
     * ============================================
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