import { cents, day } from "@/lib/accounting/model";
import { isValidDate } from "@/lib/validation/date";
import { CLAIMABLE_STATUSES } from "@/lib/insurance/requestWorkflow";
export { CLAIMABLE_STATUSES };
export const PROGRESS_ACTIONS = [
  "request_created",
  "payment_uploaded",
  "payment_confirmed",
  "policy_preparation_started",
  "request_claimed",
  "policy_uploaded_year_1",
  "policy_uploaded_year_2",
  "policy_replaced_year_1",
  "policy_replaced_year_2",
];
export type DashboardRole = "admin" | "agent";
export type Period = "today" | "7d" | "30d" | "month";
export type RequestRow = {
  id: string;
  request_code: string;
  status: string;
  created_at: string;
  assigned_at: string | null;
  assigned_agent_id: string | null;
  insurance_duration_years: number | null;
  client:
    | { first_name: string; last_name: string; nationality?: string | null }
    | { first_name: string; last_name: string; nationality?: string | null }[]
    | null;
};
export type PaymentRow = {
  id: string;
  request_id: string;
  expected_amount: number | string | null;
  verified_at: string | null;
  status: string;
};
export type ActivityRow = {
  id: string;
  request_id: string;
  action: string;
  created_at: string;
};
export type Renewal = {
  id: string;
  requestId: string;
  requestCode: string;
  endDate: string | null;
  status: string;
};
export type DashboardData = {
  role: DashboardRole;
  userId: string;
  userName: string;
  loadedAt: string;
  requests: RequestRow[];
  queue: RequestRow[];
  activities: ActivityRow[] | null;
  payments: PaymentRow[] | null;
  renewals: Renewal[] | null;
};
export function time(value: string | null) {
  if (!value) return null;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : null;
}
export function clientName(row: RequestRow) {
  const c = Array.isArray(row.client) ? row.client[0] : row.client;
  return c
    ? `${c.first_name} ${c.last_name}`.trim() || "Client non renseigné"
    : "Client non renseigné";
}
export function monthRange(year: number, month: number) {
  return {
    start: Date.parse(
      `${year}-${String(month).padStart(2, "0")}-01T00:00:00+03:00`,
    ),
    end: Date.parse(
      `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01T00:00:00+03:00`,
    ),
  };
}
export function windowFor(period: Period, now: string) {
  const end = Date.parse(now),
    today = day(now);
  const midnight = Date.parse(today + "T00:00:00+03:00");
  let start: number, previousStart: number, previousEnd: number;
  if (period === "month") {
    const year = Number(today.slice(0, 4)),
      month = Number(today.slice(5, 7));
    start = monthRange(year, month).start;
    const previous = monthRange(
      month === 1 ? year - 1 : year,
      month === 1 ? 12 : month - 1,
    );
    previousStart = previous.start;
    previousEnd = Math.min(previous.end, previousStart + end - start);
  } else {
    const days = period === "today" ? 1 : period === "7d" ? 7 : 30;
    start = period === "today" ? midnight : end - days * 86400000;
    previousStart = start - days * 86400000;
    previousEnd = end - days * 86400000;
  }
  return { start, end, previousStart, previousEnd };
}
export function inside(value: string | null, start: number, end: number) {
  const t = time(value);
  return t !== null && t >= start && t < end;
}
export function totalPayments(rows: PaymentRow[]): number | null {
  let total = 0;
  for (const row of rows) {
    const value = cents(row.expected_amount);
    if (value === null) return null;
    total += value;
    if (!Number.isSafeInteger(total)) return null;
  }
  return total;
}
export function daysRemaining(
  endDate: string | null,
  now: string,
): number | null {
  if (!isValidDate(endDate)) return null;
  return Math.round(
    (Date.parse(endDate + "T00:00:00Z") - Date.parse(day(now) + "T00:00:00Z")) /
      86400000,
  );
}
export function waitLabel(minutes: number | null) {
  if (minutes === null) return "Date inconnue";
  if (minutes < 1) return "Moins de 1 min";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440)
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `${Math.floor(minutes / 1440)} j ${Math.floor((minutes % 1440) / 60)} h`;
}
export function progressAge(
  request: RequestRow,
  activities: ActivityRow[] | null,
  now: string,
): number | null {
  if (activities === null) return null;
  const end = Date.parse(now);
  let latest: number | null = null;
  for (const value of [
    request.created_at,
    request.assigned_at,
    ...activities
      .filter(
        (a) =>
          a.request_id === request.id && PROGRESS_ACTIONS.includes(a.action),
      )
      .map((a) => a.created_at),
  ]) {
    const t = time(value);
    if (t !== null && t <= end && (latest === null || t > latest)) latest = t;
  }
  return latest === null ? null : Math.floor((end - latest) / 60000);
}
export const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  waiting_payment: "Paiement attendu",
  payment_review: "Paiement à vérifier",
  payment_confirmed: "Assureur à sélectionner",
  policy_preparation: "Police en préparation",
  policy_available: "Police disponible",
  payment_rejected: "Paiement refusé",
  cancelled: "Annulé",
};
export function dashboard(data: DashboardData, period: Period) {
  const window = windowFor(period, data.loadedAt),
    { start, end, previousStart, previousEnd } = window;
  // Guard the view model as well as the database query boundary.
  const requests = data.requests.filter(
    (r) => data.role === "admin" || r.assigned_agent_id === data.userId,
  );
  const requestIds = new Set(requests.map((r) => r.id));
  const queue = data.queue
    .filter(
      (r) =>
        r.assigned_agent_id === null &&
        CLAIMABLE_STATUSES.includes(
          r.status as (typeof CLAIMABLE_STATUSES)[number],
        ),
    )
    .sort(
      (a, b) =>
        (time(a.created_at) ?? Infinity) - (time(b.created_at) ?? Infinity) ||
        a.id.localeCompare(b.id),
    );
  const selected = requests.filter((r) => inside(r.created_at, start, end)),
    previous = requests.filter((r) =>
      inside(r.created_at, previousStart, previousEnd),
    );
  const payments =
    data.payments?.filter(
      (p) =>
        p.status === "confirmed" &&
        (data.role === "admin" || requestIds.has(p.request_id)),
    ) ?? null;
  const selectedPayments =
    payments?.filter((p) => inside(p.verified_at, start, end)) ?? null;
  const previousPayments =
    payments?.filter((p) =>
      inside(p.verified_at, previousStart, previousEnd),
    ) ?? null;
  const activitiesById = new Map<string, ActivityRow[]>();
  for (const activity of data.activities ?? []) {
    const rows = activitiesById.get(activity.request_id) ?? [];
    rows.push(activity);
    activitiesById.set(activity.request_id, rows);
  }
  const actions = requests
    .filter((r) =>
      ["payment_review", "payment_confirmed", "policy_preparation"].includes(
        r.status,
      ),
    )
    .map((r) => ({
      ...r,
      age: progressAge(
        r,
        data.activities === null ? null : (activitiesById.get(r.id) ?? []),
        data.loadedAt,
      ),
    }))
    .sort((a, b) => (b.age ?? -1) - (a.age ?? -1) || a.id.localeCompare(b.id));
  const waiting = requests.filter((r) => r.status === "waiting_payment"),
    rejected = requests.filter((r) => r.status === "payment_rejected");
  const completed = selected.filter(
    (r) => r.status === "policy_available",
  ).length;
  const renewalRows =
    data.renewals
      ?.map((r) => ({ ...r, days: daysRemaining(r.endDate, data.loadedAt) }))
      .sort(
        (a, b) =>
          (a.days ?? Infinity) - (b.days ?? Infinity) ||
          a.id.localeCompare(b.id),
      ) ?? null;
  const recent = [...requests].sort(
    (a, b) =>
      (time(b.created_at) ?? 0) - (time(a.created_at) ?? 0) ||
      a.id.localeCompare(b.id),
  );
  const currentDay = Date.parse(day(data.loadedAt) + "T00:00:00+03:00");
  const chart = Array.from({ length: 7 }, (_, i) => {
    const start = currentDay - (6 - i) * 86400000,
      end = start + 86400000,
      ps =
        payments?.filter((p) =>
          inside(
            p.verified_at,
            start,
            Math.min(end, Date.parse(data.loadedAt)),
          ),
        ) ?? null;
    return {
      date: day(new Date(start).toISOString()),
      requests: requests.filter((r) =>
        inside(r.created_at, start, Math.min(end, Date.parse(data.loadedAt))),
      ).length,
      collected: ps === null ? null : totalPayments(ps),
    };
  });
  const nationalities = new Map<string, number>();
  for (const row of selected) {
    const client = Array.isArray(row.client) ? row.client[0] : row.client;
    const label = client?.nationality?.trim() || "Non renseignée";
    nationalities.set(label, (nationalities.get(label) || 0) + 1);
  }
  return {
    window,
    requests,
    queue,
    selected,
    previous,
    actions,
    waiting,
    rejected,
    recent,
    chart,
    renewals: renewalRows,
    completed,
    completionRate: selected.length ? completed / selected.length : null,
    collected:
      selectedPayments === null ? null : totalPayments(selectedPayments),
    previousCollected:
      previousPayments === null ? null : totalPayments(previousPayments),
    paymentCount: selectedPayments?.length ?? null,
    undatedPayments:
      payments?.filter((p) => time(p.verified_at) === null).length ?? null,
    watch: actions.filter((r) => r.age !== null && r.age >= 5 && r.age < 15)
      .length,
    late: actions.filter((r) => r.age !== null && r.age >= 15 && r.age < 30)
      .length,
    critical: actions.filter((r) => r.age !== null && r.age >= 30).length,
    nationalities: [...nationalities]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  };
}
