"use client";

import {
  useEffect,
  useState,
} from "react";

type Language =
  | "fr"
  | "en"
  | "tr";

const countryCodes = [
  {
    country: "Türkiye",
    flag: "🇹🇷",
    code: "+90",
  },
  {
    country: "Cameroun",
    flag: "🇨🇲",
    code: "+237",
  },
  {
    country: "Nigeria",
    flag: "🇳🇬",
    code: "+234",
  },
  {
    country: "Ghana",
    flag: "🇬🇭",
    code: "+233",
  },
  {
    country: "Sénégal",
    flag: "🇸🇳",
    code: "+221",
  },
  {
    country: "Côte d’Ivoire",
    flag: "🇨🇮",
    code: "+225",
  },
  {
    country: "Tchad",
    flag: "🇹🇩",
    code: "+235",
  },
  {
    country: "Gabon",
    flag: "🇬🇦",
    code: "+241",
  },
  {
    country: "Congo",
    flag: "🇨🇬",
    code: "+242",
  },
  {
    country: "RDC",
    flag: "🇨🇩",
    code: "+243",
  },
];

type PhoneInputProps = {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (
    value: string,
  ) => void;
  onPhoneNumberChange: (
    value: string,
  ) => void;
};

const translations = {
  fr: {
    label: "Numéro WhatsApp",
    countryCode:
      "Indicatif téléphonique",
  },

  en: {
    label: "WhatsApp number",
    countryCode:
      "Country calling code",
  },

  tr: {
    label: "WhatsApp numarası",
    countryCode:
      "Telefon ülke kodu",
  },
};

export default function PhoneInput({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
}: PhoneInputProps) {
  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "fr",
    );

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
      setLanguage(
        savedLanguage,
      );
    }

    function handleLanguageChange(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          language:
            Language;
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

  const t =
    translations[
      language
    ];

  function handlePhoneChange(
    value: string,
  ) {
    const cleanedNumber =
      value.replace(
        /\D/g,
        "",
      );

    onPhoneNumberChange(
      cleanedNumber,
    );
  }

  return (
    <div>
      <label
        htmlFor="phoneNumber"
        className="mb-2 block font-medium text-slate-800"
      >
        {t.label}
      </label>

      <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-100">
        <select
          id="countryCode"
          name="countryCode"
          value={
            countryCode
          }
          onChange={(
            event,
          ) =>
            onCountryCodeChange(
              event.target.value,
            )
          }
          aria-label={
            t.countryCode
          }
          className="max-w-[155px] border-r border-slate-300 bg-slate-50 px-3 py-3 text-slate-900 outline-none"
        >
          {countryCodes.map(
            (item) => (
              <option
                key={`${item.country}-${item.code}`}
                value={
                  item.code
                }
              >
                {item.flag}{" "}
                {item.code}
              </option>
            ),
          )}
        </select>

        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          inputMode="numeric"
          value={
            phoneNumber
          }
          onChange={(
            event,
          ) =>
            handlePhoneChange(
              event.target.value,
            )
          }
          required
          className="min-w-0 flex-1 px-4 py-3 text-slate-900 outline-none"
        />
      </div>
    </div>
  );
}