"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import DocumentUploader from "@/components/DocumentUploader";
import { useInsuranceRequest } from "@/context/InsuranceRequestContext";

import BankCard from "./BankCard";
import PaymentSummary from "./PaymentSummary";
import RequestCodeCard from "./RequestCodeCard";

function cleanCodeValue(value: string): string {
  return value
    .trim()
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function getInitial(value: string): string {
  const cleanedValue = cleanCodeValue(value);
  return cleanedValue.charAt(0) || "X";
}

function getPassportCharacters(
  passportNumber: string,
): string {
  const cleanedPassport =
    cleanCodeValue(passportNumber);

  if (!cleanedPassport) {
    return "XX";
  }

  const firstCharacter =
    cleanedPassport.charAt(0);

  const lastCharacter =
    cleanedPassport.charAt(
      cleanedPassport.length - 1,
    );

  return `${firstCharacter}${lastCharacter}`;
}

function generateRequestCode({
  kimlikNumber,
  lastName,
  firstName,
  passportNumber,
}: {
  kimlikNumber: string;
  lastName: string;
  firstName: string;
  passportNumber: string;
}): string {
  const creationDate = new Date();

  const year = String(
    creationDate.getFullYear(),
  ).slice(-2);

  const month = String(
    creationDate.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    creationDate.getDate(),
  ).padStart(2, "0");

  const datePart = `${year}${month}${day}`;

  const numericKimlik =
    kimlikNumber.replace(/\D/g, "");

  const lastTwoKimlikDigits =
    numericKimlik.slice(-2).padStart(2, "0");

  const lastNameInitial =
    getInitial(lastName);

  const firstNameInitial =
    getInitial(firstName);

  const passportCharacters =
    getPassportCharacters(passportNumber);

  return `IFS-${datePart}-${lastTwoKimlikDigits}${lastNameInitial}${firstNameInitial}${passportCharacters}`;
}

export default function Etape5Page() {
  const router = useRouter();

  const {
    requestData,
    updateRequestData,
    resetRequestData,
  } = useInsuranceRequest();

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState("");

  const requiredInformationIsPresent =
    requestData.lastName.trim() !== "" &&
    requestData.firstName.trim() !== "" &&
    requestData.fatherName.trim() !== "" &&
    requestData.birthDate !== "" &&
    requestData.gender !== "" &&
    requestData.nationality.trim() !== "" &&
    requestData.whatsappNumber.trim() !== "" &&
    requestData.kimlikNumber.trim() !== "" &&
    requestData.kimlikExpirationDate !== "" &&
    requestData.passportNumber.trim() !== "" &&
    requestData.address.provinceId !== "" &&
    requestData.address.districtId !== "" &&
    requestData.address.neighborhoodId !== "" &&
    requestData.address.street.trim() !== "" &&
    requestData.address.buildingNumber.trim() !== "";

  const documentsArePresent =
    requestData.passportFile !== null &&
    requestData.kimlikFrontFile !== null &&
    requestData.kimlikBackFile !== null;

  const generatedRequestCode = useMemo(() => {
    if (!requiredInformationIsPresent) {
      return "";
    }

    return generateRequestCode({
      kimlikNumber:
        requestData.kimlikNumber,
      lastName:
        requestData.lastName,
      firstName:
        requestData.firstName,
      passportNumber:
        requestData.passportNumber,
    });
  }, [
    requiredInformationIsPresent,
    requestData.kimlikNumber,
    requestData.lastName,
    requestData.firstName,
    requestData.passportNumber,
  ]);

  useEffect(() => {
    if (
      generatedRequestCode &&
      requestData.requestCode !==
        generatedRequestCode
    ) {
      updateRequestData({
        requestCode: generatedRequestCode,
      });
    }
  }, [
    generatedRequestCode,
    requestData.requestCode,
    updateRequestData,
  ]);

  const paymentReceiptIsPresent =
    requestData.paymentReceiptFile !== null;

  const priceIsAvailable =
    requestData.calculatedAge !== null &&
    requestData.calculatedPrice !== null;

  const canConfirmPayment =
    requiredInformationIsPresent &&
    documentsArePresent &&
    paymentReceiptIsPresent &&
    priceIsAvailable &&
    generatedRequestCode !== "" &&
    !isSubmitting;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitError("");

    if (!requiredInformationIsPresent) {
      setSubmitError(
        "Certaines informations obligatoires sont absentes. Revenez aux étapes précédentes.",
      );
      return;
    }

    if (!documentsArePresent) {
      setSubmitError(
        "Le passeport, le Kimlik recto et le Kimlik verso sont obligatoires.",
      );
      return;
    }

    if (
      requestData.calculatedAge === null ||
      requestData.calculatedPrice === null
    ) {
      setSubmitError(
        "L’âge ou le montant de l’assurance n’est pas disponible.",
      );
      return;
    }

    if (!requestData.paymentReceiptFile) {
      setSubmitError(
        "Veuillez téléverser votre dekont avant de confirmer le paiement.",
      );
      return;
    }

    if (
      !requestData.passportFile ||
      !requestData.kimlikFrontFile ||
      !requestData.kimlikBackFile
    ) {
      setSubmitError(
        "Les trois documents d’identité sont obligatoires.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        requestCode: generatedRequestCode,

        lastName:
          requestData.lastName,
        firstName:
          requestData.firstName,
        fatherName:
          requestData.fatherName,
        birthDate:
          requestData.birthDate,
        gender:
          requestData.gender,
        nationality:
          requestData.nationality,

        whatsappCountryCode:
          requestData.whatsappCountryCode,
        whatsappNumber:
          requestData.whatsappNumber,

        address:
          requestData.address,

        kimlikNumber:
          requestData.kimlikNumber,
        kimlikExpirationDate:
          requestData.kimlikExpirationDate,
        passportNumber:
          requestData.passportNumber,

        duration:
          requestData.duration,
        calculatedAge:
          requestData.calculatedAge,
        calculatedPrice:
          requestData.calculatedPrice,
      };

      const formData = new FormData();

      formData.append(
        "payload",
        JSON.stringify(payload),
      );

      formData.append(
        "passportFile",
        requestData.passportFile,
      );

      formData.append(
        "kimlikFrontFile",
        requestData.kimlikFrontFile,
      );

      formData.append(
        "kimlikBackFile",
        requestData.kimlikBackFile,
      );

      formData.append(
        "paymentReceiptFile",
        requestData.paymentReceiptFile,
      );

      const response = await fetch(
        "/api/requests",
        {
          method: "POST",
          body: formData,
        },
      );

      const result = (await response.json()) as {
        success?: boolean;
        requestId?: string;
        requestCode?: string;
        status?: string;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Le dossier n’a pas pu être enregistré.",
        );
      }

      const confirmedCode =
        result.requestCode ||
        generatedRequestCode;

      resetRequestData();

      router.push(
        `/demande/confirmation?code=${encodeURIComponent(
          confirmedCode,
        )}`,
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/demande/etape-4",
            )
          }
          className="mb-6 font-medium text-blue-700 hover:underline"
        >
          ← Retour au récapitulatif
        </button>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold text-blue-700">
              Étape 5 sur 5
            </p>

            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-full rounded-full bg-blue-700" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Paiement par virement
          </h1>

          <p className="mt-2 text-slate-600">
            Effectuez le virement en indiquant
            votre code comme référence, puis
            téléversez obligatoirement votre
            dekont.
          </p>

          {!requiredInformationIsPresent && (
            <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              Certaines informations sont
              absentes. Revenez aux étapes
              précédentes avant d’effectuer le
              paiement.
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6"
          >
            <RequestCodeCard
              requestCode={
                generatedRequestCode
              }
            />

            <PaymentSummary
              amount={
                requestData.calculatedPrice
              }
            />

            <BankCard
              requestCode={
                generatedRequestCode
              }
            />

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">
                  Preuve du virement
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Le bouton restera désactivé
                  tant que le dekont n’aura pas
                  été ajouté.
                </p>
              </div>

              <DocumentUploader
                label="Dekont"
                description="Ajoutez une preuve lisible de votre virement bancaire."
                file={
                  requestData.paymentReceiptFile
                }
                onChange={(
                  paymentReceiptFile,
                ) =>
                  updateRequestData({
                    paymentReceiptFile,
                  })
                }
              />

              <div
                className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${
                  paymentReceiptIsPresent
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {paymentReceiptIsPresent
                  ? "✓ Dekont ajouté. Vous pouvez déclarer votre paiement."
                  : "Téléversez votre dekont pour activer le bouton."}
              </div>
            </section>

            {submitError && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {submitError}
              </div>
            )}

            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Le téléversement du dekont ne
              confirme pas automatiquement le
              paiement. Un agent IF Sigorta
              vérifiera le montant, le
              bénéficiaire et la référence.
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  router.push(
                    "/demande/etape-4",
                  )
                }
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Précédent
              </button>

              <button
                type="submit"
                disabled={!canConfirmPayment}
                className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting
                  ? "Enregistrement en cours..."
                  : "J’ai effectué le paiement"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}