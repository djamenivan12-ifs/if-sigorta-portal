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
              ? [{ id: "sky", name: "Skyline", is_active: true }]
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

test("Public quote applies client price and names the frozen Skyline rate", async () => {
  const rates = make();
  const { calculateInsurancePriceServer } = loadTs(
    "lib/insurance/calculatePriceServer.ts",
    {
      "./nationalityRates": rates,
      "@/lib/supabase/service": {
        createServiceClient() {
          throw Error("Generic grid should not be used");
        },
      },
    },
  );
  const result = await calculateInsurancePriceServer(
    "1996-01-01",
    1,
    new Date("2026-09-17"),
    "Congo",
  );
  assert.equal(result.price, 650);
  assert.equal(result.insuranceCompanyId, "sky");
  assert.equal(result.nationalityRateId, "rate-2");
  assert.equal(result.available, true);
});
test("Public client grid excludes all insurer costs", async () => {
  const route = loadTs("app/api/insurance/price/route.ts", {
    "@/lib/insurance/nationalityRates": {
      skylineNationalityGrid: async () => grid,
    },
    "@/lib/insurance/calculatePriceServer": {},
  });
  const body = await (await route.GET()).json();
  assert.equal(body.rows.length, 5);
  assert.equal(body.rows[2].oneYearPrice, 650);
  assert.equal(JSON.stringify(body).includes("cost"), false);
});
