import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

type TrendDirection =
  | "up"
  | "down"
  | "neutral";

type StatCardProps = {
  title: string;
  value: string;
  description?: string;
  icon: ReactNode;
  href?: string;
  trendValue?: string;
  trendDirection?: TrendDirection;
  accentClassName?: string;
};

export default function StatCard({
  title,
  value,
  description,
  icon,
  href,
  trendValue,
  trendDirection = "neutral",
  accentClassName = "bg-blue-50 text-blue-700",
}: StatCardProps) {
  const cardContent = (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            accentClassName,
          ].join(" ")}
        >
          {icon}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {trendValue && (
          <TrendBadge
            value={trendValue}
            direction={trendDirection}
          />
        )}

        {description && (
          <p className="text-xs leading-5 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {href && (
        <p className="mt-5 text-sm font-semibold text-blue-700 transition group-hover:translate-x-1">
          Voir les détails →
        </p>
      )}
    </article>
  );

  if (!href) {
    return cardContent;
  }

  return (
    <Link
      href={href}
      className="block"
    >
      {cardContent}
    </Link>
  );
}

type TrendBadgeProps = {
  value: string;
  direction: TrendDirection;
};

function TrendBadge({
  value,
  direction,
}: TrendBadgeProps) {
  if (direction === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {value}
      </span>
    );
  }

  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        <ArrowDownRight className="h-3.5 w-3.5" />
        {value}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      {value}
    </span>
  );
}