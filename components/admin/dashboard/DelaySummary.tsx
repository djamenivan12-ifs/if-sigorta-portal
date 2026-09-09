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
    <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.5rem] sm:p-6">
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
            Priorités
          </p>

          <h2 className="mt-1.5 break-words text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:mt-2 sm:text-xl">
            Dossiers sans progression
          </h2>

          <p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
            Classement automatique selon le temps écoulé depuis la dernière progression.
          </p>
        </div>

        <div
          className={[
            "flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl px-2.5 text-[12px] font-black sm:h-10 sm:min-w-10 sm:px-3 sm:text-sm",
            criticalCount > 0
              ? "bg-red-50 text-red-700"
              : lateCount > 0
                ? "bg-orange-50 text-orange-700"
                : watchCount > 0
                  ? "bg-amber-50 text-amber-700"
                  : "bg-[#EEF6EC] text-[#0B5D3B]",
          ].join(" ")}
        >
          {total > 99
            ? "99+"
            : total}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-3">
        <DelayCard
          title="À surveiller"
          value={watchCount}
          description="5 à moins de 15 minutes sans progression."
          className="border-amber-200 bg-amber-50"
          valueClassName="text-amber-700"
          icon={
            <Clock3 className="h-4 w-4 sm:h-5 sm:w-5" />
          }
        />

        <DelayCard
          title="En retard"
          value={lateCount}
          description="15 à moins de 30 minutes sans progression."
          className="border-orange-200 bg-orange-50"
          valueClassName="text-orange-700"
          icon={
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
          }
        />

        <DelayCard
          title="Priorité élevée"
          value={criticalCount}
          description="30 minutes ou plus sans progression."
          className="border-red-200 bg-red-50"
          valueClassName="text-red-700"
          icon={
            <Siren className="h-4 w-4 sm:h-5 sm:w-5" />
          }
        />
      </div>

      {total === 0 && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12px] font-medium leading-5 text-emerald-700 sm:mt-5 sm:px-4 sm:py-3 sm:text-sm">
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
      className={`block min-w-0 rounded-xl border p-3.5 transition hover:-translate-y-0.5 sm:rounded-2xl sm:p-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9 ${valueClassName}`}
        >
          {icon}
        </div>

        <span
          className={`break-words text-2xl font-semibold leading-none tracking-[-0.04em] sm:text-3xl ${valueClassName}`}
        >
          {value.toLocaleString(
            "fr-FR",
          )}
        </span>
      </div>

      <h3 className="mt-3 text-[13px] font-semibold leading-5 text-slate-900 sm:mt-4 sm:text-base">
        {title}
      </h3>

      <p className="mt-1.5 text-[11px] leading-4 text-slate-500 sm:mt-2 sm:text-xs sm:leading-5">
        {description}
      </p>
    </Link>
  );
}