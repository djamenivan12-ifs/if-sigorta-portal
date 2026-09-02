"use client";

import {
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

import type {
  PartnerCreateRequestResponse,
  PartnerDocumentType,
  PartnerRequestFormData,
  PartnerUploadUrlResponse,
  UploadedPartnerDocument,
} from "./partnerRequestTypes";

type Props = {
  data: PartnerRequestFormData;
  onPrevious: () => void;

  onCreated: (result: {
    requestId: string;
    requestCode: string;
  }) => void;
};

async function uploadDocumentDirectly({
  file,
  documentType,
  uploadSessionId,
}: {
  file: File;
  documentType: PartnerDocumentType;
  uploadSessionId?: string;
}) {
  const response =
    await fetch(
      "/api/partner/requests/upload-url",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          documentType,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          uploadSessionId,
        }),
      },
    );

  const result =
    (await response.json()) as
      PartnerUploadUrlResponse;

  if (
    !response.ok ||
    !result.success ||
    !result.uploadSessionId ||
    !result.storagePath ||
    !result.token
  ) {
    throw new Error(
      result.error ||
        "Impossible de préparer le téléversement du document.",
    );
  }

  const supabase =
    createClient();

  const {
    error: uploadError,
  } =
    await supabase.storage
      .from(
        "insurance-documents",
      )
      .uploadToSignedUrl(
        result.storagePath,
        result.token,
        file,
        {
          contentType:
            file.type,

          cacheControl:
            "3600",
        },
      );

  if (uploadError) {
    throw new Error(
      `Téléversement impossible : ${uploadError.message}`,
    );
  }

  const document:
    UploadedPartnerDocument = {
    documentType,

    storagePath:
      result.storagePath,

    originalFileName:
      file.name,

    mimeType:
      file.type,

    fileSize:
      file.size,
  };

  return {
    uploadSessionId:
      result.uploadSessionId,

    document,
  };
}

