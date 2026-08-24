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
    <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-[#EEF6EC] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
            IF Sigorta
          </span>

          <span className="inline-flex items-center gap-2 text-sm text-slate-400">
            <CalendarDays className="h-4 w-4" />
            <span className="capitalize">
              {currentDate}
            </span>
          </span>
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-4xl">
          {userName
            ? `Hey ${userName}`
            : title}
        </h1>

        {userName && (
          <p className="mt-1 text-sm font-semibold text-[#0B5D3B]">
            {title}
          </p>
        )}

        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/admin/dossiers"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Voir les dossiers
        </Link>

        <Link
          href="/demande/etape-1"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0B5D3B] px-4 text-sm font-black text-white transition hover:bg-[#084A2F]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle demande
        </Link>
      </div>
    </header>
  );
}