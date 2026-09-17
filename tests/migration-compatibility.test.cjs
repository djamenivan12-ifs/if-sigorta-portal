const test = require("node:test"),
  assert = require("node:assert/strict");
const { loadTs } = require("./load-ts.cjs");
const { readAccountingRows } = loadTs("lib/accounting/readRows.ts");
const { accounting } = loadTs("lib/accounting/model.ts");
const { hasQuoteSchema } = loadTs("lib/insurance/quoteSchema.ts");
const { isSkyline } = loadTs("lib/insurance/nationality.ts");
test("Only the two optional new tables tolerate a missing relation", async () => {
  for (const table of [
    "insurance_company_withdrawals",
    "insurance_nationality_rates",
  ])
    for (const code of ["PGRST205", "42P01"])
      assert.deepEqual(
        await readAccountingRows(table, async () => ({
          data: null,
          error: { code, message: "missing" },
        })),
        { data: [], missing: true },
      );
  await assert.rejects(
    readAccountingRows("payments", async () => ({
      data: null,
      error: { code: "PGRST205", message: "missing" },
    })),
  );
});
test("Permissions and network failures never become empty accounting data", async () => {
  for (const code of ["42501", "08006"])
    await assert.rejects(
      readAccountingRows("insurance_company_withdrawals", async () => ({
        data: null,
        error: { code, message: "failed" },
      })),
    );
});
test("An unavailable withdrawal journal prevents a misleading insurer balance", () => {
  const data = {
    companies: [],
    rates: [],
    deposits: [
      { insurance_company_id: "a", amount: 1000, deposit_date: "2026-09-01" },
    ],
    payments: [],
    requests: [],
    history: [],
    authors: {},
    loadedAt: "2026-09-17",
    missingTables: ["insurance_company_withdrawals"],
  };
  const report = accounting(data, { from: "", to: "", company: "" });
  assert.equal(report.cumulativeDeposits, 100000);
  assert.equal(report.balance, null);
  assert.equal(report.cumulativeWithdrawals, null);
});
test("Quote compatibility distinguishes missing optional columns from a service failure", async () => {
  const db = (error) => ({
    from() {
      const q = {
        select() {
          return q;
        },
        limit() {
          return Promise.resolve({ error });
        },
      };
      return q;
    },
  });
  assert.equal(await hasQuoteSchema(db(null)), true);
  for (const code of ["42703", "PGRST204"])
    assert.equal(await hasQuoteSchema(db({ code })), false);
  await assert.rejects(hasQuoteSchema(db({ code: "42501" })));
});
test("Existing Skyline Sigorta name matches without accepting another insurer", () => {
  for (const name of ["Skyline", "Skyline Sigorta", " SKYLINE SIGORTA "])
    assert.equal(isSkyline(name), true);
  assert.equal(isSkyline("Itqan Sigorta"), false);
  assert.equal(isSkyline("Fake Skyline"), false);
});
