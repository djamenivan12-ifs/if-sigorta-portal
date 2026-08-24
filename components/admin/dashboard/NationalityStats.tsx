import {
  Globe2,
} from "lucide-react";

type NationalityItem = {
  nationality: string;
  count: number;
  percentage: number;
};

export default function NationalityStats({
  data,
  total,
}: {
  data: NationalityItem[];
  total: number;
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
            Clients
          </p>

          <h2 className="mt-2 text-xl font-semibold text-[#102B20]">
            Répartition par nationalité
          </h2>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF6EC] text-[#0B5D3B]">
          <Globe2 className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6">
        {data.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Aucune donnée disponible.
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item) => (
              <div key={item.nationality}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <p className="truncate text-sm font-semibold text-slate-700">
                    {item.nationality}
                  </p>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900">
                      {item.count}
                    </span>

                    <span className="w-14 text-right text-xs text-slate-400">
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
                    className="h-full rounded-full bg-[#0B5D3B]"
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

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-sm text-slate-500">
          Total clients
        </span>

        <span className="text-lg font-semibold text-[#102B20]">
          {total.toLocaleString("fr-FR")}
        </span>
      </div>
    </section>
  );
}