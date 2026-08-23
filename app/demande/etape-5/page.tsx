"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import DocumentUploader from "@/components/DocumentUploader";
import { useInsuranceRequest } from "@/context/InsuranceRequestContext";

import BankCard from "./BankCard";
import PaymentSummary from "./PaymentSummary";
import RequestCodeCard from "./RequestCodeCard";

type Language =
  | "fr"
  | "en"
  | "tr";

const translations = {
  fr: {
    backSummary:
      "← Retour au récapitulatif",

    step:
      "Étape 5 sur 5",

    title:
      "Paiement par virement",

    description:
      "Effectuez le virement en indiquant votre code comme référence, puis téléversez obligatoirement votre dekont.",

    missingInformation:
      "Certaines informations sont absentes. Revenez aux étapes précédentes avant d’effectuer le paiement.",

    desiredStartDate:
      "Date souhaitée de début de l’assurance",

    transferProof:
      "Preuve du virement",

    transferProofDescription:
      "Le bouton restera désactivé tant que le dekont n’aura pas été ajouté.",

    receiptLabel:
      "Dekont",

    receiptDescription:
      "Ajoutez une preuve lisible de votre virement bancaire.",

    receiptAdded:
      "✓ Dekont ajouté. Vous pouvez déclarer votre paiement.",

    receiptMissing:
      "Téléversez votre dekont pour activer le bouton.",

    paymentWarning:
      "Le téléversement du dekont ne confirme pas automatiquement le paiement. Un agent IF Sigorta vérifiera le montant, le bénéficiaire et la référence.",

    previous:
      "← Précédent",

    submitting:
      "Enregistrement en cours...",

    confirmPayment:
      "J’ai effectué le paiement",

    missingRequiredInformation:
      "Certaines informations obligatoires sont absentes. Revenez aux étapes précédentes.",

    agePriceUnavailable:
      "L’âge ou le montant de l’assurance n’est pas disponible.",

    receiptRequired:
      "Veuillez téléverser votre dekont avant de confirmer le paiement.",

    paymentRouteError:
      "La route de paiement a renvoyé une erreur",

    paymentSaveError:
      "Le paiement n’a pas pu être enregistré.",

    unexpectedError:
      "Une erreur inattendue est survenue.",
  },

  en: {
    backSummary:
      "← Back to summary",

    step:
      "Step 5 of 5",

    title:
      "Bank transfer payment",

    description:
      "Make the bank transfer using your request code as the reference, then upload your payment receipt.",

    missingInformation:
      "Some information is missing. Go back to the previous steps before making the payment.",

    desiredStartDate:
      "Desired insurance start date",

    transferProof:
      "Proof of transfer",

    transferProofDescription:
      "The button will remain disabled until the payment receipt has been added.",

    receiptLabel:
      "Payment receipt",

    receiptDescription:
      "Upload a clear proof of your bank transfer.",

    receiptAdded:
      "✓ Payment receipt added. You can now declare your payment.",

    receiptMissing:
      "Upload your payment receipt to activate the button.",

    paymentWarning:
      "Uploading the payment receipt does not automatically confirm the payment. An IF Sigorta agent will verify the amount, beneficiary and reference.",

    previous:
      "← Previous",

    submitting:
      "Saving...",

    confirmPayment:
      "I have made the payment",

    missingRequiredInformation:
      "Some required information is missing. Go back to the previous steps.",

    agePriceUnavailable:
      "The calculated age or insurance amount is unavailable.",

    receiptRequired:
      "Please upload your payment receipt before confirming the payment.",

    paymentRouteError:
      "The payment route returned an error",

    paymentSaveError:
      "The payment could not be saved.",

    unexpectedError:
      "An unexpected error occurred.",
  },

  tr: {
    backSummary:
      "← Özete dön",

    step:
      "5 adımın 5.'si",

    title:
      "Banka havalesi ile ödeme",

    description:
      "Başvuru kodunuzu açıklama olarak yazarak havaleyi yapın, ardından dekontunuzu yükleyin.",

    missingInformation:
      "Bazı bilgiler eksik. Ödeme yapmadan önce önceki adımlara geri dönün.",

    desiredStartDate:
      "İstenen sigorta başlangıç tarihi",

    transferProof:
      "Havale dekontu",

    transferProofDescription:
      "Dekont eklenene kadar buton devre dışı kalacaktır.",

    receiptLabel:
      "Dekont",

    receiptDescription:
      "Banka havalenize ait okunaklı bir dekont yükleyin.",

    receiptAdded:
      "✓ Dekont eklendi. Ödemenizi bildirebilirsiniz.",

    receiptMissing:
      "Butonu etkinleştirmek için dekontunuzu yükleyin.",

    paymentWarning:
      "Dekont yüklemek ödemeyi otomatik olarak onaylamaz. IF Sigorta temsilcisi tutarı, alıcıyı ve açıklamayı kontrol edecektir.",

    previous:
      "← Önceki",

    submitting:
      "Kaydediliyor...",

    confirmPayment:
      "Ödemeyi yaptım",

    missingRequiredInformation:
      "Bazı zorunlu bilgiler eksik. Önceki adımlara geri dönün.",

    agePriceUnavailable:
      "Hesaplanan yaş veya sigorta tutarı mevcut değil.",

    receiptRequired:
      "Ödemeyi onaylamadan önce dekontunuzu yükleyin.",

    paymentRouteError:
      "Ödeme adresi hata döndürdü",

    paymentSaveError:
      "Ödeme kaydedilemedi.",

    unexpectedError:
      "Beklenmeyen bir hata oluştu.",
  },
};

