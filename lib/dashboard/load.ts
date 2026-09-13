import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { collectRows } from "@/lib/supabase/collectRows";
import {
  CLAIMABLE_STATUSES,
  PROGRESS_ACTIONS,
  monthRange,
  type DashboardData,
  type DashboardRole,
  type RequestRow,
  type PaymentRow,
  type ActivityRow,
  type Renewal,
} from "./model";
type Scope = { role: DashboardRole; userId: string };
type DB = ReturnType<typeof createServiceClient>;
async function complete<T>(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const { data, error } = await collectRows(query);
  if (error)
    throw new Error(
      "Les données du tableau de bord sont temporairement indisponibles.",
    );
  return data as T[];
}
async function requests(
  db: DB,
  scope: Scope,
  range?: { start: number; end: number },
) {
  return complete<RequestRow>((from, to) => {
    let q = db
      .from("insurance_requests")
      .select(
        `id,request_code,status,created_at,assigned_at,assigned_agent_id,insurance_duration_years,client:clients(first_name,last_name${scope.role === "admin" ? ",nationality" : ""})`,
      )
      .order("id");
    if (scope.role === "agent") q = q.eq("assigned_agent_id", scope.userId);
    if (range)
      q = q
        .gte("created_at", new Date(range.start).toISOString())
        .lt("created_at", new Date(range.end).toISOString());
    return q.range(from, to);
  });
}
async function payments(
  db: DB,
  scope: Scope,
  range: { start: number; end: number },
) {
  return complete<PaymentRow>((from, to) => {
    let q = db
      .from("payments")
      .select(
        `id,request_id,expected_amount,verified_at,status${scope.role === "agent" ? ",request:insurance_requests!inner(assigned_agent_id)" : ""}`,
      )
      .eq("status", "confirmed")
      .gte("verified_at", new Date(range.start).toISOString())
      .lt("verified_at", new Date(range.end).toISOString())
      .order("id");
    if (scope.role === "agent")
      q = q.eq("request.assigned_agent_id", scope.userId);
    return q.range(from, to);
  });
}
export async function loadMonthlyDashboard(
  scope: Scope,
  year: number,
  month: number,
) {
  const db = createServiceClient(),
    range = monthRange(year, month);
  const [rows, paid] = await Promise.all([
    requests(db, scope, range),
    payments(db, scope, range),
  ]);
  return { requests: rows, payments: paid };
}
export async function loadDashboard(
  scope: Scope & { userName: string },
  now = new Date(),
): Promise<DashboardData> {
  const db = createServiceClient(),
    loadedAt = now.toISOString();
  const own = await requests(db, scope);
  const queuePromise =
    scope.role === "admin"
      ? Promise.resolve(
          own.filter(
            (r) =>
              r.assigned_agent_id === null &&
              CLAIMABLE_STATUSES.includes(
                r.status as (typeof CLAIMABLE_STATUSES)[number],
              ),
          ),
        )
      : complete<RequestRow>((from, to) =>
          db
            .from("insurance_requests")
            .select(
              "id,request_code,status,created_at,assigned_at,assigned_agent_id,insurance_duration_years,client:clients(first_name,last_name)",
            )
            .is("assigned_agent_id", null)
            .in("status", [...CLAIMABLE_STATUSES])
            .order("id")
            .range(from, to),
        );
  const activeIds = own
    .filter((r) =>
      ["payment_review", "payment_confirmed", "policy_preparation"].includes(
        r.status,
      ),
    )
    .map((r) => r.id);
  async function activity() {
    const all: ActivityRow[] = [];
    for (let offset = 0; offset < activeIds.length; offset += 100) {
      const ids = activeIds.slice(offset, offset + 100);
      all.push(
        ...(await complete<ActivityRow>((from, to) =>
          db
            .from("activity_logs")
            .select("id,request_id,action,created_at")
            .in("request_id", ids)
            .in("action", PROGRESS_ACTIONS)
            .order("id")
            .range(from, to),
        )),
      );
    }
    return all;
  }
  async function renewals() {
    type Row = {
      id: string;
      status: string;
      request:
        | {
            id: string;
            request_code: string;
            assigned_agent_id: string | null;
            policy_end_date: string | null;
          }
        | {
            id: string;
            request_code: string;
            assigned_agent_id: string | null;
            policy_end_date: string | null;
          }[]
        | null;
    };
    async function part(unassigned = false) {
      return complete<Row>((from, to) => {
        let q = db
          .from("insurance_renewals")
          .select(
            "id,status,request:insurance_requests!insurance_renewals_request_id_fkey!inner(id,request_code,assigned_agent_id,policy_end_date)",
          )
          .in("status", ["pending", "contacted", "interested"])
          .order("id");
        if (scope.role === "agent")
          q = unassigned
            ? q.is("request.assigned_agent_id", null)
            : q.eq("request.assigned_agent_id", scope.userId);
        return q.range(from, to);
      });
    }
    const rows =
      scope.role === "admin"
        ? await part()
        : [...(await part()), ...(await part(true))];
    return rows.flatMap((row): Renewal[] => {
      const r = Array.isArray(row.request) ? row.request[0] : row.request;
      if (
        !r ||
        (scope.role === "agent" &&
          r.assigned_agent_id !== null &&
          r.assigned_agent_id !== scope.userId)
      )
        return [];
      return [
        {
          id: row.id,
          requestId: r.id,
          requestCode: r.request_code,
          endDate: r.policy_end_date,
          status: row.status,
        },
      ];
    });
  }
  // Optional panels fail visibly without hiding the operational request queue.
  const [queue, logs, paid, renewalRows] = await Promise.all([
    queuePromise,
    activity().catch(() => null),
    scope.role === "admin"
      ? payments(db, scope, {
          start: now.getTime() - 63 * 86400000,
          end: now.getTime(),
        }).catch(() => null)
      : Promise.resolve(null),
    renewals().catch(() => null),
  ]);
  return {
    ...scope,
    loadedAt,
    requests: own,
    queue,
    activities: logs,
    payments: paid,
    renewals: renewalRows,
  };
}
