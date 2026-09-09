"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import DocumentUploader from "@/components/DocumentUploader";
import { useInsuranceRequest } from "@/context/InsuranceRequestContext";
import {
  createClient,
} from "@/lib/supabase/client";

import BankCard from "./BankCard";
import PaymentSummary from "./PaymentSummary";
import RequestCodeCard from "./RequestCodeCard";

const BUCKET_NAME =
  "insurance-documents";

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

  function changeLanguage(
    nextLanguage: Language,
  ) {
    setLanguage(nextLanguage);

    window.localStorage.setItem(
      "if-sigorta-language",
      nextLanguage,
    );

    window.dispatchEvent(
      new CustomEvent(
        "if-sigorta-language-change",
        {
          detail: {
            language: nextLanguage,
          },
        },
      ),
    );
  }

  /*
   * ============================
   * VÉRIFICATION DU DOSSIER
   * ============================
   *
   * Les fichiers passeport / Kimlik
   * ont déjà été envoyés lors de
   * l'étape 4.
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

  const serverRequestIsPresent =
    requestData.requestId.trim() !== "" &&
    requestData.requestCode.trim() !== "";

  const priceIsAvailable =
    requestData.calculatedAge !== null &&
    requestData.calculatedPrice !== null;

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

    const paymentReceiptFile =
      requestData.paymentReceiptFile;

    if (
      !paymentReceiptFile
    ) {
      setSubmitError(
        t.receiptRequired,
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    let uploadedPendingPath:
      string | null = null;

    try {
      /*
       * ============================================
       * 1. PRÉPARER L'UPLOAD
       * ============================================
       */

      const uploadUrlResponse =
        await fetch(
          `/api/requests/${encodeURIComponent(
            requestData.requestId,
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
                requestCode:
                  requestData.requestCode,

                whatsappCountryCode:
                  requestData.whatsappCountryCode,

                whatsappNumber:
                  requestData.whatsappNumber,

                fileName:
                  paymentReceiptFile.name,

                mimeType:
                  paymentReceiptFile.type,

                fileSize:
                  paymentReceiptFile.size,
              }),
          },
        );

      const uploadUrlContentType =
        uploadUrlResponse.headers.get(
          "content-type",
        ) ?? "";

      if (
        !uploadUrlContentType.includes(
          "application/json",
        )
      ) {
        const responseText =
          await uploadUrlResponse.text();

        console.error(
          "Réponse non JSON reçue lors de la préparation du dekont :",
          uploadUrlResponse.status,
          responseText,
        );

        throw new Error(
          `${t.paymentRouteError} (${uploadUrlResponse.status}).`,
        );
      }

      const uploadUrlResult =
        (await uploadUrlResponse.json()) as {
          success?: boolean;
          requestId?: string;
          requestCode?: string;
          uploadSessionId?: string;
          path?: string;
          token?: string;
          error?: string;
        };

      if (
        !uploadUrlResponse.ok ||
        !uploadUrlResult.success ||
        !uploadUrlResult.path ||
        !uploadUrlResult.token
      ) {
        throw new Error(
          uploadUrlResult.error ||
            t.paymentSaveError,
        );
      }

      uploadedPendingPath =
        uploadUrlResult.path;

      /*
       * ============================================
       * 2. UPLOAD DIRECT SUPABASE
       * ============================================
       *
       * Le fichier va directement du navigateur
       * vers Supabase Storage.
       *
       * Il ne traverse pas Next.js/Vercel.
       */

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
            uploadUrlResult.path,
            uploadUrlResult.token,
            paymentReceiptFile,
            {
              contentType:
                paymentReceiptFile.type,

              cacheControl:
                "3600",
            },
          );

      if (
        uploadError
      ) {
        console.error(
          "Erreur upload direct Supabase du dekont :",
          uploadError,
        );

        throw new Error(
          uploadError.message ||
            t.paymentSaveError,
        );
      }

      /*
       * ============================================
       * 3. FINALISER LE PAIEMENT
       * ============================================
       *
       * Aucun fichier n'est envoyé à cette API.
       * Il ne reste que du JSON léger.
       */

      const response =
        await fetch(
          `/api/requests/${encodeURIComponent(
            requestData.requestId,
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
                requestCode:
                  requestData.requestCode,

                whatsappCountryCode:
                  requestData.whatsappCountryCode,

                whatsappNumber:
                  requestData.whatsappNumber,

                path:
                  uploadUrlResult.path,

                originalFileName:
                  paymentReceiptFile.name,

                mimeType:
                  paymentReceiptFile.type,

                fileSize:
                  paymentReceiptFile.size,
              }),
          },
        );

      const contentType =
        response.headers.get(
          "content-type",
        ) ?? "";

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
       * ============================================
       * 4. SUCCÈS
       * ============================================
       */

      const confirmedCode =
        result.requestCode ||
        requestData.requestCode;

      resetRequestData();

      router.push(
        `/demande/confirmation?code=${encodeURIComponent(
          confirmedCode,
        )}`,
      );
    } catch (
      error
    ) {
      /*
       * Si l'upload a atteint Storage mais que
       * la finalisation échoue, ce chemin permet
       * de retrouver le fichier temporaire.
       */

      if (
        uploadedPendingPath
      ) {
        console.error(
          "Échec de finalisation après préparation du dekont :",
          uploadedPendingPath,
        );
      }

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

  const formEyebrow =
    language === "fr"
      ? "Votre demande"
      : language === "en"
        ? "Your application"
        : "Başvurunuz";

  const sideTitle =
    language === "fr"
      ? "Finalisez votre demande en toute sérénité."
      : language === "en"
        ? "Complete your application with confidence."
        : "Başvurunuzu güvenle tamamlayın.";

  const sideText =
    language === "fr"
      ? "Effectuez votre virement avec le bon montant et le bon code de référence, puis ajoutez votre dekont."
      : language === "en"
        ? "Make your transfer using the correct amount and reference code, then upload your receipt."
        : "Doğru tutar ve referans koduyla havalenizi yapın, ardından dekontunuzu yükleyin.";

  const transferInfo =
    language === "fr"
      ? "Utilisez exactement le code du dossier comme référence du virement."
      : language === "en"
        ? "Use the exact request code as the transfer reference."
        : "Havale açıklamasında başvuru kodunu aynen kullanın.";

  const verificationInfo =
    language === "fr"
      ? "Votre paiement sera vérifié par un agent avant validation."
      : language === "en"
        ? "Your payment will be reviewed by an agent before approval."
        : "Ödemeniz onaylanmadan önce bir temsilci tarafından kontrol edilecektir.";

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5]">
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <a
            href="/"
            className="flex shrink-0 items-center"
            aria-label="IF Sigorta"
          >
            <img
              src="/if-sigorta-logo-light.png"
              alt="IF Sigorta"
              className="h-[58px] w-auto max-w-[170px] object-contain object-left sm:h-[72px] sm:max-w-none lg:h-[82px]"
            />
          </a>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(
                [
                  "fr",
                  "en",
                  "tr",
                ] as Language[]
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    changeLanguage(item)
                  }
                  className={[
                    "rounded-lg px-2 py-1.5 text-[10px] font-black uppercase transition sm:px-3 sm:text-[11px]",
                    language === item
                      ? "bg-white text-[#0B5D3B] shadow-sm"
                      : "text-slate-400 hover:text-slate-700",
                  ].join(" ")}
                >
                  {item}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/demande/etape-4",
                )
              }
              className="hidden text-sm font-semibold text-slate-500 transition hover:text-[#0B5D3B] sm:block"
            >
              {t.backSummary}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-14">
        <div className="grid min-w-0 gap-5 sm:gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-10 xl:gap-14">
          <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
            <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] bg-[#123F2C] px-5 py-6 text-white sm:rounded-[2rem] sm:px-8 sm:py-8 lg:min-h-[650px] lg:px-8 lg:py-10">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#B8E83D]/10" />
              <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-white/5" />

              <div className="relative z-10 flex h-full flex-col">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B8E83D]">
                    {formEyebrow}
                  </p>

                  <p className="mt-4 text-sm font-semibold text-white/60">
                    {t.step}
                  </p>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full w-full rounded-full bg-[#B8E83D]" />
                  </div>

                  <h2 className="mt-6 max-w-sm text-[1.75rem] font-semibold leading-[1.08] tracking-[-0.04em] sm:mt-8 sm:text-4xl">
                    {sideTitle}
                  </h2>

                  <p className="mt-5 max-w-sm text-sm leading-7 text-white/65 sm:text-base">
                    {sideText}
                  </p>
                </div>

                <div className="mt-7 space-y-4 sm:mt-10 lg:mt-auto">
                  <div className="flex gap-3 border-t border-white/10 pt-5">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B8E83D] text-xs font-black text-[#15311F]">
                      ✓
                    </div>

                    <p className="text-sm leading-6 text-white/70">
                      {transferInfo}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white">
                      ✓
                    </div>

                    <p className="text-sm leading-6 text-white/70">
                      {verificationInfo}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="min-w-0 rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.24)] sm:rounded-[2rem] sm:p-8 lg:p-10">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B5D3B]">
                {t.step}
              </p>

              <h1 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-[-0.04em] text-[#102B20] sm:text-4xl">
                {t.title}
              </h1>

              <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                {t.description}
              </p>
            </div>

            {(
              !requiredInformationIsPresent ||
              !serverRequestIsPresent ||
              !priceIsAvailable
            ) && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-6 text-red-700">
                {t.missingInformation}
              </div>
            )}

            {!requestData.hasKimlik &&
              requestData.insuranceStartDate && (
                <div className="mt-6 rounded-2xl border border-[#D9E9D9] bg-[#F3F8F2] px-4 py-3.5 text-sm leading-6 text-[#31513B]">
                  {t.desiredStartDate}:{" "}
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

            <form
              onSubmit={
                handleSubmit
              }
              className="mt-7 space-y-6 sm:mt-9"
            >
              <RequestCodeCard
                requestCode={
                  requestData.requestCode
                }
              />

              <PaymentSummary
                amount={
                  requestData.calculatedPrice
                }
              />

              <BankCard
                requestCode={
                  requestData.requestCode
                }
              />

              <section className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC] p-4 sm:p-6">
                <div className="mb-5">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                    04
                  </p>

                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    {t.transferProof}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
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
                  className={`mt-5 rounded-2xl border px-4 py-3.5 text-sm font-semibold leading-6 ${
                    paymentReceiptIsPresent
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {paymentReceiptIsPresent
                    ? t.receiptAdded
                    : t.receiptMissing}
                </div>
              </section>

              {submitError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-6 text-red-700">
                  {submitError}
                </div>
              )}

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-6 text-amber-800">
                {t.paymentWarning}
              </div>

              <div className="flex min-w-0 flex-col-reverse gap-3 border-t border-slate-100 pt-7 sm:flex-row sm:items-center sm:justify-between">
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
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.previous}
                </button>

                <button
                  type="submit"
                  disabled={
                    !canConfirmPayment
                  }
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0B5D3B] px-7 text-sm font-black text-white shadow-lg shadow-[#0B5D3B]/10 transition hover:-translate-y-0.5 hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {isSubmitting
                    ? t.submitting
                    : t.confirmPayment}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}