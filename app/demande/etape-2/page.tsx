"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { useInsuranceRequest } from "@/context/InsuranceRequestContext";
import {
  calculateInsuranceAge,
  InsuranceDuration,
} from "@/lib/insurance/calculatePrice";

type Language = "fr" | "en" | "tr";

const translations = {
  fr: {
    backStep1: "← Retour à l’étape 1",
    step: "Étape 2 sur 5",
    title: "Identité et tarif",
    description:
      "Renseignez vos informations d’identité et choisissez la durée de votre assurance.",
    missingBirthDate:
      "La date de naissance est absente. Revenez à l’étape 1 pour la renseigner.",

    hasKimlik: "Avez-vous déjà un Kimlik ?",
    yes: "Oui",
    yesDesc: "Je possède déjà une carte Kimlik.",
    no: "Non",
    noDesc: "Je fais ma première demande de titre de séjour.",

    kimlikNumber: "Numéro de Kimlik",
    kimlikHelp: "Saisissez exactement 11 chiffres.",
    digits: "chiffres",
    kimlikExpiration: "Date d’expiration du Kimlik",

    noKimlikInfo:
      "Aucun numéro de Kimlik ne vous sera demandé. Indiquez la date à laquelle vous souhaitez que votre assurance commence.",
    startDate: "Date souhaitée de début de l’assurance",
    startDateHelp:
      "Cette date ne peut pas être antérieure à aujourd’hui.",

    passportNumber: "Numéro du passeport",
    passportHelp:
      "Ce numéro sera également utilisé pour générer votre code de dossier.",

    durationTitle: "Durée de l’assurance",
    durationHelp:
      "L’âge est calculé selon l’année de naissance, sans tenir compte du jour et du mois.",
    oneYear: "1 an",
    onePolicy: "Une police d’assurance",
    twoYears: "2 ans",
    twoPolicies: "Deux polices PDF distinctes",

    retainedAge: "Âge retenu",
    duration: "Durée",
    year: "an",
    years: "ans",
    totalPrice: "Prix total",
    unavailablePrice:
      "Tarif non disponible automatiquement. Contactez IF Sigorta.",

    previous: "← Précédent",
    next: "Suivant →",

    kimlikLengthError:
      "Le numéro de Kimlik doit contenir exactement 11 chiffres.",
    priceUnavailableAlert:
      "Le tarif n’est pas disponible automatiquement pour cet âge.",
    passportRequired:
      "Le numéro du passeport est obligatoire.",
    kimlikExpirationRequired:
      "La date d’expiration du Kimlik est obligatoire.",
    startDateRequired:
      "La date souhaitée de début de l’assurance est obligatoire.",
    startDatePast:
      "La date de début de l’assurance ne peut pas être dans le passé.",
  },

  en: {
    backStep1: "← Back to step 1",
    step: "Step 2 of 5",
    title: "Identity and price",
    description:
      "Enter your identity information and choose your insurance duration.",
    missingBirthDate:
      "Your date of birth is missing. Go back to step 1 to enter it.",

    hasKimlik: "Do you already have a Kimlik?",
    yes: "Yes",
    yesDesc: "I already have a Kimlik card.",
    no: "No",
    noDesc: "I am applying for a residence permit for the first time.",

    kimlikNumber: "Kimlik number",
    kimlikHelp: "Enter exactly 11 digits.",
    digits: "digits",
    kimlikExpiration: "Kimlik expiration date",

    noKimlikInfo:
      "No Kimlik number is required. Enter the date you want your insurance to start.",
    startDate: "Desired insurance start date",
    startDateHelp:
      "This date cannot be earlier than today.",

    passportNumber: "Passport number",
    passportHelp:
      "This number will also be used to generate your request code.",

    durationTitle: "Insurance duration",
    durationHelp:
      "Age is calculated based on the year of birth, without considering the day and month.",
    oneYear: "1 year",
    onePolicy: "One insurance policy",
    twoYears: "2 years",
    twoPolicies: "Two separate PDF policies",

    retainedAge: "Calculated age",
    duration: "Duration",
    year: "year",
    years: "years",
    totalPrice: "Total price",
    unavailablePrice:
      "Price is not available automatically. Contact IF Sigorta.",

    previous: "← Previous",
    next: "Next →",

    kimlikLengthError:
      "The Kimlik number must contain exactly 11 digits.",
    priceUnavailableAlert:
      "The price is not automatically available for this age.",
    passportRequired:
      "Passport number is required.",
    kimlikExpirationRequired:
      "Kimlik expiration date is required.",
    startDateRequired:
      "The desired insurance start date is required.",
    startDatePast:
      "The insurance start date cannot be in the past.",
  },

  tr: {
    backStep1: "← 1. adıma dön",
    step: "5 adımın 2.'si",
    title: "Kimlik bilgileri ve fiyat",
    description:
      "Kimlik bilgilerinizi girin ve sigorta süresini seçin.",
    missingBirthDate:
      "Doğum tarihiniz eksik. Girmek için 1. adıma dönün.",

    hasKimlik: "Kimliğiniz var mı?",
    yes: "Evet",
    yesDesc: "Kimlik kartım var.",
    no: "Hayır",
    noDesc: "İlk kez ikamet izni başvurusu yapıyorum.",

    kimlikNumber: "Kimlik numarası",
    kimlikHelp: "Tam olarak 11 rakam girin.",
    digits: "rakam",
    kimlikExpiration: "Kimlik son geçerlilik tarihi",

    noKimlikInfo:
      "Kimlik numarası istenmeyecek. Sigortanızın başlamasını istediğiniz tarihi belirtin.",
    startDate: "İstenen sigorta başlangıç tarihi",
    startDateHelp:
      "Bu tarih bugünden önce olamaz.",

    passportNumber: "Pasaport numarası",
    passportHelp:
      "Bu numara başvuru kodunuzu oluşturmak için de kullanılacaktır.",

    durationTitle: "Sigorta süresi",
    durationHelp:
      "Yaş, gün ve ay dikkate alınmadan doğum yılına göre hesaplanır.",
    oneYear: "1 yıl",
    onePolicy: "Bir sigorta poliçesi",
    twoYears: "2 yıl",
    twoPolicies: "İki ayrı PDF poliçesi",

    retainedAge: "Hesaplanan yaş",
    duration: "Süre",
    year: "yıl",
    years: "yıl",
    totalPrice: "Toplam fiyat",
    unavailablePrice:
      "Fiyat otomatik olarak hesaplanamıyor. IF Sigorta ile iletişime geçin.",

    previous: "← Önceki",
    next: "İleri →",

    kimlikLengthError:
      "Kimlik numarası tam olarak 11 rakam olmalıdır.",
    priceUnavailableAlert:
      "Bu yaş için fiyat otomatik olarak mevcut değil.",
    passportRequired:
      "Pasaport numarası zorunludur.",
    kimlikExpirationRequired:
      "Kimlik son geçerlilik tarihi zorunludur.",
    startDateRequired:
      "İstenen sigorta başlangıç tarihi zorunludur.",
    startDatePast:
      "Sigorta başlangıç tarihi geçmişte olamaz.",
  },
};

