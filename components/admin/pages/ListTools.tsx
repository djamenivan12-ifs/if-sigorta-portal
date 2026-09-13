import Link from "next/link";
import { listUrl, type ListParams } from "@/lib/admin/pagination";
export function ListPagination({
  base,
  params,
  summary,
}: {
  base: string;
  params: ListParams;
  summary: {
    page: number;
    pages: number;
    total: number;
    first: number;
    last: number;
  };
}) {
  return (
    <nav
      aria-label="Pagination des résultats"
      className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm"
    >
      <p role="status" className="text-slate-600">
        {summary.first}–{summary.last} sur {summary.total} résultat
        {summary.total > 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-3">
        {summary.page > 1 ? (
          <Link
            className="rounded-lg border border-slate-200 px-3 py-2"
            href={listUrl(base, params, summary.page - 1)}
          >
            Précédent
          </Link>
        ) : (
          <span aria-disabled="true" className="px-3 py-2 text-slate-400">
            Précédent
          </span>
        )}
        <span>
          Page {summary.page} / {summary.pages}
        </span>
        {summary.page < summary.pages ? (
          <Link
            className="rounded-lg border border-slate-200 px-3 py-2"
            href={listUrl(base, params, summary.page + 1)}
          >
            Suivant
          </Link>
        ) : (
          <span aria-disabled="true" className="px-3 py-2 text-slate-400">
            Suivant
          </span>
        )}
      </div>
    </nav>
  );
}
export function ListFilters({
  base,
  query,
  options = [],
  selected = "",
  label = "Statut",
}: {
  base: string;
  query: string;
  options?: { value: string; label: string }[];
  selected?: string;
  label?: string;
}) {
  return (
    <form
      method="GET"
      action={base}
      className="my-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <label className="flex min-w-0 flex-1 flex-col gap-2 text-xs font-semibold text-slate-600">
        Rechercher
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Nom, code ou adresse e-mail…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3"
        />
      </label>
      {options.length > 0 && (
        <label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">
          {label}
          <select
            name="filter"
            defaultValue={selected}
            className="rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="">Tous</option>
            {options.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        type="submit"
        className="min-h-11 rounded-lg bg-emerald-900 px-4 text-sm font-semibold text-white"
      >
        Appliquer
      </button>
      <Link
        className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-sm text-slate-600"
        href={base}
      >
        Réinitialiser
      </Link>
    </form>
  );
}
