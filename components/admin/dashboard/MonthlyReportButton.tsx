"use client";
import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { day } from "@/lib/accounting/model";
const months = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
export default function MonthlyReportButton({
  loadedAt = new Date().toISOString(),
  scopeLabel = "Rapport mensuel",
}: {
  loadedAt?: string;
  scopeLabel?: string;
}) {
  const today = day(loadedAt),
    currentYear = Number(today.slice(0, 4)),
    [month, setMonth] = useState(Number(today.slice(5, 7))),
    [year, setYear] = useState(currentYear),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function download() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/reports/monthly?year=${year}&month=${month}`,
        { cache: "no-store", signal: AbortSignal.timeout(30000) },
      );
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/pdf")
      ) {
        const result = await response.json().catch(() => ({}));
        throw Error(result.error || "Le rapport n’a pas pu être généré.");
      }
      const blob = await response.blob(),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = `IF-Sigorta-Rapport-${year}-${String(month).padStart(2, "0")}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(
        error instanceof Error && error.name === "TimeoutError"
          ? "Le rapport prend trop de temps à charger. Réessayez."
          : error instanceof Error
            ? error.message
            : "Impossible de télécharger le rapport.",
      );
    } finally {
      setBusy(false);
    }
  }
  const control =
    "min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50";
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-950">
            Rapport mensuel
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {scopeLabel} · téléchargement PDF
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-slate-500">
            Mois
            <select
              className={`${control} mt-1 block`}
              value={month}
              disabled={busy}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {months.map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-500">
            Année
            <select
              className={`${control} mt-1 block`}
              value={year}
              disabled={busy}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {Array.from(
                { length: Math.max(1, currentYear - 2019) },
                (_, i) => currentYear - i,
              ).map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="flex min-h-10 items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Download size={16} />
            )}{" "}
            {busy ? "Préparation…" : "Télécharger le rapport"}
          </button>
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
    </div>
  );
}
