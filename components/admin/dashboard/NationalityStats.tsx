import { Globe2 } from "lucide-react";

type NationalityItem = {
  nationality: string;
  count: number;
  percentage: number;
};

type NationalityStatsProps = {
  data: NationalityItem[];
  total: number;
};

export default function NationalityStats({
  data,
  total,
}: NationalityStatsProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Clients
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Répartition par nationalité
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Nationalités enregistrées dans les dossiers.
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Globe2 className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6">
        {data.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm text-slate-500">
              Aucune donnée disponible.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {data.map((item) => (
              <div
                key={item.nationality}
              >
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {item.nationality}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-slate-900">
                      {item.count}
                    </span>

                    <span className="w-14 text-right text-xs font-medium text-slate-500">
                      {item.percentage.toLocaleString(
                        "fr-FR",
                        {
                          maximumFractionDigits: 1,
                        },
                      )}
                      %
                    </span>
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#2F2963] transition-all"
                    style={{
                      width: `${Math.min(
                        item.percentage,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Total clients
          </span>

          <span className="text-lg font-bold text-slate-900">
            {total.toLocaleString(
              "fr-FR",
            )}
          </span>
        </div>
      </div>
    </section>
  );
}