const test = require("node:test"),
  assert = require("node:assert/strict");
const { loadTs } = require("./load-ts.cjs");
const { dashboard, windowFor, daysRemaining, progressAge, monthRange } = loadTs(
  "lib/dashboard/model.ts",
);
const now = "2026-09-13T12:00:00Z";
const request = (id, status = "payment_review", agent = "me") => ({
  id,
  request_code: id,
  status,
  assigned_agent_id: agent,
  created_at: "2026-09-13T10:00:00Z",
  assigned_at: null,
  insurance_duration_years: 1,
  client: null,
});
const source = () => ({
  role: "admin",
  userId: "me",
  userName: "Test",
  loadedAt: now,
  requests: [],
  queue: [],
  activities: [],
  payments: [],
  renewals: [],
});
test("dashboard: WhatsApp delivery does not complete an active dossier", () => {
  const m = dashboard(
    {
      ...source(),
      requests: [request("a")],
      activities: [
        {
          id: "log",
          request_id: "a",
          action: "whatsapp_sent",
          created_at: "2026-09-13T11:59:00Z",
        },
      ],
    },
    "month",
  );
  assert.equal(m.actions.length, 1);
  assert.equal(m.actions[0].age, 120);
  assert.equal(m.completed, 0);
});
test("dashboard: completed, cancelled, client-waiting and rejected dossiers are separate from team delay alerts", () => {
  const requests = [
    "policy_available",
    "cancelled",
    "waiting_payment",
    "payment_rejected",
  ].map((s, i) => request(String(i), s));
  const m = dashboard({ ...source(), requests }, "month");
  assert.equal(m.actions.length, 0);
  assert.equal(m.critical, 0);
  assert.equal(m.waiting.length, 1);
  assert.equal(m.rejected.length, 1);
});
test("dashboard: a confirmed payment still requires selecting an insurer", () => {
  const m = dashboard(
    { ...source(), requests: [request("a", "payment_confirmed")] },
    "month",
  );
  assert.equal(m.actions.length, 1);
});
test("dashboard: queue excludes drafts and rows already claimed, then orders oldest first", () => {
  const m = dashboard(
    {
      ...source(),
      queue: [
        request("draft", "draft", null),
        request("owned"),
        {
          ...request("new", "waiting_payment", null),
          created_at: "2026-09-12T10:00:00Z",
        },
        {
          ...request("old", "policy_preparation", null),
          created_at: "2026-09-01T10:00:00Z",
        },
      ],
    },
    "month",
  );
  assert.deepEqual(
    m.queue.map((r) => r.id),
    ["old", "new"],
  );
});
test("dashboard: agent model never includes another agent records or amounts", () => {
  const m = dashboard(
    {
      ...source(),
      role: "agent",
      requests: [
        request("mine"),
        request("foreign", "payment_review", "other"),
      ],
      payments: [
        {
          id: "p",
          request_id: "foreign",
          status: "confirmed",
          expected_amount: 999999,
          verified_at: now,
        },
      ],
    },
    "month",
  );
  assert.deepEqual(
    m.requests.map((r) => r.id),
    ["mine"],
  );
  assert.equal(m.collected, 0);
});
test("dashboard: periods use Istanbul midnight and equivalent elapsed time", () => {
  const w = windowFor("today", "2026-09-01T00:30:00Z");
  assert.equal(new Date(w.start).toISOString(), "2026-08-31T21:00:00.000Z");
  assert.equal(w.end - w.start, w.previousEnd - w.previousStart);
  const m = windowFor("month", now);
  assert.equal(m.end - m.start, m.previousEnd - m.previousStart);
});
test("dashboard: previous February is capped at its actual month end", () => {
  const w = windowFor("month", "2026-03-31T12:00:00Z");
  assert.equal(w.previousEnd, monthRange(2026, 2).end);
});
test("dashboard: empty cohort has no invented conversion percentage", () => {
  assert.equal(dashboard(source(), "month").completionRate, null);
});
test("dashboard: confirmed payment with unknown amount is not zero revenue", () => {
  const m = dashboard(
    {
      ...source(),
      payments: [
        {
          id: "p",
          request_id: "a",
          status: "confirmed",
          expected_amount: null,
          verified_at: "2026-09-10T12:00:00Z",
        },
      ],
    },
    "month",
  );
  assert.equal(m.collected, null);
});
test("dashboard: optional panels retain an explicit unavailable state", () => {
  const m = dashboard(
    {
      ...source(),
      requests: [request("a")],
      activities: null,
      payments: null,
      renewals: null,
    },
    "month",
  );
  assert.equal(m.actions[0].age, null);
  assert.equal(m.collected, null);
  assert.equal(m.renewals, null);
});
test("dashboard: bad/future progress dates do not suppress a real delay", () => {
  assert.equal(
    progressAge(
      request("a"),
      [
        {
          request_id: "a",
          action: "payment_confirmed",
          created_at: "2027-01-01",
        },
      ],
      now,
    ),
    120,
  );
  assert.equal(
    progressAge({ ...request("a"), created_at: "invalid" }, [], now),
    null,
  );
});
test("dashboard: renewal dates use Istanbul calendar boundaries and reject impossible dates", () => {
  assert.equal(daysRemaining("2026-09-02", "2026-09-01T22:00:00Z"), 0);
  assert.equal(daysRemaining("2026-02-31", now), null);
  assert.equal(daysRemaining("2026-09-12", now), -1);
});
test("dashboard: latest requests include waiting-payment records", () => {
  assert.equal(
    dashboard(
      { ...source(), requests: [request("new", "waiting_payment")] },
      "month",
    ).recent.length,
    1,
  );
});
function mockDB({ failTable, rowsPerTable = {} } = {}) {
  const queries = [];
  return {
    queries,
    from(table) {
      const filters = [];
      let from = 0;
      const q = {
        select(columns) {
          q.columns = columns;
          return q;
        },
        order() {
          return q;
        },
        eq(k, v) {
          filters.push(["eq", k, v]);
          return q;
        },
        is(k, v) {
          filters.push(["is", k, v]);
          return q;
        },
        in(k, v) {
          filters.push(["in", k, v]);
          return q;
        },
        gte() {
          return q;
        },
        lt() {
          return q;
        },
        range(offset) {
          from = offset;
          queries.push({
            table,
            filters: [...filters],
            columns: q.columns,
            from,
          });
          if (table === failTable)
            return Promise.resolve({
              data: null,
              error: { message: "simulated" },
            });
          return Promise.resolve({
            data: (rowsPerTable[table] || [])
              .filter((r) =>
                filters.every(([op, k, v]) =>
                  k.includes(".")
                    ? true
                    : op === "in"
                      ? v.includes(r[k])
                      : r[k] === v,
                ),
              )
              .slice(from, from + 1),
            error: null,
          });
        },
      };
      return q;
    },
  };
}
test("dashboard loader: agent never reads company payments or clients table and paginates own/queue separately", async () => {
  const db = mockDB({
    rowsPerTable: {
      insurance_requests: [
        request("mine"),
        request("other", "payment_review", "other"),
        request("open", "waiting_payment", null),
      ],
    },
  });
  const { loadDashboard } = loadTs("lib/dashboard/load.ts", {
    "@/lib/supabase/service": { createServiceClient: () => db },
  });
  const d = await loadDashboard(
    { role: "agent", userId: "me", userName: "Test" },
    new Date(now),
  );
  assert.deepEqual(
    d.requests.map((r) => r.id),
    ["mine"],
  );
  assert.deepEqual(
    d.queue.map((r) => r.id),
    ["open"],
  );
  assert.ok(!db.queries.some((q) => ["payments", "clients"].includes(q.table)));
  assert.ok(
    db.queries
      .filter((q) => q.table === "insurance_requests")
      .every((q) => q.filters.some((f) => f[1] === "assigned_agent_id")),
  );
});
test("dashboard loader: renewals failure does not erase the request queue", async () => {
  const db = mockDB({
    failTable: "insurance_renewals",
    rowsPerTable: { insurance_requests: [request("mine")] },
  });
  const { loadDashboard } = loadTs("lib/dashboard/load.ts", {
    "@/lib/supabase/service": { createServiceClient: () => db },
  });
  const d = await loadDashboard(
    { role: "agent", userId: "me", userName: "Test" },
    new Date(now),
  );
  assert.equal(d.requests.length, 1);
  assert.equal(d.renewals, null);
});
test("dashboard loader: essential request failure is not presented as an empty dashboard", async () => {
  const db = mockDB({ failTable: "insurance_requests" });
  const { loadDashboard } = loadTs("lib/dashboard/load.ts", {
    "@/lib/supabase/service": { createServiceClient: () => db },
  });
  await assert.rejects(
    loadDashboard(
      { role: "admin", userId: "me", userName: "Test" },
      new Date(now),
    ),
  );
});
test("monthly report loader: agent filters both request cohort and payment join at the database", async () => {
  const db = mockDB();
  const { loadMonthlyDashboard } = loadTs("lib/dashboard/load.ts", {
    "@/lib/supabase/service": { createServiceClient: () => db },
  });
  await loadMonthlyDashboard({ role: "agent", userId: "me" }, 2026, 9);
  assert.ok(
    db.queries
      .find((q) => q.table === "insurance_requests")
      .filters.some((f) => f[1] === "assigned_agent_id" && f[2] === "me"),
  );
  assert.ok(
    db.queries
      .find((q) => q.table === "payments")
      .filters.some(
        (f) => f[1] === "request.assigned_agent_id" && f[2] === "me",
      ),
  );
  assert.match(
    db.queries.find((q) => q.table === "payments").columns,
    /!inner/,
  );
});
test("monthly report: unauthorized role is refused before reading financial data", async () => {
  let accessed = false;
  const { GET } = loadTs("app/api/admin/reports/monthly/route.ts", {
    "@/lib/supabase/server": {
      createServerSupabaseClient: async () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: "x", app_metadata: { role: "partner" } } },
            error: null,
          }),
        },
      }),
    },
    "@/lib/dashboard/load": {
      loadMonthlyDashboard: () => {
        accessed = true;
      },
    },
  });
  const r = await GET(new Request("http://localhost/api?year=2026&month=9"));
  assert.equal(r.status, 403);
  assert.equal(accessed, false);
});
test("monthly report: valid agent PDF uses authenticated scope and tolerates an unknown amount", async () => {
  let scope;
  const { GET } = loadTs("app/api/admin/reports/monthly/route.ts", {
    "@/lib/supabase/server": {
      createServerSupabaseClient: async () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: "me", app_metadata: { role: "agent" } } },
            error: null,
          }),
        },
      }),
    },
    "@/lib/dashboard/load": {
      loadMonthlyDashboard: async (s) => {
        scope = s;
        return {
          requests: [request("mine")],
          payments: [
            {
              id: "p",
              request_id: "mine",
              status: "confirmed",
              expected_amount: null,
              verified_at: now,
            },
          ],
        };
      },
    },
  });
  const r = await GET(
    new Request("http://localhost/api?year=2026&month=9&userId=other"),
  );
  assert.equal(r.status, 200);
  assert.deepEqual(scope, { role: "agent", userId: "me" });
  assert.equal(r.headers.get("cache-control"), "no-store");
  const bytes = new Uint8Array(await r.arrayBuffer());
  const pdf = await require("pdf-lib").PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.match(pdf.getTitle(), /2026-09/);
});
