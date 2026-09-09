import Link from "next/link";

import {
  CalendarDays,
  Plus,
} from "lucide-react";

type DashboardHeaderProps = {
  title?: string;
  description?: string;
  userName?: string;
};

function formatCurrentDate() {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(new Date());
}

export default function DashboardHeader({
  title = "Tableau de bord",
  description =
    "Suivez les demandes, les paiements et les polices d’assurance.",
  userName,
}: DashboardHeaderProps) {
  const currentDate =
    formatCurrentDate();

  return (
    <header className="flex min-w-0 flex-col gap-4 sm:gap-5 xl:flex-row xl:items-end xl:justify-between xl:gap-6">
      {/* INFORMATIONS */}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#EEF6EC] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#0B5D3B] sm:px-3 sm:py-1.5 sm:text-[11px] sm:tracking-[0.14em]">
            IF Sigorta
          </span>

          <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-slate-400 sm:gap-2 sm:text-sm">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />

            <span className="min-w-0 capitalize">
              {currentDate}
            </span>
          </span>
        </div>

        <h1 className="mt-4 break-words text-[1.75rem] font-semibold leading-[1.08] tracking-[-0.04em] text-[#102B20] sm:mt-5 sm:text-4xl">
          {userName
            ? `Hey ${userName}`
            : title}
        </h1>

        {userName && (
          <p className="mt-1 text-[13px] font-semibold text-[#0B5D3B] sm:text-sm">
            {title}
          </p>
        )}

        <p className="mt-2 max-w-2xl text-[13px] leading-5 text-slate-500 sm:mt-3 sm:text-base sm:leading-7">
          {description}
        </p>
      </div>

      {/* ACTIONS */}

      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-row sm:gap-3">
        <Link
          href="/admin/dossiers"
          className="inline-flex min-h-10 min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-center text-[12px] font-semibold leading-4 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-11 sm:px-4 sm:text-sm"
        >
          Voir les dossiers
        </Link>

        <Link
          href="/demande/etape-1"
          className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-[#0B5D3B] px-3 text-center text-[12px] font-black leading-4 text-white transition hover:bg-[#084A2F] sm:min-h-11 sm:gap-2 sm:px-4 sm:text-sm"
        >
          <Plus className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />

          <span>
            Nouvelle demande
          </span>
        </Link>
      </div>
    </header>
  );
}