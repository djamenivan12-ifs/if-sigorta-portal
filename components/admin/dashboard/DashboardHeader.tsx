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
    <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            IF Sigorta
          </span>

          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <CalendarDays className="h-4 w-4" />

            <span className="capitalize">
              {currentDate}
            </span>
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {userName
            ? `Bonjour ${userName}`
            : title}
        </h1>

        {userName && (
          <p className="mt-1 text-lg font-semibold text-slate-800">
            {title}
          </p>
        )}

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/admin/dossiers"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          Voir les dossiers
        </Link>

        <Link
          href="/demande/etape-1"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />

          Nouvelle demande
        </Link>
      </div>
    </header>
  );
}