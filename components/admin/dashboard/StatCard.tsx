import type {
  ReactNode,
} from "react";

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
  accentClassName = "bg-[#EEF6EC] text-[#0B5D3B]",
}: StatCardProps) {
  const content = (
    <article className="group relative h-full overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#CFE3CF] hover:shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#102B20]">
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
          <p className="text-xs leading-5 text-slate-400">
            {description}
          </p>
        )}
      </div>

      {href && (
        <p className="mt-5 text-sm font-semibold text-[#0B5D3B] transition group-hover:translate-x-1">
          Voir les détails →
        </p>
      )}
    </article>
  );

  return href ? (
    <Link
      href={href}
      className="block h-full"
    >
      {content}
    </Link>
  ) : (
    content
  );
}

function TrendBadge({
  value,
  direction,
}: {
  value: string;
  direction: TrendDirection;
}) {
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
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
      {value}
    </span>
  );
}