export default function Etape5Page() {
  const router =
    useRouter();

  const {
    requestData,
    updateRequestData,
    resetRequestData,
  } =
    useInsuranceRequest();

  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "fr",
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    submitError,
    setSubmitError,
  ] =
    useState("");

  /*
   * ============================
   * LANGUE
   * ============================
   */

  useEffect(() => {
    function readSavedLanguage() {
      const savedLanguage =
        window.localStorage.getItem(
          "if-sigorta-language",
        );

      if (
        savedLanguage === "fr" ||
        savedLanguage === "en" ||
        savedLanguage === "tr"
      ) {
        setLanguage(
          savedLanguage,
        );
      }
    }

    readSavedLanguage();

    function handleLanguageChange(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          language?: Language;
        }>;

      const nextLanguage =
        customEvent.detail?.language;

      if (
        nextLanguage === "fr" ||
        nextLanguage === "en" ||
        nextLanguage === "tr"
      ) {
        setLanguage(
          nextLanguage,
        );

        return;
      }

      readSavedLanguage();
    }

    window.addEventListener(
      "if-sigorta-language-change",
      handleLanguageChange,
    );

    window.addEventListener(
      "storage",
      readSavedLanguage,
    );

    window.addEventListener(
      "focus",
      readSavedLanguage,
    );

    return () => {
      window.removeEventListener(
        "if-sigorta-language-change",
        handleLanguageChange,
      );

      window.removeEventListener(
        "storage",
        readSavedLanguage,
      );

      window.removeEventListener(
        "focus",
        readSavedLanguage,
      );
    };
  }, []);

  const t =
    translations[
      language
    ];

  /*
   * ============================
   * VÉRIFICATION DU DOSSIER
   * ============================
   *
   * Important :
   *
   * Les fichiers passeport / Kimlik
   * ont déjà été envoyés au serveur
   * lors de l'étape 4.
   *
   * Après F5, les objets File ne
   * peuvent pas être restaurés depuis
   * sessionStorage.
   *
   * Ils ne doivent donc PAS être
   * exigés à cette étape.
   */

  const commonInformationIsPresent =
    requestData.lastName.trim() !== "" &&
    requestData.firstName.trim() !== "" &&
    requestData.fatherName.trim() !== "" &&
    requestData.birthDate !== "" &&
    requestData.gender !== "" &&
    requestData.nationality.trim() !== "" &&
    requestData.whatsappCountryCode.trim() !== "" &&
    requestData.whatsappNumber.trim() !== "" &&
    requestData.passportNumber.trim() !== "" &&
    requestData.address.provinceId !== "" &&
    requestData.address.districtId !== "" &&
    requestData.address.neighborhoodId !== "" &&
    requestData.address.street.trim() !== "" &&
    requestData.address.buildingNumber.trim() !== "";

  const kimlikInformationIsPresent =
    !requestData.hasKimlik ||
    (
      requestData.kimlikNumber.trim() !== "" &&
      requestData.kimlikExpirationDate !== ""
    );

  const insuranceStartDateIsPresent =
    requestData.hasKimlik ||
    requestData.insuranceStartDate !== "";

  const requiredInformationIsPresent =
    commonInformationIsPresent &&
    kimlikInformationIsPresent &&
    insuranceStartDateIsPresent;

  /*
   * Le dossier doit déjà avoir été
   * créé par l'étape 4.
   */

  const serverRequestIsPresent =
    requestData.requestId.trim() !== "" &&
    requestData.requestCode.trim() !== "";

  /*
   * Le prix calculé doit toujours
   * être disponible.
   */

  const priceIsAvailable =
    requestData.calculatedAge !== null &&
    requestData.calculatedPrice !== null;

  /*
   * À l'étape 5, le seul fichier
   * réellement nécessaire est le dekont.
   */

  const paymentReceiptIsPresent =
    requestData.paymentReceiptFile !==
    null;

  const canConfirmPayment =
    serverRequestIsPresent &&
    requiredInformationIsPresent &&
    priceIsAvailable &&
    paymentReceiptIsPresent &&
    !isSubmitting;

  const dateLocale =
    language === "en"
      ? "en-US"
      : language === "tr"
        ? "tr-TR"
        : "fr-FR";

  /*
   * ============================
   * ENVOI DU DEKONT
   * ============================
   */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitError("");

    /*
     * Le dossier doit déjà exister
     * côté serveur.
     */

    if (
      !requestData.requestId ||
      !requestData.requestCode
    ) {
      setSubmitError(
        t.missingRequiredInformation,
      );

      return;
    }

    if (
      !requiredInformationIsPresent
    ) {
      setSubmitError(
        t.missingRequiredInformation,
      );

      return;
    }

    if (
      requestData.calculatedAge ===
        null ||
      requestData.calculatedPrice ===
        null
    ) {
      setSubmitError(
        t.agePriceUnavailable,
      );

      return;
    }

    if (
      !requestData.paymentReceiptFile
    ) {
      setSubmitError(
        t.receiptRequired,
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      /*
       * On envoie uniquement les
       * informations nécessaires
       * pour déclarer le paiement.
       */

      const formData =
        new FormData();

      formData.append(
        "requestCode",
        requestData.requestCode,
      );

      formData.append(
        "whatsappCountryCode",
        requestData.whatsappCountryCode,
      );

      formData.append(
        "whatsappNumber",
        requestData.whatsappNumber,
      );

      formData.append(
        "paymentReceiptFile",
        requestData.paymentReceiptFile,
      );

      const response =
        await fetch(
          `/api/requests/${encodeURIComponent(
            requestData.requestId,
          )}/payment`,
          {
            method:
              "POST",

            body:
              formData,
          },
        );

      const contentType =
        response.headers.get(
          "content-type",
        ) ?? "";

      /*
       * Protection contre une réponse
       * HTML ou autre réponse inattendue.
       */

      if (
        !contentType.includes(
          "application/json",
        )
      ) {
        const responseText =
          await response.text();

        console.error(
          "Réponse non JSON reçue :",
          response.status,
          responseText,
        );

        throw new Error(
          `${t.paymentRouteError} (${response.status}).`,
        );
      }

      const result =
        (await response.json()) as {
          success?: boolean;

          requestId?: string;

          requestCode?: string;

          status?: string;

          error?: string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            t.paymentSaveError,
        );
      }

      /*
       * On conserve le code avant
       * de vider le contexte.
       */

      const confirmedCode =
        result.requestCode ||
        requestData.requestCode;

      /*
       * resetRequestData supprime aussi
       * les données sauvegardées dans
       * sessionStorage.
       */

      resetRequestData();

      /*
       * Redirection vers la confirmation.
       */

      router.push(
        `/demande/confirmation?code=${encodeURIComponent(
          confirmedCode,
        )}`,
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : t.unexpectedError,
      );
    } finally {
      setIsSubmitting(
        false,
      );
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
          {
            t.backSummary
          }
        </button>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
          {/*
           * ============================
           * PROGRESSION
           * ============================
           */}

          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold text-blue-700">
              {
                t.step
              }
            </p>

            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-full rounded-full bg-blue-700" />
            </div>
          </div>

          {/*
           * ============================
           * TITRE
           * ============================
           */}

          <h1 className="text-3xl font-bold text-slate-900">
            {
              t.title
            }
          </h1>

          <p className="mt-2 text-slate-600">
            {
              t.description
            }
          </p>

          {/*
           * ============================
           * DONNÉES MANQUANTES
           * ============================
           */}

          {(
            !requiredInformationIsPresent ||
            !serverRequestIsPresent ||
            !priceIsAvailable
          ) && (
            <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {
                t.missingInformation
              }
            </div>
          )}

          {/*
           * ============================
           * DATE DE DÉBUT
           * ============================
           */}

          {!requestData.hasKimlik &&
            requestData.insuranceStartDate && (
              <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                {
                  t.desiredStartDate
                }
                :{" "}

                <span className="font-semibold">
                  {new Intl.DateTimeFormat(
                    dateLocale,
                  ).format(
                    new Date(
                      `${requestData.insuranceStartDate}T00:00:00`,
                    ),
                  )}
                </span>
              </div>
            )}

          {/*
           * ============================
           * FORMULAIRE
           * ============================
           */}

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-8 space-y-6"
          >
            {/*
             * Matricule créé par le serveur.
             */}

            <RequestCodeCard
              requestCode={
                requestData.requestCode
              }
            />

            {/*
             * Prix calculé.
             */}

            <PaymentSummary
              amount={
                requestData.calculatedPrice
              }
            />

            {/*
             * Coordonnées bancaires.
             */}

            <BankCard
              requestCode={
                requestData.requestCode
              }
            />

            {/*
             * ============================
             * DEKONT
             * ============================
             */}

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">
                  {
                    t.transferProof
                  }
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {
                    t.transferProofDescription
                  }
                </p>
              </div>

              <DocumentUploader
                label={
                  t.receiptLabel
                }
                description={
                  t.receiptDescription
                }
                file={
                  requestData.paymentReceiptFile
                }
                language={
                  language
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
                  ? t.receiptAdded
                  : t.receiptMissing}
              </div>
            </section>

            {/*
             * ============================
             * ERREUR
             * ============================
             */}

            {submitError && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {
                  submitError
                }
              </div>
            )}

            {/*
             * ============================
             * AVERTISSEMENT
             * ============================
             */}

            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              {
                t.paymentWarning
              }
            </div>

            {/*
             * ============================
             * NAVIGATION
             * ============================
             */}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                disabled={
                  isSubmitting
                }
                onClick={() =>
                  router.push(
                    "/demande/etape-4",
                  )
                }
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {
                  t.previous
                }
              </button>

              <button
                type="submit"
                disabled={
                  !canConfirmPayment
                }
                className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting
                  ? t.submitting
                  : t.confirmPayment}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}