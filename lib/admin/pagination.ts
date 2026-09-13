export type ListParams = Record<string, string | string[] | undefined>;
export function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
export function paginate<T>(
  rows: T[],
  value: string | string[] | undefined,
  size = 20,
) {
  const parsed = Number(scalar(value));
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(
    pages,
    Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1,
  );
  return {
    rows: rows.slice((page - 1) * size, page * size),
    page,
    pages,
    total: rows.length,
    first: rows.length ? (page - 1) * size + 1 : 0,
    last: Math.min(page * size, rows.length),
  };
}
export function listUrl(base: string, params: ListParams, page: number) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page") continue;
    for (const item of Array.isArray(value) ? value : [value])
      if (item) q.append(key, item);
  }
  if (page > 1) q.set("page", String(page));
  return base + (q.size ? "?" + q.toString() : "");
}
export function matchesSearch(values: unknown[], query: string) {
  const normalize = (value: unknown) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr-FR");
  return normalize(values.join(" ")).includes(normalize(query.trim()));
}
