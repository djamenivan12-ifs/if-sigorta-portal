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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
            Priorités
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Dossiers sans progression
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Les dossiers sont classés automatiquement selon leur temps sans progression.
          </p>
        </div>

        <div
          className={`flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-bold ${
            criticalCount > 0
              ? "bg-red-100 text-red-700"
              : lateCount > 0
                ? "bg-orange-100 text-orange-700"
                : watchCount > 0
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
          }`}
        >
          {total}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <DelayCard
          title="À surveiller"
          value={watchCount}
          description="5 à moins de 15 minutes sans progression."
          href="/admin/notifications"
          className="border-amber-200 bg-amber-50"
          valueClassName="text-amber-700"
          icon={
            <Clock3 className="h-5 w-5" />
          }
        />

        <DelayCard
          title="En retard"
          value={lateCount}
          description="15 à moins de 30 minutes sans progression."
          href="/admin/notifications"
          className="border-orange-200 bg-orange-50"
          valueClassName="text-orange-700"
          icon={
            <AlertTriangle className="h-5 w-5" />
          }
        />

        <DelayCard
          title="Priorité élevée"
          value={criticalCount}
          description="30 minutes ou plus sans progression."
          href="/admin/notifications"
          className="border-red-200 bg-red-50"
          valueClassName="text-red-700"
          icon={
            <Siren className="h-5 w-5" />
          }
        />
      </div>

      {total === 0 && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          ✓ Aucun dossier en retard actuellement.
        </div>
      )}
    </section>
  );
}

type DelayCardProps = {
  title: string;
  value: number;
  description: string;
  href: string;
  className: string;
  valueClassName: string;
  icon: React.ReactNode;
};

function DelayCard({
  title,
  value,
  description,
  href,
  className,
  valueClassName,
  icon,
}: DelayCardProps) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border p-5 transition hover:-translate-y-0.5 hover:shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${valueClassName}`}
        >
          {icon}
        </div>

        <span
          className={`text-3xl font-bold ${valueClassName}`}
        >
          {value.toLocaleString(
            "fr-FR",
          )}
        </span>
      </div>

      <h3 className="mt-4 font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-slate-600">
        {description}
      </p>
    </Link>
  );
}