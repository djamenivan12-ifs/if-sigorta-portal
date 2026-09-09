"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartDataItem = {
  label: string;
  requests: number;
  revenue: number;
};

type DashboardOverviewChartProps = {
  data?: ChartDataItem[];
};

const defaultData: ChartDataItem[] = [];

export default function DashboardOverviewChart({
  data = defaultData,
}: DashboardOverviewChartProps) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.5rem] sm:p-6">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
          Performance
        </p>

        <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:mt-2 sm:text-xl">
          Évolution des demandes
        </h2>

        <p className="mt-1.5 text-[13px] leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
          Activité enregistrée sur les sept derniers jours.
        </p>
      </div>

      <div className="mt-5 h-56 w-full min-w-0 sm:mt-7 sm:h-72">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 4,
              left: -28,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient
                id="requestsGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="#0B5D3B"
                  stopOpacity={0.2}
                />

                <stop
                  offset="95%"
                  stopColor="#0B5D3B"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="#E2E8F0"
            />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              minTickGap={8}
              tick={{
                fill: "#94A3B8",
                fontSize: 11,
              }}
              dy={8}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={36}
              tick={{
                fill: "#94A3B8",
                fontSize: 11,
              }}
            />

            <Tooltip
              content={<CustomTooltip />}
            />

            <Area
              type="monotone"
              dataKey="requests"
              stroke="#0B5D3B"
              strokeWidth={3}
              fill="url(#requestsGradient)"
              activeDot={{
                r: 5,
                strokeWidth: 3,
                stroke: "#FFFFFF",
                fill: "#0B5D3B",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataItem;
  }>;
  label?: string;
}) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  const item =
    payload[0].payload;

  return (
    <div className="max-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-xl sm:px-4 sm:py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
        {label}
      </p>

      <p className="mt-1.5 text-[13px] font-semibold text-slate-900 sm:mt-2 sm:text-sm">
        {item.requests} demande
        {item.requests > 1
          ? "s"
          : ""}
      </p>

      <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
        Revenu :{" "}
        <span className="font-semibold text-[#0B5D3B]">
          {item.revenue.toLocaleString(
            "fr-FR",
          )}{" "}
          TL
        </span>
      </p>
    </div>
  );
}