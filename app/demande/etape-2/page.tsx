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
  calculateInsurancePrice,
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

  const priceResult = useMemo(() => {
    if (!requestData.birthDate) {
      return null;
    }

    return calculateInsurancePrice(
      requestData.birthDate,
      requestData.duration,
    );
  }, [
    requestData.birthDate,
    requestData.duration,
  ]);

  function changeDuration(
    duration: InsuranceDuration,
  ) {
    const result =
      calculateInsurancePrice(
        requestData.birthDate,
        duration,
      );

    updateRequestData({
      duration,
      calculatedAge:
        result?.age ?? null,
      calculatedPrice:
        result?.price ?? null,
    });
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
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

  const kimlikInputClassName =
    kimlikError
      ? "w-full rounded-xl border border-red-500 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100"
      : inputClassName;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/demande/etape-1",
            )
          }
          className="mb-6 font-medium text-blue-700 hover:underline"
        >
          {t.backStep1}
        </button>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold text-blue-700">
              {t.step}
            </p>

            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-2/5 rounded-full bg-blue-700" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            {t.title}
          </h1>

          <p className="mt-2 text-slate-600">
            {t.description}
          </p>

          {!requestData.birthDate && (
            <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t.missingBirthDate}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-8"
          >
            <section className="space-y-5">
              <div>
                <p className="mb-3 font-medium text-slate-800">
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
                    className={`rounded-xl border px-4 py-4 text-left transition ${
                      requestData.hasKimlik
                        ? "border-blue-700 bg-blue-50 ring-2 ring-blue-100"
                        : "border-slate-300 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="block font-semibold text-slate-900">
                      {t.yes}
                    </span>

                    <span className="mt-1 block text-sm text-slate-600">
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
                    className={`rounded-xl border px-4 py-4 text-left transition ${
                      !requestData.hasKimlik
                        ? "border-blue-700 bg-blue-50 ring-2 ring-blue-100"
                        : "border-slate-300 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="block font-semibold text-slate-900">
                      {t.no}
                    </span>

                    <span className="mt-1 block text-sm text-slate-600">
                      {t.noDesc}
                    </span>
                  </button>
                </div>
              </div>

              {requestData.hasKimlik ? (
                <>
                  <div>
                    <label
                      htmlFor="kimlikNumber"
                      className="mb-2 block font-medium text-slate-800"
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
                      value={
                        requestData.kimlikNumber
                      }
                      onChange={(
                        event,
                      ) =>
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
                      className={
                        kimlikInputClassName
                      }
                    />

                    <p
                      id="kimlik-help"
                      className="mt-2 text-sm text-slate-500"
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

                    <p className="mt-2 text-xs text-slate-500">
                      {
                        requestData
                          .kimlikNumber.length
                      }
                      /11 {t.digits}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="kimlikExpirationDate"
                      className="mb-2 block font-medium text-slate-800"
                    >
                      {
                        t.kimlikExpiration
                      }
                    </label>

                    <input
                      id="kimlikExpirationDate"
                      name="kimlikExpirationDate"
                      type="date"
                      defaultValue={
                        requestData.kimlikExpirationDate
                      }
                      required
                      className={
                        inputClassName
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                    {t.noKimlikInfo}
                  </div>

                  <div>
                    <label
                      htmlFor="insuranceStartDate"
                      className="mb-2 block font-medium text-slate-800"
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
                      className={
                        inputClassName
                      }
                    />

                    <p className="mt-2 text-sm text-slate-500">
                      {t.startDateHelp}
                    </p>
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="passportNumber"
                  className="mb-2 block font-medium text-slate-800"
                >
                  {t.passportNumber}
                </label>

                <input
                  id="passportNumber"
                  name="passportNumber"
                  type="text"
                  defaultValue={
                    requestData.passportNumber
                  }
                  required
                  className={
                    inputClassName
                  }
                />

                <p className="mt-2 text-sm text-slate-500">
                  {t.passportHelp}
                </p>
              </div>
            </section>

            <section className="space-y-5 rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {t.durationTitle}
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  {t.durationHelp}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    changeDuration(1)
                  }
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    requestData.duration ===
                    1
                      ? "border-blue-700 bg-white ring-2 ring-blue-100"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  <span className="block font-semibold text-slate-900">
                    {t.oneYear}
                  </span>

                  <span className="mt-1 block text-sm text-slate-500">
                    {t.onePolicy}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    changeDuration(2)
                  }
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    requestData.duration ===
                    2
                      ? "border-blue-700 bg-white ring-2 ring-blue-100"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  <span className="block font-semibold text-slate-900">
                    {t.twoYears}
                  </span>

                  <span className="mt-1 block text-sm text-slate-500">
                    {t.twoPolicies}
                  </span>
                </button>
              </div>

              {priceResult && (
                <div className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-slate-500">
                        {t.retainedAge}
                      </p>

                      <p className="text-2xl font-bold text-slate-900">
                        {priceResult.age}{" "}
                        {priceResult.age >
                        1
                          ? t.years
                          : t.year}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">
                        {t.duration}
                      </p>

                      <p className="text-2xl font-bold text-slate-900">
                        {
                          priceResult.duration
                        }{" "}
                        {priceResult.duration ===
                        2
                          ? t.years
                          : t.year}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-200 pt-5">
                    {priceResult.available &&
                    priceResult.price !==
                      null ? (
                      <>
                        <p className="text-sm text-slate-500">
                          {
                            t.totalPrice
                          }
                        </p>

                        <p className="text-4xl font-bold text-blue-700">
                          {priceResult.price.toLocaleString(
                            language ===
                              "en"
                              ? "en-US"
                              : language ===
                                  "tr"
                                ? "tr-TR"
                                : "fr-FR",
                          )}{" "}
                          TL
                        </p>
                      </>
                    ) : (
                      <p className="font-semibold text-amber-700">
                        {
                          t.unavailablePrice
                        }
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/demande/etape-1",
                  )
                }
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.previous}
              </button>

              <button
                type="submit"
                disabled={
                  !priceResult ||
                  !priceResult.available ||
                  priceResult.price ===
                    null
                }
                className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {t.next}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}