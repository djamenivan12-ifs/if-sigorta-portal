const test = require("node:test"),
  assert = require("node:assert/strict");
const { loadTs } = require("./load-ts.cjs");
const { accounting, cents, day, csv } = loadTs("lib/accounting/model.ts");
const { ratesBody, depositBody, rateBody } = loadTs("lib/accounting/validation.ts");
const id = "10000000-0000-4000-8000-000000000001",
  operationId = "20000000-0000-4000-8000-000000000002";
const empty = () => ({
  companies: [],
  rates: [],
  history: [],
  authors: {},
  loadedAt: "2026-09-13",
  deposits: [],
  requests: [],
  payments: [],
});
const req = (id, cost = 100) => ({
  id,
  request_code: id,
  insurance_company_id: "a",
  status: "policy_available",
  actual_insurance_cost: cost,
  insurance_company_selected_at: "2026-09-01T12:00:00Z",
  calculated_age: 27,
  insurance_duration_years: 1,
});
const pay = (id) => ({
  id,
  request_id: id,
  expected_amount: 200,
  status: "confirmed",
  verified_at: "2026-09-01T12:00:00Z",
});
const all = { from: "", to: "", company: "" };
test("accounting: missing cost blocks profit and estimated balance", () => {
  const r = accounting({ ...empty(), requests: [req("x", null)], payments: [pay("x")] }, all);
  assert.equal(r.profit, null);
  assert.equal(r.balance, null);
  assert.equal(r.collected, 20000);
  assert.equal(r.missingCosts, 1);
});
test("accounting: consumed cost and balance use the same complete population", () => {
  const r = accounting(
    {
      ...empty(),
      requests: [req("a"), req("b", 60)],
      payments: [pay("a")],
      deposits: [{ amount: 1000, deposit_date: "2026-09-01" }],
    },
    all,
  );
  assert.equal(r.consumed, 16000);
  assert.equal(r.balance, 84000);
  assert.equal(r.cost, 10000);
});
test("accounting: company and confirmation-date filters preserve boundaries", () => {
  const r = accounting(
    {
      ...empty(),
      requests: [req("a")],
      payments: [
        { ...pay("a"), verified_at: "2026-08-31T22:30:00Z" },
        { ...pay("a"), id: "other", verified_at: "2026-08-31T12:00:00Z" },
      ],
    },
    { from: "2026-09-01", to: "2026-09-01", company: "a" },
  );
  assert.equal(r.collected, 20000);
  assert.equal(day("2026-08-31T22:30:00Z"), "2026-09-01");
});
test("accounting: rejected payments excluded and cancelled payments flagged", () => {
  const r = accounting(
    {
      ...empty(),
      requests: [{ ...req("x"), status: "cancelled" }],
      payments: [pay("x"), { ...pay("x"), id: "rejected", status: "rejected" }],
    },
    all,
  );
  assert.equal(r.collected, 20000);
  assert.equal(r.revenue, 0);
  assert.equal(r.anomalies.length, 1);
});
test("accounting: a dossier cost is subtracted only once for multiple receipts", () => {
  const r = accounting(
    { ...empty(), requests: [req("x")], payments: [pay("x"), { ...pay("x"), id: "second" }] },
    all,
  );
  assert.equal(r.cost, 10000);
  assert.equal(r.profit, 30000);
});
test("accounting: historical age group is independent of mutable rate definitions", () => {
  const r = accounting(
    {
      ...empty(),
      requests: [req("x")],
      payments: [pay("x")],
      rates: [{ min_age: 90, max_age: 99 }],
    },
    all,
  );
  assert.equal(r.realized[0].ageGroup, "20–29 ans");
});
test("accounting: dated balance with an undated consumed cost is incomplete", () => {
  const r = accounting(
    { ...empty(), requests: [{ ...req("x"), insurance_company_selected_at: null }] },
    { ...all, to: "2026-09-13" },
  );
  assert.equal(r.balance, null);
});
test("accounting: decimal amounts are computed in minor units", () => {
  assert.equal(cents("0.29"), 29);
  assert.equal(cents(null), null);
  assert.equal(cents(""), null);
  assert.equal(cents(Infinity), null);
});
test("accounting: empty and overlapping age bands rejected before mutation", () => {
  const base = { insuranceCompanyId: id, operationId, effectiveFrom: "2026-09-13" };
  for (const rows of [
    [{ minAge: "", maxAge: "", oneYearCost: "", twoYearCost: "" }],
    [
      { minAge: 0, maxAge: 20, oneYearCost: 0, twoYearCost: 0 },
      { minAge: 20, maxAge: 30, oneYearCost: 10, twoYearCost: 20 },
    ],
  ])
    assert.throws(() => ratesBody({ ...base, rows }));
  assert.equal(
    ratesBody({ ...base, rows: [{ minAge: 0, maxAge: 20, oneYearCost: 0, twoYearCost: 0 }] })
      .rows[0].oneYearCost,
    0,
  );
});
test("accounting: invalid dates, monetary precision and missing operation IDs rejected", () => {
  const b = { insuranceCompanyId: id, operationId, amount: 100, depositDate: "2026-09-13" };
  for (const change of [
    { depositDate: "2026-02-31" },
    { amount: 100.123 },
    { operationId: null },
    { amount: "100" },
  ])
    assert.throws(() => depositBody({ ...b, ...change }));
  assert.equal(depositBody(b).amount, 100);
});
test("accounting: rate change requires a version and an actual boolean", () => {
  const b = {
    minAge: 20,
    maxAge: 30,
    realCost: 80,
    effectiveFrom: "2026-09-13",
    isActive: true,
    version: "2026-09-01T12:00:00Z",
  };
  assert.throws(() => rateBody({ ...b, version: undefined }));
  assert.throws(() => rateBody({ ...b, isActive: "false" }));
  assert.equal(rateBody(b).isActive, true);
});
test("accounting: CSV preserves quoting and neutralizes spreadsheet formulas", () => {
  const result = csv([["=1+1", '"quoted"', "a;b", "\n@SUM(A1)"]]);
  assert.match(result, /'=1\+1/);
  assert.match(result, /""quoted""/);
  assert.match(result, /'\n@SUM/);
});
test("accounting API: authentication failure prevents any RPC", async () => {
  let called = false;
  const { accountingMutation } = loadTs("lib/accounting/api.ts", {
    "next/cache": { revalidatePath: () => {} },
    "@/lib/auth/requireApiRole": {
      requireApiRole: async () => ({
        success: false,
        response: new Response("{}", { status: 403 }),
      }),
    },
    "@/lib/supabase/service": {
      createServiceClient: () => {
        called = true;
      },
    },
  });
  const response = await accountingMutation(
    new Request("http://localhost", { method: "POST", body: "{}" }),
    "deposit",
    () => ({}),
  );
  assert.equal(response.status, 403);
  assert.equal(called, false);
});
test("accounting loader: every table is read past a simulated API row cap", async () => {
  const hits = {};
  const db = {
    from(table) {
      return {
        select() {
          return this;
        },
        order() {
          return this;
        },
        range(from) {
          hits[table] = (hits[table] || 0) + 1;
          return Promise.resolve({ data: from < 2 ? [{ id: table + from }] : [], error: null });
        },
      };
    },
  };
  const { loadAccounting } = loadTs("lib/accounting/load.ts", {
    "@/lib/supabase/service": { createServiceClient: () => db },
    "@/lib/supabase/listAllUsers": {
      listAllUsers: async () => ({ data: { users: [] }, error: null }),
    },
  });
  const r = await loadAccounting();
  assert.equal(r.payments.length, 2);
  assert.equal(r.deposits.length, 2);
  assert.ok(Object.values(hits).every((n) => n === 3));
});

test("withdrawals reduce only the selected insurer balance and preserve historical cancellations",()=>{
  const data = empty(); data.loadedAt="2026-09-20";
  data.deposits=[{id:"d",insurance_company_id:"a",amount:1000,deposit_date:"2026-09-01"}];
  data.requests=[req("r",510)];
  data.withdrawals=[{id:"w",insurance_company_id:"a",amount:100.25,withdrawal_date:"2026-09-17",cancelled_at:"2026-09-19T12:00:00Z"},{id:"other",insurance_company_id:"b",amount:10,withdrawal_date:"2026-09-17",cancelled_at:null}];
  assert.equal(accounting(data,{...all,company:"a",to:"2026-09-18"}).balance,38975);
  assert.equal(accounting(data,{...all,company:"a"}).balance,49000);
  assert.equal(accounting(data,{...all,company:"a",to:"2026-09-16"}).balance,49000);
});
