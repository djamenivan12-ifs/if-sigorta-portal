"use client";

import {
  useEffect,
  useState,
} from "react";

type Language =
  | "fr"
  | "en"
  | "tr";

type PaymentSummaryProps = {
  amount: number | null;
};

const translations = {
  fr: {
    title:
      "Montant total à payer",

    unavailable:
      "Montant indisponible",

    description:
      "Le montant du virement doit correspondre exactement au montant indiqué ci-dessus.",
  },

  en: {
    title:
      "Total amount to pay",

    unavailable:
      "Amount unavailable",

    description:
      "The bank transfer amount must exactly match the amount shown above.",
  },

  tr: {
    title:
      "Ödenecek toplam tutar",

    unavailable:
      "Tutar mevcut değil",

    description:
      "Havale tutarı yukarıda belirtilen tutarla tam olarak aynı olmalıdır.",
  },
};

export default function PaymentSummary({
  amount,
}: PaymentSummaryProps) {
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
          language: Language;
        }>;

      const nextLanguage =
        customEvent.detail
          ?.language;

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

  const locale =
    language === "tr"
      ? "tr-TR"
      : language === "en"
        ? "en-US"
        : "fr-FR";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold text-slate-900">
        {t.title}
      </h2>

      <p className="mt-2 text-4xl font-bold text-blue-700">
        {amount !== null
          ? `${amount.toLocaleString(
              locale,
            )} TL`
          : t.unavailable}
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {t.description}
      </p>
    </section>
  );
}