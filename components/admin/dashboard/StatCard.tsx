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
    <article className="group relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#CFE3CF] hover:shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] sm:rounded-[1.35rem] sm:p-5 lg:rounded-[1.5rem] lg:p-5">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-5 text-slate-500 sm:text-sm">
            {title}
          </p>

          <p className="mt-2 break-words text-[1.7rem] font-semibold leading-none tracking-[-0.04em] text-[#102B20] sm:mt-3 sm:text-3xl">
            {value}
          </p>
        </div>

        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11",
            accentClassName,
          ].join(" ")}
        >
          {icon}
        </div>
      </div>

      {(trendValue ||
        description) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
          {trendValue && (
            <TrendBadge
              value={trendValue}
              direction={trendDirection}
            />
          )}

          {description && (
            <p className="min-w-0 text-[11px] leading-4 text-slate-400 sm:text-xs sm:leading-5">
              {description}
            </p>
          )}
        </div>
      )}

      {href && (
        <p className="mt-4 text-[13px] font-semibold text-[#0B5D3B] transition group-hover:translate-x-1 sm:mt-5 sm:text-sm">
          Voir les détails →
        </p>
      )}
    </article>
  );

  return href ? (
    <Link
      href={href}
      className="block h-full min-w-0"
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
      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold leading-4 text-emerald-700 sm:px-2.5 sm:text-xs">
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />

        <span className="truncate">
          {value}
        </span>
      </span>
    );
  }

  if (direction === "down") {
    return (
      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold leading-4 text-red-700 sm:px-2.5 sm:text-xs">
        <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />

        <span className="truncate">
          {value}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-full rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold leading-4 text-slate-500 sm:px-2.5 sm:text-xs">
      <span className="truncate">
        {value}
      </span>
    </span>
  );
}