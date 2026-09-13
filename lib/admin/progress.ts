export function getMinutesBetween(start: string, end: string) {
  const a = Date.parse(start),
    b = Date.parse(end);
  return Number.isFinite(a) && Number.isFinite(b) && b >= a
    ? Math.floor((b - a) / 60000)
    : NaN;
}
export function getLastProgress(
  request: { id: string; created_at: string; assigned_at: string | null },
  logs: Map<string, string>,
  now = new Date().toISOString(),
) {
  const cutoff = Date.parse(now);
  const values = [
    request.created_at,
    request.assigned_at,
    logs.get(request.id),
  ].filter(
    (v): v is string =>
      Boolean(v) && Number.isFinite(Date.parse(v!)) && Date.parse(v!) <= cutoff,
  );
  return values.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? "";
}
