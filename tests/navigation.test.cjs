const test = require("node:test"),
  assert = require("node:assert/strict");
const { loadTs } = require("./load-ts.cjs");
const { paginate, listUrl, matchesSearch } = loadTs("lib/admin/pagination.ts");
const { getMinutesBetween, getLastProgress } = loadTs("lib/admin/progress.ts");
const { readAll } = loadTs("lib/supabase/readAll.ts");
test("navigation: out-of-range pages clamp after filtering and invalid page values cannot hide results", () => {
  const rows = Array.from({ length: 25 }, (_, i) => i);
  assert.deepEqual(paginate(rows, "999").rows, [20, 21, 22, 23, 24]);
  for (const p of ["-2", "NaN", "2.5", "Infinity", ""])
    assert.equal(paginate(rows, p).page, 1);
  assert.deepEqual(paginate([], "999"), {
    rows: [],
    page: 1,
    pages: 1,
    total: 0,
    first: 0,
    last: 0,
  });
});
test("navigation: page links preserve encoded search, role and multi-value filters", () => {
  const url = listUrl(
    "/admin/agents",
    { q: "Élodie & Jean", filter: "agent", tag: ["a", "b"], page: "9" },
    2,
  );
  const parsed = new URL(url, "https://example.test");
  assert.equal(parsed.searchParams.get("q"), "Élodie & Jean");
  assert.equal(parsed.searchParams.get("filter"), "agent");
  assert.deepEqual(parsed.searchParams.getAll("tag"), ["a", "b"]);
  assert.equal(parsed.searchParams.get("page"), "2");
  assert.equal(
    new URL(
      listUrl("/admin/agents", { q: "Élodie" }, 1),
      "https://example.test",
    ).searchParams.has("page"),
    false,
  );
});
test("navigation: accent-insensitive search handles missing client values", () => {
  assert.equal(matchesSearch(["Élodie", null, "Dupré"], "elodie dupre"), false);
  assert.equal(matchesSearch(["Élodie", "Dupré"], "elodie dupre"), true);
  assert.equal(matchesSearch([null, "Agence Étoile"], "etoile"), true);
});
test("agent progress: a new assignment supersedes an older activity and future activity is ignored", () => {
  const r = {
    id: "a",
    created_at: "2026-09-13T08:00:00Z",
    assigned_at: "2026-09-13T10:00:00Z",
  };
  const now = "2026-09-13T12:00:00Z";
  assert.equal(
    getLastProgress(r, new Map([["a", "2026-09-13T09:00:00Z"]]), now),
    r.assigned_at,
  );
  assert.equal(
    getLastProgress(r, new Map([["a", "2099-01-01T00:00:00Z"]]), now),
    r.assigned_at,
  );
});
test("agent progress: unknown and reversed timestamps are excluded from averages", () => {
  assert.equal(Number.isNaN(getMinutesBetween("bad", "2026-09-13")), true);
  assert.equal(
    Number.isNaN(getMinutesBetween("2026-09-14", "2026-09-13")),
    true,
  );
  assert.equal(
    getMinutesBetween("2026-09-13T10:00:00Z", "2026-09-13T11:03:00Z"),
    63,
  );
});
test("navigation lists: read beyond an API row cap without losing records", async () => {
  const all = [1, 2, 3, 4, 5];
  const result = await readAll({
    range: async (from) => ({ data: all.slice(from, from + 2), error: null }),
  });
  assert.deepEqual(result.data, all);
});
test("navigation lists: an error on a later page never returns partial totals", async () => {
  const result = await readAll({
    range: async (from) =>
      from
        ? { data: null, error: { message: "offline" } }
        : { data: [1], error: null },
  });
  assert.deepEqual(result.data, []);
  assert.ok(result.error);
});

test("notifications: active dossier remains visible after WhatsApp and client waiting is not a treatment alert", async () => {
  const { renderToStaticMarkup } = require("react-dom/server");
  const React = require("react");
  const now = new Date().toISOString();
  const tables = {
    insurance_requests: [
      {
        id: "active",
        request_code: "ACTIVE-WHATSAPP",
        status: "payment_review",
        created_at: now,
        assigned_at: now,
        assigned_agent_id: "me",
        client: null,
      },
      {
        id: "wait",
        request_code: "WAIT-CLIENT",
        status: "waiting_payment",
        created_at: now,
        assigned_at: now,
        assigned_agent_id: "me",
        client: null,
      },
      {
        id: "draft",
        request_code: "DRAFT-HIDDEN",
        status: "draft",
        created_at: now,
        assigned_at: null,
        assigned_agent_id: null,
        client: null,
      },
    ],
    activity_logs: [
      { request_id: "active", action: "whatsapp_sent", created_at: now },
    ],
    insurance_renewals: [],
  };
  const db = {
    auth: {
      admin: { listUsers: async () => ({ data: { users: [] }, error: null }) },
    },
    from(table) {
      let rows = tables[table],
        start = 0,
        end = Infinity;
      const q = {
        select(sql) {
          let balance = 0;
          for (const char of sql) {
            if (char === "(") balance++;
            if (char === ")") balance--;
            assert.ok(balance >= 0, "Malformed relation select");
          }
          assert.equal(balance, 0, "Unbalanced relation select");
          return q;
        },
        in(k, values) {
          rows = rows.filter((r) => values.includes(r[k]));
          return q;
        },
        order() {
          return q;
        },
        range(a, b) {
          start = a;
          end = b + 1;
          return q;
        },
        then(resolve) {
          resolve({ data: rows.slice(start, end), error: null });
        },
      };
      return q;
    },
  };
  const Page = loadTs("app/admin/(protected)/notifications/page.tsx", {
    "@/lib/auth/requireRole": {
      requireRole: async () => ({ user: { id: "me" }, role: "admin" }),
    },
    "@/lib/supabase/service": { createServiceClient: () => db },
    "@/components/admin/pages/PageFrame": ({ children }) =>
      React.createElement("section", null, children),
    "@/components/admin/pages/ListTools": {
      ListPagination: () => null,
      ListFilters: () => null,
    },
    "@/components/admin/requests/ClaimRequestButton": () => null,
    "@/components/admin/notifications/NotificationsRealtimeSync": () => null,
    "../renouvellements/RenewalWhatsappButton": () => null,
    "next/link": "a",
  }).default;
  const html = renderToStaticMarkup(await Page());
  assert.match(html, /ACTIVE-WHATSAPP/);
  assert.doesNotMatch(html, /WAIT-CLIENT|DRAFT-HIDDEN/);
});
