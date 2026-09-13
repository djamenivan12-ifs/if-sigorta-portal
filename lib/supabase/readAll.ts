import { collectRows } from "./collectRows";
/** Ordered list query; returns no misleading partial result if any page fails. */
export function readAll<T>(query: {
  range(
    from: number,
    to: number,
  ): PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
}) {
  return collectRows((from, to) => query.range(from, to));
}
