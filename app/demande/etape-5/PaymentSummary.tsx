"use client";

import { useEffect, useState } from "react";

type Language = "fr" | "en" | "tr";

type PaymentSummaryProps = {
  amount: number | null;
};

const translations = {
  fr: {
    title: "Montant total à payer",
    unavailable: "Montant indisponible",
    description:
      "Le montant du virement doit correspondre exactement au montant indiqué ci-dessus.",
  },
  en: {
    title: "Total amount to pay",
    unavailable: "Amount unavailable",
    description:
      "The bank transfer amount must exactly match the amount shown above.",
  },
  tr: {
    title: "Ödenecek toplam tutar",
    unavailable: "Tutar mevcut değil",
    description:
      "Havale tutarı yukarıda belirtilen tutarla tam olarak aynı olmalıdır.",
  },
};

export default function PaymentSummary({ amount }: PaymentSummaryProps) {
  const [language, setLanguage] = useState<Language>("fr");

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("if-sigorta-language");

    if (savedLanguage === "fr" || savedLanguage === "en" || savedLanguage === "tr") {
      setLanguage(savedLanguage);
    }

    function handleLanguageChange(event: Event) {
      const customEvent = event as CustomEvent<{ language: Language }>;
      const nextLanguage = customEvent.detail?.language;

      if (nextLanguage === "fr" || nextLanguage === "en" || nextLanguage === "tr") {
        setLanguage(nextLanguage);
      }
    }

    window.addEventListener("if-sigorta-language-change", handleLanguageChange);

    return () => {
      window.removeEventListener("if-sigorta-language-change", handleLanguageChange);
    };
  }, []);

  const t = translations[language];

  const locale =
    language === "tr"
      ? "tr-TR"
      : language === "en"
        ? "en-US"
        : "fr-FR";

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[#DCE9DD] bg-[#F3F8F2]">
      <div className="px-5 py-5 sm:px-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">02</p>
        <h2 className="mt-1 text-lg font-semibold text-[#102B20]">{t.title}</h2>

        <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#0B5D3B] sm:text-5xl">
          {amount !== null ? amount.toLocaleString(locale) : t.unavailable}
          {amount !== null && <span className="ml-2 text-2xl">TL</span>}
        </p>
      </div>

      <div className="border-t border-[#DCE9DD] bg-white/70 px-5 py-4 sm:px-6">
        <p className="text-sm leading-6 text-slate-600">{t.description}</p>
      </div>
    </section>
  );
}