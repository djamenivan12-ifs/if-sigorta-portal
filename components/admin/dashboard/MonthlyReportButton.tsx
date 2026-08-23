"use client";

import { useState } from "react";

const MONTHS = [
  {
    value: 1,
    label: "Janvier",
  },
  {
    value: 2,
    label: "Février",
  },
  {
    value: 3,
    label: "Mars",
  },
  {
    value: 4,
    label: "Avril",
  },
  {
    value: 5,
    label: "Mai",
  },
  {
    value: 6,
    label: "Juin",
  },
  {
    value: 7,
    label: "Juillet",
  },
  {
    value: 8,
    label: "Août",
  },
  {
    value: 9,
    label: "Septembre",
  },
  {
    value: 10,
    label: "Octobre",
  },
  {
    value: 11,
    label: "Novembre",
  },
  {
    value: 12,
    label: "Décembre",
  },
];

export default function MonthlyReportButton() {
  const now =
    new Date();

  const [month, setMonth] =
    useState(
      now.getMonth() + 1,
    );

  const [year, setYear] =
    useState(
      now.getFullYear(),
    );

  function downloadReport() {
    const url =
      `/api/admin/reports/monthly?year=${year}&month=${month}`;

    window.location.href =
      url;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
          Rapports
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Rapport mensuel PDF
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Choisissez une période et téléchargez le rapport mensuel IF Sigorta.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="report-month"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Mois
          </label>

          <select
            id="report-month"
            value={month}
            onChange={(event) =>
              setMonth(
                Number(
                  event.target.value,
                ),
              )
            }
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
          >
            {MONTHS.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="report-year"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Année
          </label>

          <input
            id="report-year"
            type="number"
            min={2020}
            max={2100}
            value={year}
            onChange={(event) =>
              setYear(
                Number(
                  event.target.value,
                ),
              )
            }
            className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={downloadReport}
        className="mt-5 w-full rounded-xl bg-[#2F2963] px-5 py-3 font-semibold text-white transition hover:bg-[#24204F]"
      >
        Télécharger le rapport PDF
      </button>
    </section>
  );
}