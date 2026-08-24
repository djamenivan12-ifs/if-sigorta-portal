import Link from "next/link";

import {
  AlertTriangle,
  Clock3,
  Siren,
} from "lucide-react";

type DelaySummaryProps = {
  watchCount: number;
  lateCount: number;
  criticalCount: number;
};

export default function DelaySummary({
  watchCount,
  lateCount,
  criticalCount,
}: DelaySummaryProps) {
  const total =
    watchCount +
    lateCount +
    criticalCount;

  return (
    <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
            Priorités
          </p>

          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
            Dossiers sans progression
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Classement automatique selon le temps écoulé depuis la dernière progression.
          </p>
        </div>

        <div
          className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-black ${
            criticalCount > 0
              ? "bg-red-50 text-red-700"
              : lateCount > 0
                ? "bg-orange-50 text-orange-700"
                : watchCount > 0
                  ? "bg-amber-50 text-amber-700"
                  : "bg-[#EEF6EC] text-[#0B5D3B]"
          }`}
        >
          {total}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <DelayCard
          title="À surveiller"
          value={watchCount}
          description="5 à moins de 15 minutes sans progression."
          className="border-amber-200 bg-amber-50"
          valueClassName="text-amber-700"
          icon={<Clock3 className="h-5 w-5" />}
        />

        <DelayCard
          title="En retard"
          value={lateCount}
          description="15 à moins de 30 minutes sans progression."
          className="border-orange-200 bg-orange-50"
          valueClassName="text-orange-700"
          icon={<AlertTriangle className="h-5 w-5" />}
        />

        <DelayCard
          title="Priorité élevée"
          value={criticalCount}
          description="30 minutes ou plus sans progression."
          className="border-red-200 bg-red-50"
          valueClassName="text-red-700"
          icon={<Siren className="h-5 w-5" />}
        />
      </div>

      {total === 0 && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          ✓ Aucun dossier en retard actuellement.
        </div>
      )}
    </section>
  );
}

function DelayCard({
  title,
  value,
  description,
  className,
  valueClassName,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  className: string;
  valueClassName: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href="/admin/notifications"
      className={`block rounded-2xl border p-4 transition hover:-translate-y-0.5 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${valueClassName}`}>
          {icon}
        </div>

        <span className={`text-3xl font-semibold tracking-[-0.04em] ${valueClassName}`}>
          {value.toLocaleString("fr-FR")}
        </span>
      </div>

      <h3 className="mt-4 font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </Link>
  );
}