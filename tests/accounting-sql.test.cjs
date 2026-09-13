const { PGlite } = require("@electric-sql/pglite");
const { btree_gist } = require("@electric-sql/pglite/contrib/btree_gist");
const fs = require("fs"),
  assert = require("node:assert/strict");
const schema = JSON.parse(
  fs.readFileSync(require("path").join(__dirname, "fixtures/accounting-schema.json"), "utf8"),
);
const migration = fs.readFileSync(
  require("path").join(__dirname, "../supabase/migrations/202609130001_accounting_integrity.sql"),
  "utf8",
);
const results = [];
const actor = "10000000-0000-4000-8000-000000000001";
async function setup() {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec("create role anon; create role authenticated; create role service_role;");
  for (const [table, def] of Object.entries(schema)) {
    const cols = Object.entries(def.properties).map(
      ([name, v]) =>
        `"${name}" ${v.format}${name === "id" ? " primary key default gen_random_uuid()" : name === "created_at" || name === "updated_at" ? " default now()" : ""}${def.required?.includes(name) && name !== "id" ? " not null" : ""}`,
    );
    await db.exec(`create table public.${table} (${cols.join(",")});`);
  }
  return db;
}
(async () => {
  const db = await setup();
  await db.exec(migration);
  results.push("Migration complète exécutée sur PostgreSQL isolé avec les types du schéma distant");
  const call = async (action, payload) =>
    (
      await db.query("select public.accounting_write($1,$2::jsonb,$3::uuid) as result", [
        action,
        JSON.stringify(payload),
        actor,
      ])
    ).rows[0].result;
  const c = await call("create_company", {
    name: "Test",
    isActive: true,
    operationId: crypto.randomUUID(),
  });
  const id = c.company.id;
  const base = {
    insuranceCompanyId: id,
    amount: 100.25,
    depositDate: "2026-09-13",
    operationId: crypto.randomUUID(),
    reference: "REF",
  };
  const d1 = await call("deposit", base),
    d2 = await call("deposit", base);
  assert.equal(d1.deposit.id, d2.deposit.id);
  assert.equal(
    (await db.query("select count(*)::int as n from insurance_company_deposits")).rows[0].n,
    1,
  );
  results.push("Répéter un dépôt restitue le même identifiant sans seconde insertion");
  await assert.rejects(call("deposit", { ...base, amount: 200 }), (e) => e.code === "40001");
  results.push("Réutiliser une opération avec un autre montant est refusé");
  await call("create_rates", {
    insuranceCompanyId: id,
    effectiveFrom: "2026-09-13",
    operationId: crypto.randomUUID(),
    rows: [{ minAge: 20, maxAge: 30, oneYearCost: 80, twoYearCost: 150 }],
  });
  await assert.rejects(
    call("create_rates", {
      insuranceCompanyId: id,
      effectiveFrom: "2026-09-13",
      operationId: crypto.randomUUID(),
      rows: [
        { minAge: 40, maxAge: 50, oneYearCost: 80, twoYearCost: 150 },
        { minAge: 25, maxAge: 35, oneYearCost: 80, twoYearCost: 150 },
      ],
    }),
    (e) => e.code === "23P01",
  );
  assert.equal(
    (await db.query("select count(*)::int as n from insurance_cost_rates")).rows[0].n,
    2,
  );
  results.push("Chevauchement refusé et tout le lot annulé, y compris les lignes précédentes");
  let rate = (
    await db.query(
      "select *,updated_at::text as version from insurance_cost_rates where duration_years=1",
    )
  ).rows[0];
  const update = {
    id: rate.id,
    minAge: 20,
    maxAge: 30,
    realCost: 90,
    effectiveFrom: "2026-09-13",
    isActive: false,
    version: rate.version,
  };
  await call("update_rate", update);
  let history = await db.query("select * from insurance_cost_rate_history");
  assert.equal(history.rows.length, 1);
  assert.equal(Number(history.rows[0].real_cost), 80);
  assert.equal(history.rows[0].changed_by, actor);
  results.push("Modification et désactivation historisées avec le bon auteur");
  await assert.rejects(call("update_rate", update), (e) => e.code === "40001");
  assert.equal(
    (await db.query("select count(*)::int as n from insurance_cost_rate_history")).rows[0].n,
    1,
  );
  results.push("Version périmée refusée sans fausse ligne d’historique");
  await call("create_rates", {
    insuranceCompanyId: id,
    effectiveFrom: "2026-09-13",
    operationId: crypto.randomUUID(),
    rows: [{ minAge: 21, maxAge: 29, oneYearCost: 60, twoYearCost: 120 }],
  }).catch((e) => {
    assert.equal(e.code, "23P01");
  });
  // Add an overlapping inactive 1-year row, then prove activation is guarded.
  await db.query(
    "insert into insurance_cost_rates(insurance_company_id,min_age,max_age,duration_years,real_cost,effective_from,is_active) values($1,21,29,1,60,$2,false)",
    [id, "2026-09-13"],
  );
  rate = (
    await db.query("select *,updated_at::text as version from insurance_cost_rates where id=$1", [
      rate.id,
    ])
  ).rows[0];
  await call("update_rate", { ...update, version: rate.version, isActive: true });
  const other = (
    await db.query(
      "select *,updated_at::text as version from insurance_cost_rates where min_age=21",
    )
  ).rows[0];
  const before = (await db.query("select count(*)::int as n from insurance_cost_rate_history"))
    .rows[0].n;
  await assert.rejects(
    call("update_rate", {
      id: other.id,
      minAge: 21,
      maxAge: 29,
      realCost: 60,
      effectiveFrom: "2026-09-13",
      isActive: true,
      version: other.version,
    }),
    (e) => e.code === "23P01",
  );
  assert.equal(
    (await db.query("select count(*)::int as n from insurance_cost_rate_history")).rows[0].n,
    before,
  );
  results.push("Réactivation avec chevauchement refusée et historique annulé atomiquement");
  await db.exec("set role anon");
  await assert.rejects(
    call("deposit", { ...base, operationId: crypto.randomUUID() }),
    (e) => e.code === "42501",
  );
  await db.exec("reset role");
  results.push("RPC inaccessible au rôle anonyme");
  await assert.rejects(
    call("create_company", { name: " test ", isActive: true, operationId: crypto.randomUUID() }),
    (e) => e.code === "23505",
  );
  results.push("Noms assureurs normalisés protégés en base");
  await db.close();
  const bad = await setup();
  await bad.exec(
    `insert into insurance_companies(id,name,is_active) values('${actor}','A',true);insert into insurance_cost_rates(insurance_company_id,min_age,max_age,duration_years,real_cost,effective_from,is_active) values('${actor}',20,30,1,1,'2026-01-01',true),('${actor}',25,35,1,1,'2026-01-01',true);`,
  );
  await assert.rejects(bad.exec(migration));
  await bad.exec("rollback");
  assert.equal(
    (
      await bad.query(
        "select count(*)::int as n from pg_tables where tablename='accounting_operations'",
      )
    ).rows[0].n,
    0,
  );
  await bad.close();
  results.push(
    "Précontrôle : migration entièrement annulée si des chevauchements historiques existent",
  );
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => {
  console.error(e.message, e.code);
  process.exitCode = 1;
});
