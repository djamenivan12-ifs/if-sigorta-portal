"use client";

import {
  useState,
} from "react";

const MONTHS = [
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

export default function MonthlyReportButton() {
  const now =
    new Date();

  const [
    month,
    setMonth,
  ] = useState(
    now.getMonth() + 1,
  );

  const [
    year,
    setYear,
  ] = useState(
    now.getFullYear(),
  );

  function downloadReport() {
    window.location.href =
      `/api/admin/reports/monthly?year=${year}&month=${month}`;
  }

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.5rem] sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
        Rapports
      </p>

      <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:mt-2 sm:text-xl">
        Rapport mensuel PDF
      </h2>

      <p className="mt-1.5 text-[13px] leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
        Choisissez une période et téléchargez le rapport IF Sigorta.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4">
        <div className="min-w-0">
          <label
            htmlFor="report-month"
            className="mb-1.5 block text-[12px] font-semibold text-slate-700 sm:mb-2 sm:text-sm"
          >
            Mois
          </label>

          <select
            id="report-month"
            value={month}
            onChange={(
              event,
            ) =>
              setMonth(
                Number(
                  event.target
                    .value,
                ),
              )
            }
            className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:h-11 sm:px-4 sm:text-sm"
          >
            {MONTHS.map(
              (
                label,
                index,
              ) => (
                <option
                  key={label}
                  value={
                    index + 1
                  }
                >
                  {label}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="min-w-0">
          <label
            htmlFor="report-year"
            className="mb-1.5 block text-[12px] font-semibold text-slate-700 sm:mb-2 sm:text-sm"
          >
            Année
          </label>

          <input
            id="report-year"
            type="number"
            min={2020}
            max={2100}
            value={year}
            onChange={(
              event,
            ) =>
              setYear(
                Number(
                  event.target
                    .value,
                ),
              )
            }
            className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:h-11 sm:px-4 sm:text-sm"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={
          downloadReport
        }
        className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#0B5D3B] px-4 text-center text-[12px] font-black leading-4 text-white transition hover:bg-[#084A2F] sm:mt-5 sm:min-h-11 sm:px-5 sm:text-sm"
      >
        Télécharger le rapport PDF
      </button>
    </section>
  );
}