export default function Etape2Page() {
  const router = useRouter();

  const {
    requestData,
    updateRequestData,
  } = useInsuranceRequest();

  const [language, setLanguage] =
    useState<Language>("fr");

  const [kimlikError, setKimlikError] =
    useState("");

  useEffect(() => {
    const savedLanguage =
      window.localStorage.getItem(
        "if-sigorta-language",
      );

    if (
      savedLanguage === "fr" ||
      savedLanguage === "en" ||
      savedLanguage === "tr"
    ) {
      setLanguage(savedLanguage);
    }

    function handleLanguageChange(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          language: Language;
        }>;

      const nextLanguage =
        customEvent.detail?.language;

      if (
        nextLanguage === "fr" ||
        nextLanguage === "en" ||
        nextLanguage === "tr"
      ) {
        setLanguage(nextLanguage);
      }
    }

    window.addEventListener(
      "if-sigorta-language-change",
      handleLanguageChange,
    );

    return () => {
      window.removeEventListener(
        "if-sigorta-language-change",
        handleLanguageChange,
      );
    };
  }, []);

  const t = translations[language];

  const today = new Date()
    .toISOString()
    .split("T")[0];

  const [priceResult, setPriceResult] =
    useState<{
      age: number;
      duration: InsuranceDuration;
      price: number | null;
      available: boolean;
    } | null>(null);

  const [priceLoading, setPriceLoading] =
    useState(false);

  const calculatedAge = useMemo(() => {
    if (!requestData.birthDate) {
      return null;
    }

    return calculateInsuranceAge(
      requestData.birthDate,
    );
  }, [
    requestData.birthDate,
  ]);

  async function loadPrice(
    duration: InsuranceDuration,
  ) {
    if (
      !requestData.birthDate
    ) {
      setPriceResult(null);
      return;
    }

    setPriceLoading(true);

    try {
      const response =
        await fetch(
          "/api/insurance/price",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              birthDate:
                requestData.birthDate,

              duration,
            }),
          },
        );

      const result =
        (await response.json()) as {
          age?: number;
          duration?: InsuranceDuration;
          price?: number | null;
          available?: boolean;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Impossible de calculer le tarif.",
        );
      }

      const nextResult = {
        age:
          Number(
            result.age,
          ),

        duration,

        price:
          typeof result.price === "number"
            ? result.price
            : null,

        available:
          Boolean(
            result.available,
          ),
      };

      setPriceResult(
        nextResult,
      );

      updateRequestData({
        duration,

        calculatedAge:
          nextResult.age,

        calculatedPrice:
          nextResult.price,
      });
    } catch (
      error
    ) {
      console.error(
        "Erreur calcul tarif :",
        error,
      );

      setPriceResult(
        calculatedAge === null
          ? null
          : {
              age:
                calculatedAge,

              duration,

              price:
                null,

              available:
                false,
            },
      );

      updateRequestData({
        duration,

        calculatedAge:
          calculatedAge,

        calculatedPrice:
          null,
      });
    } finally {
      setPriceLoading(false);
    }
  }

  useEffect(() => {
    if (
      requestData.birthDate
    ) {
      void loadPrice(
        requestData.duration,
      );
    } else {
      setPriceResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    requestData.birthDate,
    requestData.duration,
  ]);

  function changeDuration(
    duration: InsuranceDuration,
  ) {
    updateRequestData({
      duration,
    });

    void loadPrice(
      duration,
    );
  }

  function changeKimlikStatus(
    hasKimlik: boolean,
  ) {
    setKimlikError("");

    if (hasKimlik) {
      updateRequestData({
        hasKimlik: true,
        insuranceStartDate: "",
      });

      return;
    }

    updateRequestData({
      hasKimlik: false,
      kimlikNumber: "",
      kimlikExpirationDate: "",
      kimlikFrontFile: null,
      kimlikBackFile: null,
    });
  }

  function handleKimlikChange(
    value: string,
  ) {
    const cleanedValue = value
      .replace(/\D/g, "")
      .slice(0, 11);

    updateRequestData({
      kimlikNumber:
        cleanedValue,
    });

    if (
      cleanedValue.length > 0 &&
      cleanedValue.length !== 11
    ) {
      setKimlikError(
        t.kimlikLengthError,
      );
    } else {
      setKimlikError("");
    }
  }

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !priceResult ||
      !priceResult.available ||
      priceResult.price === null
    ) {
      alert(
        t.priceUnavailableAlert,
      );

      return;
    }

    const formData =
      new FormData(
        event.currentTarget,
      );

    const passportNumber =
      formData
        .get("passportNumber")
        ?.toString()
        .trim()
        .toUpperCase() ?? "";

    const kimlikExpirationDate =
      formData
        .get(
          "kimlikExpirationDate",
        )
        ?.toString() ?? "";

    const insuranceStartDate =
      formData
        .get(
          "insuranceStartDate",
        )
        ?.toString() ?? "";

    if (!passportNumber) {
      alert(
        t.passportRequired,
      );

      return;
    }

    if (
      requestData.hasKimlik
    ) {
      if (
        !/^\d{11}$/.test(
          requestData.kimlikNumber,
        )
      ) {
        setKimlikError(
          t.kimlikLengthError,
        );

        return;
      }

      if (
        !kimlikExpirationDate
      ) {
        alert(
          t.kimlikExpirationRequired,
        );

        return;
      }
    }

    if (
      !requestData.hasKimlik &&
      !insuranceStartDate
    ) {
      alert(
        t.startDateRequired,
      );

      return;
    }

    if (
      !requestData.hasKimlik &&
      insuranceStartDate < today
    ) {
      alert(
        t.startDatePast,
      );

      return;
    }

    updateRequestData({
      hasKimlik:
        requestData.hasKimlik,

      kimlikNumber:
        requestData.hasKimlik
          ? requestData.kimlikNumber
          : "",

      kimlikExpirationDate:
        requestData.hasKimlik
          ? kimlikExpirationDate
          : "",

      insuranceStartDate:
        requestData.hasKimlik
          ? ""
          : insuranceStartDate,

      passportNumber,

      duration:
        requestData.duration,

      calculatedAge:
        priceResult.age,

      calculatedPrice:
        priceResult.price,
    });

    router.push(
      "/demande/etape-3",
    );
  }

  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10";

  const kimlikInputClassName =
    kimlikError
      ? "w-full rounded-2xl border border-red-400 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
      : inputClassName;

  const fieldLabelClassName =
    "mb-2 block text-sm font-semibold text-slate-700";

  const formEyebrow =
    language === "fr"
      ? "Votre demande"
      : language === "en"
        ? "Your application"
        : "Başvurunuz";

  const sideTitle =
    language === "fr"
      ? "Votre identité, puis votre tarif."
      : language === "en"
        ? "Your identity, then your price."
        : "Kimliğiniz, ardından fiyatınız.";

  const sideText =
    language === "fr"
      ? "Indiquez votre situation de séjour, votre passeport et la durée souhaitée. Le tarif est calculé automatiquement selon votre âge."
      : language === "en"
        ? "Enter your residence status, passport and desired duration. Your price is calculated automatically based on your age."
        : "İkamet durumunuzu, pasaportunuzu ve istediğiniz süreyi belirtin. Fiyat yaşınıza göre otomatik hesaplanır.";

  const exactIdentity =
    language === "fr"
      ? "Vérifiez soigneusement les numéros saisis avant de continuer."
      : language === "en"
        ? "Carefully check the numbers you enter before continuing."
        : "Devam etmeden önce girdiğiniz numaraları dikkatlice kontrol edin.";

  const priceInfo =
    language === "fr"
      ? "Le prix affiché correspond à la durée d’assurance sélectionnée."
      : language === "en"
        ? "The displayed price corresponds to the selected insurance duration."
        : "Gösterilen fiyat seçilen sigorta süresine karşılık gelir.";

  return (
    <main className="min-h-screen bg-[#F6F8F5]">
      {/* TOP BAR */}

      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <a
            href="/"
            className="flex items-center"
            aria-label="IF Sigorta"
          >
            <img
              src="/if-sigorta-logo-light.png"
              alt="IF Sigorta"
              className="h-[72px] w-auto object-contain object-left sm:h-[82px]"
            />
          </a>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/demande/etape-1",
              )
            }
            className="text-sm font-semibold text-slate-500 transition hover:text-[#0B5D3B]"
          >
            {t.backStep1}
          </button>
        </div>
      </div>

      {/* PAGE */}

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-10 xl:gap-14">
          {/* LEFT PANEL */}

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="relative overflow-hidden rounded-[2rem] bg-[#123F2C] px-6 py-8 text-white sm:px-8 lg:min-h-[620px] lg:px-8 lg:py-10">
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
                    <div className="h-full w-2/5 rounded-full bg-[#B8E83D]" />
                  </div>

                  <h2 className="mt-8 max-w-sm text-3xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-4xl">
                    {sideTitle}
                  </h2>

                  <p className="mt-5 max-w-sm text-sm leading-7 text-white/65 sm:text-base">
                    {sideText}
                  </p>
                </div>

                <div className="mt-10 space-y-4 lg:mt-auto">
                  <div className="flex gap-3 border-t border-white/10 pt-5">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B8E83D] text-xs font-black text-[#15311F]">
                      ✓
                    </div>

                    <p className="text-sm leading-6 text-white/70">
                      {exactIdentity}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white">
                      ✓
                    </div>

                    <p className="text-sm leading-6 text-white/70">
                      {priceInfo}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* FORM */}

          <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.24)] sm:p-8 lg:p-10">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B5D3B]">
                {t.step}
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-4xl">
                {t.title}
              </h1>

              <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                {t.description}
              </p>
            </div>

            {!requestData.birthDate && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-6 text-amber-800">
                {t.missingBirthDate}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-9 space-y-10"
            >
              {/* KIMLIK STATUS */}

              <section>
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  {t.hasKimlik}
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      changeKimlikStatus(
                        true,
                      )
                    }
                    className={`rounded-2xl border px-5 py-5 text-left transition ${
                      requestData.hasKimlik
                        ? "border-[#0B5D3B] bg-[#EEF6EC] ring-4 ring-[#0B5D3B]/10"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-base font-semibold text-slate-900">
                      {t.yes}
                    </span>

                    <span className="mt-1.5 block text-sm leading-6 text-slate-500">
                      {t.yesDesc}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changeKimlikStatus(
                        false,
                      )
                    }
                    className={`rounded-2xl border px-5 py-5 text-left transition ${
                      !requestData.hasKimlik
                        ? "border-[#0B5D3B] bg-[#EEF6EC] ring-4 ring-[#0B5D3B]/10"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-base font-semibold text-slate-900">
                      {t.no}
                    </span>

                    <span className="mt-1.5 block text-sm leading-6 text-slate-500">
                      {t.noDesc}
                    </span>
                  </button>
                </div>
              </section>

              {/* IDENTITY FIELDS */}

              <section className="border-t border-slate-100 pt-8">
                <div className="grid gap-5 sm:grid-cols-2">
                  {requestData.hasKimlik ? (
                    <>
                      <div>
                        <label
                          htmlFor="kimlikNumber"
                          className={fieldLabelClassName}
                        >
                          {t.kimlikNumber}
                        </label>

                        <input
                          id="kimlikNumber"
                          name="kimlikNumber"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={11}
                          value={requestData.kimlikNumber}
                          onChange={(event) =>
                            handleKimlikChange(
                              event.target.value,
                            )
                          }
                          aria-invalid={
                            kimlikError
                              ? "true"
                              : "false"
                          }
                          aria-describedby={
                            kimlikError
                              ? "kimlik-error"
                              : "kimlik-help"
                          }
                          required
                          className={kimlikInputClassName}
                        />

                        <p
                          id="kimlik-help"
                          className="mt-2 text-xs leading-5 text-slate-500"
                        >
                          {t.kimlikHelp}
                        </p>

                        {kimlikError && (
                          <p
                            id="kimlik-error"
                            className="mt-2 text-sm font-medium text-red-700"
                          >
                            {kimlikError}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-slate-400">
                          {requestData.kimlikNumber.length}/11{" "}
                          {t.digits}
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="kimlikExpirationDate"
                          className={fieldLabelClassName}
                        >
                          {t.kimlikExpiration}
                        </label>

                        <input
                          id="kimlikExpirationDate"
                          name="kimlikExpirationDate"
                          type="date"
                          defaultValue={
                            requestData.kimlikExpirationDate
                          }
                          required
                          className={inputClassName}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-2">
                      <div className="rounded-2xl border border-[#D9E9D9] bg-[#F3F8F2] px-4 py-3.5 text-sm leading-6 text-[#31513B]">
                        {t.noKimlikInfo}
                      </div>

                      <div className="mt-5 max-w-md">
                        <label
                          htmlFor="insuranceStartDate"
                          className={fieldLabelClassName}
                        >
                          {t.startDate}
                        </label>

                        <input
                          id="insuranceStartDate"
                          name="insuranceStartDate"
                          type="date"
                          min={today}
                          defaultValue={
                            requestData.insuranceStartDate
                          }
                          required
                          className={inputClassName}
                        />

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          {t.startDateHelp}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="passportNumber"
                      className={fieldLabelClassName}
                    >
                      {t.passportNumber}
                    </label>

                    <input
                      id="passportNumber"
                      name="passportNumber"
                      type="text"
                      defaultValue={requestData.passportNumber}
                      required
                      className={`${inputClassName} uppercase`}
                    />

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {t.passportHelp}
                    </p>
                  </div>
                </div>
              </section>

              {/* DURATION + PRICE */}

              <section className="border-t border-slate-100 pt-8">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20] sm:text-2xl">
                    {t.durationTitle}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {t.durationHelp}
                  </p>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      changeDuration(1)
                    }
                    className={`rounded-2xl border px-5 py-5 text-left transition ${
                      requestData.duration ===
                      1
                        ? "border-[#0B5D3B] bg-[#EEF6EC] ring-4 ring-[#0B5D3B]/10"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-base font-semibold text-slate-900">
                      {t.oneYear}
                    </span>

                    <span className="mt-1.5 block text-sm text-slate-500">
                      {t.onePolicy}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changeDuration(2)
                    }
                    className={`rounded-2xl border px-5 py-5 text-left transition ${
                      requestData.duration ===
                      2
                        ? "border-[#0B5D3B] bg-[#EEF6EC] ring-4 ring-[#0B5D3B]/10"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-base font-semibold text-slate-900">
                      {t.twoYears}
                    </span>

                    <span className="mt-1.5 block text-sm text-slate-500">
                      {t.twoPolicies}
                    </span>
                  </button>
                </div>

                {priceLoading && (
                  <div className="mt-5 rounded-2xl border border-[#DCE9DD] bg-[#F7FAF6] px-5 py-4 text-sm font-medium text-[#31513B]">
                    {language === "fr"
                      ? "Calcul du tarif..."
                      : language === "en"
                        ? "Calculating price..."
                        : "Fiyat hesaplanıyor..."}
                  </div>
                )}

                {!priceLoading && priceResult && (
                  <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#DCE9DD] bg-[#F7FAF6]">
                    <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                          {t.retainedAge}
                        </p>

                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                          {priceResult.age}{" "}
                          {priceResult.age >
                          1
                            ? t.years
                            : t.year}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                          {t.duration}
                        </p>

                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                          {priceResult.duration}{" "}
                          {priceResult.duration ===
                          2
                            ? t.years
                            : t.year}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-[#DCE9DD] bg-white px-5 py-5 sm:px-6">
                      {priceResult.available &&
                      priceResult.price !==
                        null ? (
                        <>
                          <p className="text-sm font-medium text-slate-500">
                            {t.totalPrice}
                          </p>

                          <p className="mt-1 text-4xl font-semibold tracking-[-0.04em] text-[#0B5D3B]">
                            {priceResult.price.toLocaleString(
                              language ===
                                "en"
                                ? "en-US"
                                : language ===
                                    "tr"
                                  ? "tr-TR"
                                  : "fr-FR",
                            )}{" "}
                            <span className="text-2xl">
                              TL
                            </span>
                          </p>
                        </>
                      ) : (
                        <p className="font-semibold text-amber-700">
                          {t.unavailablePrice}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* ACTIONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-7 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/demande/etape-1",
                    )
                  }
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {t.previous}
                </button>

                <button
                  type="submit"
                  disabled={
                    priceLoading ||
                    !priceResult ||
                    !priceResult.available ||
                    priceResult.price ===
                      null
                  }
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0B5D3B] px-7 text-sm font-black text-white shadow-lg shadow-[#0B5D3B]/10 transition hover:-translate-y-0.5 hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {t.next}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}