"use client";

import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

const BUCKET_NAME =
  "insurance-documents";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

type PartnerPaymentFormProps = {
  requestId: string;
  requestCode: string;
  amount: number;
  isResubmission?: boolean;
  rejectionReason?: string | null;
};

type UploadUrlResponse = {
  success: boolean;

  requestId?: string;
  requestCode?: string;
  uploadSessionId?: string;
  path?: string;
  token?: string;

  error?: string;
};

type PaymentResponse = {
  success: boolean;

  requestId?: string;
  requestCode?: string;
  status?: string;

  error?: string;
};

function formatFileSize(
  value: number,
) {
  if (
    value <
    1024 * 1024
  ) {
    return `${Math.max(
      1,
      Math.round(
        value / 1024,
      ),
    )} Ko`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(2)} Mo`;
}

function validateFile(
  file: File,
) {
  if (
    !ALLOWED_FILE_TYPES.includes(
      file.type,
    )
  ) {
    return "Format non accepté. Utilisez PDF, JPG, JPEG ou PNG.";
  }

  if (
    file.size <= 0
  ) {
    return "Le fichier est vide.";
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    return "Le fichier ne doit pas dépasser 10 Mo.";
  }

  return null;
}

export default function PartnerPaymentForm({
  requestId,
  requestCode,
  amount,
  isResubmission = false,
  rejectionReason = null,
}: PartnerPaymentFormProps) {
  const router =
    useRouter();

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    confirmed,
    setConfirmed,
  ] =
    useState(
      false,
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    progressMessage,
    setProgressMessage,
  ] =
    useState<string | null>(
      null,
    );

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0] ??
      null;

    setError(
      null,
    );

    setProgressMessage(
      null,
    );

    if (
      !selectedFile
    ) {
      setFile(
        null,
      );

      return;
    }

    const validationError =
      validateFile(
        selectedFile,
      );

    if (
      validationError
    ) {
      setFile(
        null,
      );

      setError(
        validationError,
      );

      event.target.value =
        "";

      return;
    }

    setFile(
      selectedFile,
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(
      null,
    );

    setProgressMessage(
      null,
    );

    if (
      !file
    ) {
      setError(
        "Ajoutez votre justificatif de paiement.",
      );

      return;
    }

    const validationError =
      validateFile(
        file,
      );

    if (
      validationError
    ) {
      setError(
        validationError,
      );

      return;
    }

    if (
      !confirmed
    ) {
      setError(
        "Confirmez que le paiement correspond bien à ce dossier.",
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      /*
       * ============================================
       * 1. URL SIGNÉE
       * ============================================
       */

      setProgressMessage(
        "Préparation du téléversement...",
      );

      const uploadUrlResponse =
        await fetch(
          `/api/partner/requests/${encodeURIComponent(
            requestId,
          )}/payment-upload-url`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                fileName:
                  file.name,

                mimeType:
                  file.type,

                fileSize:
                  file.size,
              }),
          },
        );

      const uploadUrlData =
        await uploadUrlResponse.json() as
          UploadUrlResponse;

      if (
        !uploadUrlResponse.ok ||
        !uploadUrlData.success ||
        !uploadUrlData.path ||
        !uploadUrlData.token
      ) {
        throw new Error(
          uploadUrlData.error ??
            "Impossible de préparer le téléversement du justificatif.",
        );
      }

      /*
       * ============================================
       * 2. UPLOAD DIRECT SUPABASE
       * ============================================
       */

      setProgressMessage(
        "Envoi du justificatif...",
      );

      const supabase =
        createClient();

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            BUCKET_NAME,
          )
          .uploadToSignedUrl(
            uploadUrlData.path,
            uploadUrlData.token,
            file,
            {
              contentType:
                file.type,

              cacheControl:
                "3600",
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
       * 3. FINALISATION DU PAIEMENT
       * ============================================
       */

      setProgressMessage(
        "Enregistrement du paiement...",
      );

      const paymentResponse =
        await fetch(
          `/api/partner/requests/${encodeURIComponent(
            requestId,
          )}/payment`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                path:
                  uploadUrlData.path,

                originalFileName:
                  file.name,

                mimeType:
                  file.type,

                fileSize:
                  file.size,
              }),
          },
        );

      const paymentData =
        await paymentResponse.json() as
          PaymentResponse;

      if (
        !paymentResponse.ok ||
        !paymentData.success
      ) {
        throw new Error(
          paymentData.error ??
            "Impossible d'enregistrer le paiement.",
        );
      }

      /*
       * ============================================
       * 4. SUCCÈS
       * ============================================
       */

      setProgressMessage(
        isResubmission
          ? "Nouveau justificatif envoyé. Actualisation du dossier..."
          : "Paiement envoyé. Actualisation du dossier...",
      );

      router.refresh();
    } catch (
      submitError
    ) {
      console.error(
        "Erreur paiement partenaire :",
        submitError,
      );

      setProgressMessage(
        null,
      );

      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-[#DCE9DD] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
            Paiement
          </p>

          <h2 className="mt-2 text-xl font-black tracking-[-0.02em] text-[#102B20]">
            {isResubmission
              ? "Envoyer un nouveau justificatif"
              : "Envoyer le justificatif"}
          </h2>
        </div>

        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
          {isResubmission
            ? "À corriger"
            : "En attente"}
        </span>
      </div>

      {isResubmission && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-black text-red-900">
            Motif du refus
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-800">
            {rejectionReason?.trim() ||
              "Le justificatif précédent n'a pas été validé par IF Sigorta."}
          </p>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-[#DCE9DD] bg-[#F3F8F2] p-4">
        <p className="text-sm font-semibold text-[#0B5D3B]">
          Montant à payer
        </p>

        <p className="mt-1 text-3xl font-black tracking-tight text-[#102B20]">
          {amount.toLocaleString(
            "fr-FR",
          )}{" "}
          <span className="text-lg">
            TL
          </span>
        </p>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Matricule :{" "}
          <span className="font-semibold text-slate-700">
            {requestCode}
          </span>
        </p>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-6 space-y-5"
      >
        <div>
          <label
            htmlFor="partner-payment-receipt"
            className="block text-sm font-bold text-[#102B20]"
          >
            Justificatif de paiement
          </label>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            PDF, JPG, JPEG ou PNG.
            Maximum 10 Mo.
          </p>

          <label
            htmlFor="partner-payment-receipt"
            className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition ${
              isSubmitting
                ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
                : "border-[#CFE3CF] bg-[#F8FBF7] hover:border-[#0B5D3B] hover:bg-[#F3F8F2]"
            }`}
          >
            <span className="text-sm font-bold text-[#0B5D3B]">
              {file
                ? "Changer le fichier"
                : "Choisir un fichier"}
            </span>

            <span className="mt-1 text-xs text-slate-500">
              {isResubmission
                ? "Sélectionnez le nouveau dekont"
                : "Cliquez pour sélectionner votre dekont"}
            </span>
          </label>

          <input
            id="partner-payment-receipt"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            disabled={
              isSubmitting
            }
            onChange={
              handleFileChange
            }
            className="sr-only"
          />

          {file && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
              <p className="break-all text-sm font-semibold text-[#102B20]">
                {file.name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatFileSize(
                  file.size,
                )}
              </p>
            </div>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={
              confirmed
            }
            disabled={
              isSubmitting
            }
            onChange={(
              event,
            ) =>
              setConfirmed(
                event.target.checked,
              )
            }
            className="mt-1 h-4 w-4 accent-[#0B5D3B]"
          />

          <span className="text-sm leading-6 text-slate-600">
            Je confirme que ce
            justificatif correspond au
            paiement du dossier{" "}
            <strong className="text-[#102B20]">
              {requestCode}
            </strong>{" "}
            pour un montant de{" "}
            <strong className="text-[#102B20]">
              {amount.toLocaleString(
                "fr-FR",
              )}{" "}
              TL
            </strong>
            .
          </span>
        </label>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
            {error}
          </div>
        )}

        {progressMessage && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold leading-6 text-blue-700">
            {progressMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={
            isSubmitting ||
            !file ||
            !confirmed
          }
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#0B5D3B] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Envoi en cours..."
            : isResubmission
              ? "Envoyer le nouveau justificatif"
              : "J'ai effectué le paiement"}
        </button>
      </form>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        {isResubmission
          ? "Après l'envoi du nouveau justificatif, le paiement repassera en vérification par IF Sigorta."
          : "Après l'envoi, le paiement sera vérifié par IF Sigorta. Vous pourrez suivre son état directement depuis ce dossier."}
      </p>
    </section>
  );
}