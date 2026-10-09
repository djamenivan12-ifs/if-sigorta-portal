"use client";
import { useLanguage } from "@/lib/useLanguage";





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
  const [language] = useLanguage();



  const t = translations[language];

  const locale =
    language === "tr"
      ? "tr-TR"
      : language === "en"
        ? "en-US"
        : "fr-FR";

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-brand-border bg-brand-ice">
      <div className="px-4 py-5 sm:px-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-navy">
          02
        </p>

        <h2 className="mt-1 text-lg font-semibold text-brand-navy">
          {t.title}
        </h2>

        <p className="mt-3 break-words text-3xl font-semibold tracking-[-0.04em] text-brand-navy sm:text-5xl">
          {amount !== null ? amount.toLocaleString(locale) : t.unavailable}

          {amount !== null && (
            <span className="ml-2 text-xl sm:text-2xl">
              TL
            </span>
          )}
        </p>
      </div>

      <div className="border-t border-brand-border bg-white/70 px-4 py-4 sm:px-6">
        <p className="text-sm leading-6 text-slate-600">
          {t.description}
        </p>
      </div>
    </section>
  );
}
