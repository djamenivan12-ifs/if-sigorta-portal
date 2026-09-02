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

type PartnerPaymentPayload = {
  path?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
};

type PreviousPayment = {
  id: string;
  status: string;
  submitted_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
};

type PreviousDocument = {
  id: string;
  storage_path: string;
  original_file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  uploaded_at: string | null;
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

async function sendPartnerPaymentAdminEmail({
  partnerName,
  partnerCode,
  requestCode,
  firstName,
  lastName,
  whatsappCountryCode,
  whatsappNumber,
  calculatedPrice,
  durationYears,
  isResubmission,
}: {
  partnerName: string;
  partnerCode: string;
  requestCode: string;
  firstName: string;
  lastName: string;
  whatsappCountryCode: string;
  whatsappNumber: string;
  calculatedPrice: number | null;
  durationYears: number | null;
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
      "Notification e-mail paiement partenaire non envoyée : configuration Resend absente.",
    );

    return;
  }

  try {
    const resend =
      new Resend(
        apiKey,
      );

    const safePartnerName =
      escapeEmailHtml(
        partnerName.trim() ||
          "—",
      );

    const safePartnerCode =
      escapeEmailHtml(
        partnerCode.trim() ||
          "—",
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

    const title =
      isResubmission
        ? "Nouveau justificatif après refus"
        : "Nouveau paiement partenaire";

    const message =
      isResubmission
        ? "Le partenaire vient de transmettre un nouveau justificatif après le refus du précédent."
        : "Le partenaire vient de transmettre le justificatif de paiement de ce dossier.";

    const {
      error,
    } =
      await resend.emails.send({
        from:
          "IF Sigorta <onboarding@resend.dev>",

        to:
          adminEmail,

        subject:
          isResubmission
            ? `Nouveau justificatif partenaire — ${requestCode}`
            : `Paiement partenaire reçu — ${requestCode}`,

        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:32px;color:#102B20;background:#F6F8F5">
            <div style="background:#ffffff;border:1px solid #E2EAE0;border-radius:18px;padding:32px">

              <div style="font-size:24px;font-weight:700;color:#0B5D3B;margin-bottom:24px">
                IF Sigorta
              </div>

              <div style="font-size:20px;font-weight:700;margin-bottom:24px">
                ${title}
              </div>

              <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:15px">

                <tr>
                  <td style="padding:8px 0;font-weight:700">Source :</td>
                  <td style="padding:8px 0">Partenaire</td>
                </tr>

                <tr>
                  <td style="padding:8px 0;font-weight:700">Partenaire :</td>
                  <td style="padding:8px 0">${safePartnerName}</td>
                </tr>

                <tr>
                  <td style="padding:8px 0;font-weight:700">Code partenaire :</td>
                  <td style="padding:8px 0">${safePartnerCode}</td>
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
                  <td style="padding:8px 0;font-weight:700">WhatsApp client :</td>
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
                ${message}
                Connectez-vous à l'espace administrateur pour vérifier le paiement.
              </p>

            </div>
          </div>
        `,
      });

    if (error) {
      console.error(
        "Erreur notification e-mail paiement partenaire :",
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
      "Envoi notification e-mail paiement partenaire impossible :",
      emailError,
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  /*
   * ============================================
   * 1. AUTHENTIFICATION
   * ============================================
   */

  const auth =
    await requireApiPartner();

  if (!auth.success) {
    return auth.response;
  }

  const {
    partner,
    user,
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

  const serviceClient =
    createServiceClient();

  /*
   * Ressources modifiées/créées par cette requête.
   * Elles servent au rollback.
   */

  let pendingStoragePath:
    | string
    | null = null;

  let finalStoragePath:
    | string
    | null = null;

  let storageMoved =
    false;

  let createdDocumentId:
    | string
    | null = null;

  let createdPaymentId:
    | string
    | null = null;

  let previousPayment:
    PreviousPayment
    | null = null;

  let previousDocument:
    PreviousDocument
    | null = null;

  let existingPaymentUpdated =
    false;

  let existingDocumentUpdated =
    false;

  let requestLocked =
    false;

  let previousRequestStatus:
    | "waiting_payment"
    | "payment_rejected"
    | null = null;

  let operationCompleted =
    false;

  try {
    /*
     * ============================================
     * 2. BODY
     * ============================================
     */

    let body:
      PartnerPaymentPayload;

    try {
      body =
        await request.json() as
          PartnerPaymentPayload;
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

    pendingStoragePath =
      body.path?.trim() ??
      "";

    const originalFileName =
      body.originalFileName?.trim() ??
      "";

    const mimeType =
      body.mimeType?.trim() ??
      "";

    const fileSize =
      Number(
        body.fileSize,
      );

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
     * 3. VÉRIFICATION DU CHEMIN TEMPORAIRE
     * ============================================
     */

    const expectedPendingPrefix =
      `pending/partner/${partner.id}/payment/${id}/`;

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
     * 4. RECHERCHE DU DOSSIER
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
          "source",
          "partner",
        )
        .eq(
          "partner_id",
          partner.id,
        )
        .maybeSingle();

    if (requestError) {
      throw new Error(
        requestError.message,
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
     * 5. STATUT
     * ============================================
     */

    const isFirstPayment =
      insuranceRequest.status ===
      "waiting_payment";

    const isResubmission =
      insuranceRequest.status ===
      "payment_rejected";

    if (
      !isFirstPayment &&
      !isResubmission
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            insuranceRequest.status ===
            "payment_review"
              ? "Le justificatif de paiement est déjà en cours de vérification."
              : "Ce dossier ne peut pas recevoir de nouveau justificatif.",
        },
        409,
      );
    }

    previousRequestStatus =
      isResubmission
        ? "payment_rejected"
        : "waiting_payment";

    /*
     * ============================================
     * 6. PAIEMENT EXISTANT
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
          id,
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

    if (
      isResubmission &&
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
      isResubmission &&
      existingPayment?.status !==
        "rejected"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Le paiement associé n'est pas dans un état permettant un nouvel envoi.",
        },
        409,
      );
    }

    if (
      isResubmission &&
      existingPayment
    ) {
      previousPayment = {
        id:
          existingPayment.id,
        status:
          existingPayment.status,
        submitted_at:
          existingPayment.submitted_at,
        verified_at:
          existingPayment.verified_at,
        verified_by:
          existingPayment.verified_by,
        rejection_reason:
          existingPayment.rejection_reason,
      };
    }

    /*
     * ============================================
     * 7. ANCIEN JUSTIFICATIF
     * ============================================
     */

    if (isResubmission) {
      const {
        data:
          oldDocument,
        error:
          oldDocumentError,
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
            id,
          )
          .eq(
            "document_type",
            "payment_receipt",
          )
          .maybeSingle();

      if (oldDocumentError) {
        throw new Error(
          oldDocumentError.message,
        );
      }

      if (!oldDocument) {
        return jsonResponse(
          {
            success: false,
            error:
              "L'ancien justificatif de paiement est introuvable.",
          },
          409,
        );
      }

      previousDocument = {
        id:
          oldDocument.id,
        storage_path:
          oldDocument.storage_path,
        original_file_name:
          oldDocument.original_file_name,
        mime_type:
          oldDocument.mime_type,
        file_size:
          oldDocument.file_size,
        uploaded_at:
          oldDocument.uploaded_at,
      };
    }

    /*
     * ============================================
     * 8. VERROU ATOMIQUE
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
          "source",
          "partner",
        )
        .eq(
          "partner_id",
          partner.id,
        )
        .eq(
          "status",
          previousRequestStatus,
        )
        .select(
          "id",
        )
        .maybeSingle();

    if (lockError) {
      throw new Error(
        lockError.message,
      );
    }

    if (!lockedRequest) {
      return jsonResponse(
        {
          success: false,
          error:
            "Le statut du dossier a changé entre-temps. Actualisez la page.",
        },
        409,
      );
    }

    requestLocked =
      true;

    /*
     * ============================================
     * 9. DÉPLACEMENT DU NOUVEAU DEKONT
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

    if (moveError) {
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
     * 10. DOCUMENT
     * ============================================
     */

    if (isFirstPayment) {
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

      createdDocumentId =
        savedDocument.id;
    } else {
      if (!previousDocument) {
        throw new Error(
          "Ancien justificatif introuvable.",
        );
      }

      const {
        data:
          updatedDocument,
        error:
          documentUpdateError,
      } =
        await serviceClient
          .from(
            "uploaded_documents",
          )
          .update({
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
          .eq(
            "id",
            previousDocument.id,
          )
          .eq(
            "request_id",
            id,
          )
          .eq(
            "document_type",
            "payment_receipt",
          )
          .eq(
            "storage_path",
            previousDocument.storage_path,
          )
          .select(
            "id",
          )
          .maybeSingle();

      if (
        documentUpdateError
      ) {
        throw new Error(
          documentUpdateError.message,
        );
      }

      if (!updatedDocument) {
        throw new Error(
          "Le justificatif a changé entre-temps. Actualisez la page.",
        );
      }

      existingDocumentUpdated =
        true;
    }

    /*
     * ============================================
     * 11. PAIEMENT
     * ============================================
     */

    if (isFirstPayment) {
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

      createdPaymentId =
        payment.id;
    } else {
      if (!previousPayment) {
        throw new Error(
          "Paiement refusé introuvable.",
        );
      }

      const {
        data:
          updatedPayment,
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
            previousPayment.id,
          )
          .eq(
            "request_id",
            id,
          )
          .eq(
            "status",
            "rejected",
          )
          .select(
            "id",
          )
          .maybeSingle();

      if (
        paymentUpdateError
      ) {
        throw new Error(
          paymentUpdateError.message,
        );
      }

      if (!updatedPayment) {
        throw new Error(
          "Le paiement a changé entre-temps. Actualisez la page.",
        );
      }

      existingPaymentUpdated =
        true;
    }

    /*
     * ============================================
     * 12. CLIENT
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

    const whatsappCountryCode =
      client
        ?.whatsapp_country_code
        ?.trim() ??
      "";

    const whatsappNumber =
      client
        ?.whatsapp_number
        ?.replace(
          /\D/g,
          "",
        ) ??
      "";

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
          user.id,

        action:
          isResubmission
            ? "payment_resubmitted"
            : "payment_uploaded",

        description:
          isResubmission
            ? `Un nouveau justificatif de paiement (dekont) a été envoyé après refus par le partenaire ${partner.companyName} (${partner.code}).`
            : `Le justificatif de paiement (dekont) a été envoyé par le partenaire ${partner.companyName} (${partner.code}).`,
      });
    } catch (logError) {
      /*
       * L'historique ne doit pas rendre incohérente
       * une opération métier déjà terminée.
       */
      console.error(
        "Impossible d'enregistrer l'activité du paiement partenaire :",
        logError,
      );
    }

    /*
     * ============================================
     * 14. E-MAIL ADMIN
     * ============================================
     */

    await sendPartnerPaymentAdminEmail({
      partnerName:
        partner.companyName,

      partnerCode:
        partner.code,

      requestCode:
        insuranceRequest.request_code,

      firstName,

      lastName,

      whatsappCountryCode,

      whatsappNumber,

      calculatedPrice:
        insuranceRequest.calculated_price,

      durationYears:
        insuranceRequest.insurance_duration_years,

      isResubmission,
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

    /*
     * En réenvoi seulement, le nouveau fichier
     * est maintenant la référence officielle.
     * L'ancien peut être supprimé du Storage.
     *
     * Une erreur de nettoyage ne doit pas annuler
     * un paiement déjà correctement enregistré.
     */

    if (
      isResubmission &&
      previousDocument?.storage_path &&
      previousDocument.storage_path !==
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
            previousDocument.storage_path,
          ]);

      if (
        oldFileDeleteError
      ) {
        console.error(
          "Suppression de l'ancien dekont partenaire impossible :",
          oldFileDeleteError.message,
        );
      }
    }

    /*
     * Neutralisation des variables de rollback.
     */

    pendingStoragePath =
      null;

    finalStoragePath =
      null;

    storageMoved =
      false;

    createdDocumentId =
      null;

    createdPaymentId =
      null;

    previousPayment =
      null;

    previousDocument =
      null;

    existingPaymentUpdated =
      false;

    existingDocumentUpdated =
      false;

    return jsonResponse(
      {
        success: true,

        requestId:
          insuranceRequest.id,

        requestCode:
          insuranceRequest.request_code,

        paymentMode:
          isResubmission
            ? "resubmission"
            : "initial",

        status:
          "payment_review",
      },
      isResubmission
        ? 200
        : 201,
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
      existingPaymentUpdated &&
      previousPayment
    ) {
      const {
        error:
          rollbackPaymentError,
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
            previousPayment.id,
          )
          .eq(
            "request_id",
            id,
          )
          .eq(
            "status",
            "submitted",
          );

      if (
        rollbackPaymentError
      ) {
        console.error(
          "Restauration du paiement refusé impossible :",
          rollbackPaymentError.message,
        );
      }
    }

    if (createdPaymentId) {
      const {
        error:
          cleanupPaymentError,
      } =
        await serviceClient
          .from(
            "payments",
          )
          .delete()
          .eq(
            "id",
            createdPaymentId,
          );

      if (
        cleanupPaymentError
      ) {
        console.error(
          "Nettoyage paiement partenaire impossible :",
          cleanupPaymentError.message,
        );
      }
    }

    if (
      existingDocumentUpdated &&
      previousDocument
    ) {
      const {
        error:
          rollbackDocumentError,
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
          )
          .eq(
            "request_id",
            id,
          )
          .eq(
            "document_type",
            "payment_receipt",
          );

      if (
        rollbackDocumentError
      ) {
        console.error(
          "Restauration de l'ancien dekont impossible :",
          rollbackDocumentError.message,
        );
      }
    }

    if (createdDocumentId) {
      const {
        error:
          cleanupDocumentError,
      } =
        await serviceClient
          .from(
            "uploaded_documents",
          )
          .delete()
          .eq(
            "id",
            createdDocumentId,
          );

      if (
        cleanupDocumentError
      ) {
        console.error(
          "Nettoyage document paiement partenaire impossible :",
          cleanupDocumentError.message,
        );
      }
    }

    /*
     * Si le nouveau fichier a été déplacé,
     * on le remet en pending.
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
          "Restauration du nouveau dekont vers pending impossible :",
          rollbackMoveError.message,
        );
      } else {
        storageMoved =
          false;
      }
    }

    /*
     * Le dossier revient exactement au statut
     * qu'il avait avant la tentative.
     */

    if (
      requestLocked &&
      !operationCompleted &&
      previousRequestStatus
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
              previousRequestStatus,

            updated_at:
              new Date().toISOString(),
          })
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
          .eq(
            "status",
            "payment_review",
          );

      if (
        rollbackStatusError
      ) {
        console.error(
          `Restauration ${previousRequestStatus} partenaire impossible :`,
          rollbackStatusError.message,
        );
      }
    }

    console.error(
      "Erreur dépôt paiement partenaire :",
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
