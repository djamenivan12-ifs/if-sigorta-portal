const test = require("node:test"),
  assert = require("node:assert/strict");
const { loadTs } = require("./load-ts.cjs");
const { isCongoBrazzaville } = loadTs("lib/insurance/nationality.ts");
test("Congo-Brazzaville is explicitly separate from RDC and ambiguous nationality", () => {
  for (const name of [
    "Congo",
    "CG",
    "Congo-Brazzaville",
    "République du Congo",
    "Congolaise (Congo-Brazzaville)",
  ])
    assert.equal(isCongoBrazzaville(name), true);
  for (const name of [
    "RDC",
    "République démocratique du Congo",
    "Congolaise",
    "Congolaise (RDC)",
    null,
  ])
    assert.equal(isCongoBrazzaville(name), false);
});
const values = [
  [0, 15, 1275, 2550, 1500, 3000],
  [16, 25, 425, 850, 525, 1050],
  [26, 35, 510, 1020, 650, 1300],
  [36, 45, 595, 1190, 750, 1500],
  [46, 55, 722.5, 1445, 850, 1700],
];
const grid = values.map(
  (
    [
      min_age,
      max_age,
      one_year_cost,
      two_year_cost,
      one_year_price,
      two_year_price,
    ],
    i,
  ) => ({
    id: "rate-" + i,
    insurance_company_id: "sky",
    nationality: "CG",
    min_age,
    max_age,
    one_year_cost,
    two_year_cost,
    one_year_price,
    two_year_price,
    effective_from: "2026-09-17",
  }),
);
function make(rows = grid) {
  const db = {
    from(table) {
      const filters = [];
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push((r) => r[k] === v);
          return q;
        },
        lte(k, v) {
          filters.push((r) => r[k] <= v);
          return q;
        },
        order() {
          return q;
        },
        then(resolve, reject) {
          return Promise.resolve({
            data: (table === "insurance_companies"
              ? [{ id: "sky", name: "Skyline renommé", business_code:"skyline", is_active: true }]
              : rows
            ).filter((r) => filters.every((f) => f(r))),
            error: null,
          }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  return loadTs("lib/insurance/nationalityRates.ts", {
    "@/lib/supabase/service": { createServiceClient: () => db },
  });
}
test("Skyline exact prices at all inclusive boundaries for both durations", async () => {
  const rates = make();
  for (const [a, b, c, d, e, f] of values)
    for (const age of [a, b]) {
      const rate = await rates.skylineNationalityRate(
        age,
        "Congo",
        new Date("2026-09-17T00:00:00Z"),
      );
      assert.deepEqual(rates.nationalityAmounts(rate, 1), {
        cost: c,
        price: e,
      });
      assert.deepEqual(rates.nationalityAmounts(rate, 2), {
        cost: d,
        price: f,
      });
    }
  assert.equal(
    await rates.skylineNationalityRate(56, "Congo", new Date("2026-09-17")),
    null,
  );
  assert.equal(
    await rates.skylineNationalityRate(30, "RDC", new Date("2026-09-17")),
    null,
  );
  assert.equal(
    await rates.skylineNationalityRate(
      30,
      "Congo",
      new Date("2026-09-16T20:59:59Z"),
    ),
    null,
  );
  assert.ok(
    await rates.skylineNationalityRate(
      30,
      "Congo",
      new Date("2026-09-16T21:00:00Z"),
    ),
  );
});
test("A newer grid never silently falls back to a missing older bracket", async () => {
  const rows = [{ ...grid[0], effective_from: "2026-10-01" }, ...grid];
  const rates = make(rows);
  assert.equal(
    await rates.skylineNationalityRate(30, "Congo", new Date("2026-10-01")),
    null,
  );
});

// Public prices now use the normal grid for every nationality, including CG.
test("Public quotes use standard prices for all nationalities and both durations", async () => {
  const db = { from(table) {
    assert.equal(table, "insurance_price_ranges");
    let age;
    const q = {
      select() { return q; }, eq() { return q; }, order() { return q; },
      limit() { return q; }, gte() { return q; },
      lte(key, value) { age = value; return q; },
      maybeSingle: async () => ({ data: age <= 80 ? {one_year_price: 777, two_year_price: 1444} : null, error: null }),
    };
    return q;
  }};
  const { calculateInsurancePriceServer: quote } = loadTs("lib/insurance/calculatePriceServer.ts", {
    "@/lib/supabase/service": { createServiceClient: () => db },
  });
  for (const nationality of ["CG", "Congo", "Congo-Brazzaville", "Congolaise (Congo-Brazzaville)", "RDC", "Cameroun", ""]) {
    for (const age of [0, 15, 16, 25, 26, 35, 36, 45, 46, 55, 56, 80, 81]) {
      for (const duration of [1, 2]) {
        const result = await quote(`${2026-age}-01-01`, duration, new Date("2026-09-24"), nationality);
        assert.equal(result.available, age <= 80);
        assert.equal(result.price, age > 80 ? null : duration === 1 ? 777 : 1444);
        assert.equal(result.nationalityRateId, undefined);
        assert.equal(result.insuranceCompanyId, undefined);
      }
    }
  }
});
test("Retired public nationality grid exposes no special prices or insurer costs", async () => {
  const route = loadTs("app/api/insurance/price/route.ts", {
    "@/lib/insurance/calculatePriceServer": {},
  });
  const response = await route.GET();
  assert.deepEqual((await response.json()).rows, []);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

function standardPolicyRoutes({ nationality = "Congo", legacy = false, duration = 1, missing = false } = {}) {
  const writes = [];
  const dossier = {
    id: "request", status: "payment_confirmed", assigned_agent_id: "agent",
    calculated_age: 30, insurance_duration_years: duration,
    created_at: "2026-09-17T12:00:00Z", quote_nationality: nationality,
    nationality_rate_id: legacy ? "old-cg-rate" : null,
    client: { nationality },
  };
  const companies = [{ id: "sky", name: "Skyline", is_active: true }, { id: "other", name: "Other", is_active: true }];
  const rates = companies.map(c => ({ id: `${c.id}-${duration}`, insurance_company_id: c.id, real_cost: duration === 1 ? 350 : 700, effective_from: "2026-09-17" }));
  const db = { from(table) {
    assert.ok(["insurance_requests", "insurance_companies", "insurance_cost_rates"].includes(table), "Unexpected special tariff lookup: " + table);
    let update, filters = [];
    const rows = table === "insurance_requests" ? [dossier] : table === "insurance_companies" ? companies : missing ? [] : rates;
    const result = single => ({ data: update ? {...dossier, ...update} : single ? rows.filter(r => filters.every(f => f(r)))[0] ?? null : rows, error: null });
    const q = {
      select() { return q; }, order() { return q; }, limit() { return q; },
      lte() { return q; }, gte() { return q; }, in() { return q; },
      eq(key, value) { if (key === "id" || key === "insurance_company_id") filters.push(r => r[key] === value); return q; },
      update(value) { update = value; writes.push(value); return q; },
      maybeSingle() { const p = Promise.resolve(result(true)); p.overrideTypes = () => p; return p; },
      then(resolve, reject) { return Promise.resolve(result(false)).then(resolve, reject); },
    };
    return q;
  }};
  const user = { id: "admin", app_metadata: { role: "admin" } };
  const mocks = {
    "@/lib/supabase/service": { createServiceClient: () => db },
    "@/lib/supabase/server": { createServerSupabaseClient: async () => ({auth:{getUser:async()=>({data:{user},error:null})}}) },
    "@/lib/auth/requireApiRole": { requireApiRole: async () => ({success:true,user}) },
    "@/lib/insurance/quoteSchema": { hasQuoteSchema: async () => true },
    "@/lib/activity/logActivity": { logActivity: async () => {} },
    "@/lib/insurance/decidePayment": { PaymentDecisionError: class extends Error {} },
  };
  return {
    writes,
    options: loadTs("app/api/admin/requests/[id]/insurance-options/route.ts", mocks),
    status: loadTs("app/api/admin/requests/[id]/status/route.ts", mocks),
  };
}
test("All nationalities and old unassigned CG quotes can choose any standard insurer at its real cost", async () => {
  for (const nationality of ["Congo", "Congolaise (Congo-Brazzaville)", "RDC", "Cameroun"])
    for (const legacy of [false, true])
      for (const duration of [1, 2]) {
        const r = standardPolicyRoutes({nationality,legacy,duration});
        const ctx = {params:Promise.resolve({id:"request"})};
        const options = await r.options.GET(new Request("http://localhost"), ctx);
        assert.deepEqual((await options.json()).insurers.map(c=>c.id), ["sky","other"]);
        const response = await r.status.POST(new Request("http://localhost", {method:"POST",body:JSON.stringify({action:"start_policy",insuranceCompanyId:"other"})}), ctx);
        assert.equal(response.status, 200);
        assert.equal(r.writes[0].insurance_cost_rate_id, `other-${duration}`);
        assert.equal(r.writes[0].actual_insurance_cost, duration === 1 ? 350 : 700);
        assert.equal(r.writes[0].nationality_rate_id, undefined);
      }
});
test("Missing standard cost cannot fall back to a retired nationality rate", async () => {
  const r = standardPolicyRoutes({legacy:true,missing:true});
  const ctx = {params:Promise.resolve({id:"request"})};
  assert.deepEqual((await (await r.options.GET(new Request("http://localhost"),ctx)).json()).insurers, []);
  const response = await r.status.POST(new Request("http://localhost", {method:"POST",body:JSON.stringify({action:"start_policy",insuranceCompanyId:"sky"})}), ctx);
  assert.equal(response.status,409);
  assert.equal(r.writes.length,0);
});
