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

const defaultData: ChartDataItem[] = [
  {
    label: "Lun",
    requests: 8,
    revenue: 14200,
  },
  {
    label: "Mar",
    requests: 13,
    revenue: 23100,
  },
  {
    label: "Mer",
    requests: 10,
    revenue: 18700,
  },
  {
    label: "Jeu",
    requests: 17,
    revenue: 30400,
  },
  {
    label: "Ven",
    requests: 21,
    revenue: 38900,
  },
  {
    label: "Sam",
    requests: 12,
    revenue: 21600,
  },
  {
    label: "Dim",
    requests: 6,
    revenue: 10800,
  },
];

function formatCurrency(value: number) {
  return `${value.toLocaleString("fr-FR")} TL`;
}

export default function DashboardOverviewChart({
  data = defaultData,
}: DashboardOverviewChartProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Performance
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Évolution des demandes
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            Nombre de demandes enregistrées cette semaine.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />

          <span className="text-xs font-semibold text-slate-600">
            Demandes
          </span>
        </div>
      </div>

      <div className="mt-8 h-80 w-full">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: -20,
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
                  stopColor="#2563eb"
                  stopOpacity={0.25}
                />

                <stop
                  offset="95%"
                  stopColor="#2563eb"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="#e2e8f0"
            />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#64748b",
                fontSize: 12,
              }}
              dy={10}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tick={{
                fill: "#64748b",
                fontSize: 12,
              }}
            />

            <Tooltip
              cursor={{
                stroke: "#93c5fd",
                strokeWidth: 1,
              }}
              content={
                <CustomTooltip />
              }
            />

            <Area
              type="monotone"
              dataKey="requests"
              stroke="#2563eb"
              strokeWidth={3}
              fill="url(#requestsGradient)"
              activeDot={{
                r: 5,
                strokeWidth: 3,
                stroke: "#ffffff",
                fill: "#2563eb",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataItem;
  }>;
  label?: string;
};

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-slate-900">
        {item.requests} demande
        {item.requests > 1 ? "s" : ""}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Revenu :{" "}
        <span className="font-semibold text-slate-700">
          {formatCurrency(
            item.revenue,
          )}
        </span>
      </p>
    </div>
  );
}