export default function PartnerReviewStep({
  data,
  onPrevious,
  onCreated,
}: Props) {
  const [
    confirmed,
    setConfirmed,
  ] =
    useState(false);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  async function handleCreate() {
    if (!confirmed) {
      alert(
        "Veuillez confirmer que les informations et documents sont exacts.",
      );

      return;
    }

    if (!data.passportFile) {
      alert(
        "Le passeport du client est absent.",
      );

      return;
    }

    if (
      data.hasKimlik &&
      (
        !data.kimlikFrontFile ||
        !data.kimlikBackFile
      )
    ) {
      alert(
        "Les documents Kimlik sont incomplets.",
      );

      return;
    }

    setSubmitting(true);

    try {
      let uploadSessionId:
        string | undefined;

      const documents:
        UploadedPartnerDocument[] =
          [];

      const passportUpload =
        await uploadDocumentDirectly({
          file:
            data.passportFile,

          documentType:
            "passport",

          uploadSessionId,
        });

      uploadSessionId =
        passportUpload.uploadSessionId;

      documents.push(
        passportUpload.document,
      );

      if (
        data.hasKimlik &&
        data.kimlikFrontFile &&
        data.kimlikBackFile
      ) {
        const frontUpload =
          await uploadDocumentDirectly({
            file:
              data.kimlikFrontFile,

            documentType:
              "kimlik_front",

            uploadSessionId,
          });

        uploadSessionId =
          frontUpload.uploadSessionId;

        documents.push(
          frontUpload.document,
        );

        const backUpload =
          await uploadDocumentDirectly({
            file:
              data.kimlikBackFile,

            documentType:
              "kimlik_back",

            uploadSessionId,
          });

        uploadSessionId =
          backUpload.uploadSessionId;

        documents.push(
          backUpload.document,
        );
      }

      if (!uploadSessionId) {
        throw new Error(
          "La session de téléversement n’a pas pu être créée.",
        );
      }

      const response =
        await fetch(
          "/api/partner/requests",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              payload: {
                preferredLanguage:
                  "fr",

                lastName:
                  data.lastName,

                firstName:
                  data.firstName,

                fatherName:
                  data.fatherName,

                birthDate:
                  data.birthDate,

                gender:
                  data.gender,

                nationality:
                  data.nationality,

                whatsappCountryCode:
                  data.whatsappCountryCode,

                whatsappNumber:
                  data.whatsappNumber,

                address:
                  data.address,

                hasKimlik:
                  data.hasKimlik,

                kimlikNumber:
                  data.hasKimlik
                    ? data.kimlikNumber
                    : "",

                kimlikExpirationDate:
                  data.hasKimlik
                    ? data.kimlikExpirationDate
                    : "",

                insuranceStartDate:
                  data.hasKimlik
                    ? ""
                    : data.insuranceStartDate,

                passportNumber:
                  data.passportNumber,

                duration:
                  data.duration,
              },

              uploadSessionId,
              documents,
            }),
          },
        );

      const result =
        (await response.json()) as
          PartnerCreateRequestResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.requestId ||
        !result.requestCode
      ) {
        throw new Error(
          result.error ||
            "Le dossier n’a pas pu être créé.",
        );
      }

      onCreated({
        requestId:
          result.requestId,

        requestCode:
          result.requestCode,
      });
    } catch (error) {
      console.error(
        "Erreur création dossier partenaire :",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
          Étape 4 sur 4
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-tight text-[#102B20] sm:text-3xl">
          Vérification
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Vérifiez attentivement le dossier avant sa création.
        </p>
      </div>

      <ReviewSection
        number="01"
        title="Client"
      >
        <ReviewItem
          label="Nom"
          value={data.lastName}
        />

        <ReviewItem
          label="Prénom"
          value={data.firstName}
        />

        <ReviewItem
          label="Nom du père"
          value={data.fatherName}
        />

        <ReviewItem
          label="Date de naissance"
          value={data.birthDate}
        />

        <ReviewItem
          label="Sexe"
          value={
            data.gender === "male"
              ? "Homme"
              : "Femme"
          }
        />

        <ReviewItem
          label="Nationalité"
          value={data.nationality}
        />

        <ReviewItem
          label="WhatsApp"
          value={`${data.whatsappCountryCode} ${data.whatsappNumber}`}
        />
      </ReviewSection>

      <ReviewSection
        number="02"
        title="Assurance"
      >
        <ReviewItem
          label="Passeport"
          value={
            data.passportNumber
          }
        />

        <ReviewItem
          label="Kimlik"
          value={
            data.hasKimlik
              ? data.kimlikNumber
              : "Première demande"
          }
        />

        {data.hasKimlik ? (
          <ReviewItem
            label="Expiration Kimlik"
            value={
              data.kimlikExpirationDate
            }
          />
        ) : (
          <ReviewItem
            label="Début assurance"
            value={
              data.insuranceStartDate
            }
          />
        )}

        <ReviewItem
          label="Âge retenu"
          value={
            data.calculatedAge ===
            null
              ? "—"
              : `${data.calculatedAge} ans`
          }
        />

        <ReviewItem
          label="Durée"
          value={`${data.duration} ${
            data.duration === 1
              ? "an"
              : "ans"
          }`}
        />
      </ReviewSection>

      <section className="overflow-hidden rounded-2xl border border-[#DCE9DD] bg-[#F7FAF6]">
        <div className="p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
            Tarif partenaire
          </p>

          <p className="mt-2 text-4xl font-black tracking-tight text-[#0B5D3B]">
            {Number(
              data.calculatedPrice ??
                0,
            ).toLocaleString(
              "fr-FR",
            )}{" "}
            <span className="text-2xl">
              TL
            </span>
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Le tarif sera recalculé et
            enregistré côté serveur au
            moment de la création.
          </p>
        </div>
      </section>

      <ReviewSection
        number="03"
        title="Documents"
      >
        <DocumentItem
          label="Passeport"
          file={data.passportFile}
        />

        {data.hasKimlik && (
          <>
            <DocumentItem
              label="Kimlik recto"
              file={
                data.kimlikFrontFile
              }
            />

            <DocumentItem
              label="Kimlik verso"
              file={
                data.kimlikBackFile
              }
            />
          </>
        )}
      </ReviewSection>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#D9E9D9] bg-[#F3F8F2] p-5">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={submitting}
          onChange={(event) =>
            setConfirmed(
              event.target.checked,
            )
          }
          className="mt-1 h-4 w-4 accent-[#0B5D3B]"
        />

        <span className="text-sm leading-6 text-[#365742]">
          Je confirme que les
          informations et les documents
          fournis correspondent aux
          documents officiels du client.
        </span>
      </label>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-7 sm:flex-row sm:justify-between">
        <button
          type="button"
          disabled={submitting}
          onClick={onPrevious}
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Précédent
        </button>

        <button
          type="button"
          disabled={
            submitting ||
            !confirmed
          }
          onClick={() =>
            void handleCreate()
          }
          className="min-h-12 rounded-xl bg-[#0B5D3B] px-7 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting
            ? "Création du dossier..."
            : "Créer le dossier"}
        </button>
      </div>
    </div>
  );
}

function ReviewSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-[#FCFDFC]">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
          {number}
        </p>

        <h3 className="mt-1 text-lg font-black text-[#102B20]">
          {title}
        </h3>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-semibold text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

function DocumentItem({
  label,
  file,
}: {
  label: string;
  file: File | null;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-semibold text-[#0B5D3B]">
        {file
          ? `✓ ${file.name}`
          : "Absent"}
      </p>
    </div>
  );
}