"use client";
import { useEffect, useState } from "react";
import { isCongoBrazzaville } from "@/lib/insurance/nationality";
type Grid = {
  effectiveFrom: string;
  rows: {
    minAge: number;
    maxAge: number;
    oneYearPrice: number;
    twoYearPrice: number;
  }[];
};
export default function CongoClientGrid({
  nationality,
  language,
}: {
  nationality: string;
  language: "fr" | "en" | "tr";
}) {
  const [grid, setGrid] = useState<Grid | null>(null);
  const applicable = isCongoBrazzaville(nationality);
  useEffect(() => {
    if (!applicable) return;
    const controller = new AbortController();
    fetch("/api/insurance/price", { signal: controller.signal })
      .then(async (r) => {
        if (r.ok) setGrid(await r.json());
      })
      .catch(() => {});
    return () => controller.abort();
  }, [applicable]);
  if (!applicable || !grid?.rows.length) return null;
  const labels =
    language === "fr"
      ? [
          "Tarifs IF Sigorta · Skyline · Congo-Brazzaville",
          "Âge",
          "1 an",
          "2 ans",
          "Tarifs en livres turques (₺), à partir du",
          "Au-delà de 55 ans, contactez-nous pour un tarif.",
        ]
      : language === "en"
        ? [
            "IF Sigorta prices · Skyline · Congo-Brazzaville",
            "Age",
            "1 year",
            "2 years",
            "Prices in Turkish lira (₺), effective",
            "Over age 55, contact us for a quote.",
          ]
        : [
            "IF Sigorta fiyatları · Skyline · Kongo-Brazzaville",
            "Yaş",
            "1 yıl",
            "2 yıl",
            "Türk lirası (₺), geçerlilik tarihi",
            "55 yaş üzeri için fiyat teklifi almak üzere bize ulaşın.",
          ];
  const money = (n: number) =>
    new Intl.NumberFormat(
      language === "fr" ? "fr-FR" : language === "tr" ? "tr-TR" : "en-GB",
      { style: "currency", currency: "TRY" },
    ).format(n);
  return (
    <section className="my-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <h3 className="text-sm font-bold text-emerald-900">{labels[0]}</h3>
      <p className="mt-1 text-xs text-slate-600">
        {labels[4]} {grid.effectiveFrom.split("-").reverse().join("/")}
      </p>
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr>
            {labels.slice(1, 4).map((label) => (
              <th key={label} className="py-2">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((r) => (
            <tr key={r.minAge} className="border-t border-emerald-100">
              <td className="py-2">
                {r.minAge}–{r.maxAge}
              </td>
              <td>{money(r.oneYearPrice)}</td>
              <td>{money(r.twoYearPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-600">{labels[5]}</p>
    </section>
  );
}
