const test = require("node:test"),
  assert = require("node:assert/strict");
const { loadTs } = require("./load-ts.cjs");
const { adminOverview } = loadTs("lib/dashboard/adminOverview.ts");
const row = (id, status, agent = "agent") => ({
  id,
  request_code: id,
  status,
  assigned_agent_id: agent,
  assigned_at: null,
  created_at: "2026-11-01T09:00:00Z",
  insurance_duration_years: 1,
  client: null,
});
const data = {
  role: "admin",
  userId: "admin",
  userName: "Admin",
  loadedAt: "2026-11-01T15:00:00Z",
  requests: [
    row("review", "payment_review"),
    row("choose", "payment_confirmed"),
    row("prepare", "policy_preparation", "admin"),
    row("waiting", "waiting_payment"),
    row("complete", "policy_available"),
    row("cancel", "cancelled"),
    row("unknown", "payment_review", "deleted"),
    row("queue", "payment_review", null),
  ],
  queue: [row("queue", "payment_review", null)],
  activities: [],
  payments: [],
  renewals: [],
};
const team = [
  { id: "agent", name: "Agent", role: "agent" },
  { id: "admin", name: "Admin", role: "admin" },
];
test("Admin workload excludes client waiting and completed/cancelled cases and keeps missing assignees visible", () => {
  const m = adminOverview(data, "today", team);
  assert.deepEqual(
    m.workload.map((x) => [x.id, x.count]),
    [
      ["agent", 2],
      ["admin", 1],
    ],
  );
  assert.equal(m.unknownAssignments, 1);
  assert.equal(m.payments.length, 3);
  assert.equal(m.policies.length, 2);
  assert.equal(m.lists.queue.length, 1);
});
test("Date selection changes new cases only, not operational queues", () => {
  const old = row("old", "payment_review");
  old.created_at = "2026-10-30T10:00:00Z";
  const d = { ...data, requests: [old] };
  assert.equal(adminOverview(d, "today", team).lists.new.length, 0);
  assert.equal(adminOverview(d, "7d", team).lists.new.length, 1);
  assert.equal(adminOverview(d, "today", team).payments.length, 1);
});
test("Team failure is represented as unavailable, not an empty team", () =>
  assert.equal(adminOverview(data, "today", null).workload, null));
test("Extra admin data checks authorization before privileged reads", async () => {
  let touched = false;
  const { loadAdminOverview } = loadTs("lib/dashboard/loadAdminOverview.ts", {
    "@/lib/auth/requireRole": {
      requireRole: async (roles) => {
        assert.deepEqual(roles, ["admin"]);
        throw Error("Forbidden");
      },
    },
    "@/lib/supabase/service": {
      createServiceClient: () => {
        touched = true;
        throw Error("unexpected");
      },
    },
    "@/lib/supabase/listAllUsers": {
      listAllUsers: async () => {
        touched = true;
      },
    },
  });
  await assert.rejects(loadAdminOverview(), /Forbidden/);
  assert.equal(touched, false);
});
test("Only minimal staff fields are serialized; partner and user-editable roles are excluded", async () => {
  const q = {
    select() {
      return q;
    },
    in() {
      return q;
    },
    order() {
      return q;
    },
    limit: async () => ({ data: [], error: null }),
  };
  const { loadAdminOverview } = loadTs("lib/dashboard/loadAdminOverview.ts", {
    "@/lib/auth/requireRole": { requireRole: async () => ({ role: "admin" }) },
    "@/lib/supabase/service": {
      createServiceClient: () => ({ from: () => q }),
    },
    "@/lib/supabase/listAllUsers": {
      listAllUsers: async () => ({
        error: null,
        data: {
          users: [
            {
              id: "agent",
              email: "agent@example.test",
              app_metadata: { role: "agent" },
              user_metadata: { first_name: "Sarah" },
              secret: "not serialized",
            },
            {
              id: "partner",
              app_metadata: { role: "partner" },
              user_metadata: { role: "admin" },
            },
            {
              id: "client",
              app_metadata: {},
              user_metadata: { role: "admin" },
            },
          ],
        },
      }),
    },
  });
  assert.deepEqual((await loadAdminOverview()).team, [
    { id: "agent", name: "Sarah", role: "agent" },
  ]);
});
