const { PGlite } = require("@electric-sql/pglite");
const { btree_gist } = require("@electric-sql/pglite/contrib/btree_gist");
const fs = require("fs"),
  assert = require("node:assert/strict");
const schema = JSON.parse(
  fs.readFileSync(
    require("path").join(__dirname, "fixtures/accounting-schema.json"),
    "utf8",
  ),
);
const migration = fs.readFileSync(
  require("path").join(
    __dirname,
    "../supabase/migrations/202609130001_accounting_integrity.sql",
  ),
  "utf8",
);
const results = [];
const actor = "10000000-0000-4000-8000-000000000001";
async function setup() {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(
    "create role anon; create role authenticated; create role service_role;",
  );
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
  await db.exec(
    "insert into insurance_companies(name,is_active) values('Skyline Sigorta',true)",
  );
  await db.exec(
    fs.readFileSync(
      require("path").join(
        __dirname,
        "../supabase/migrations/202609170001_withdrawals_skyline.sql",
      ),
      "utf8",
    ),
  );
  results.push(
    "Migration complète exécutée sur PostgreSQL isolé avec les types du schéma distant",
  );
  const call = async (action, payload) =>
    (
      await db.query(
        "select public.accounting_write($1,$2::jsonb,$3::uuid) as result",
        [action, JSON.stringify(payload), actor],
      )
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
    (
      await db.query(
        "select count(*)::int as n from insurance_company_deposits",
      )
    ).rows[0].n,
    1,
  );
  results.push(
    "Répéter un dépôt restitue le même identifiant sans seconde insertion",
  );
  await assert.rejects(
    call("deposit", { ...base, amount: 200 }),
    (e) => e.code === "40001",
  );
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
    (await db.query("select count(*)::int as n from insurance_cost_rates"))
      .rows[0].n,
    2,
  );
  results.push(
    "Chevauchement refusé et tout le lot annulé, y compris les lignes précédentes",
  );
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
    (
      await db.query(
        "select count(*)::int as n from insurance_cost_rate_history",
      )
    ).rows[0].n,
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
    await db.query(
      "select *,updated_at::text as version from insurance_cost_rates where id=$1",
      [rate.id],
    )
  ).rows[0];
  await call("update_rate", {
    ...update,
    version: rate.version,
    isActive: true,
  });
  const other = (
    await db.query(
      "select *,updated_at::text as version from insurance_cost_rates where min_age=21",
    )
  ).rows[0];
  const before = (
    await db.query("select count(*)::int as n from insurance_cost_rate_history")
  ).rows[0].n;
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
    (
      await db.query(
        "select count(*)::int as n from insurance_cost_rate_history",
      )
    ).rows[0].n,
    before,
  );
  results.push(
    "Réactivation avec chevauchement refusée et historique annulé atomiquement",
  );
  await db.exec("set role anon");
  await assert.rejects(
    call("deposit", { ...base, operationId: crypto.randomUUID() }),
    (e) => e.code === "42501",
  );
  await db.exec("reset role");
  results.push("RPC inaccessible au rôle anonyme");
  await assert.rejects(
    call("create_company", {
      name: " test ",
      isActive: true,
      operationId: crypto.randomUUID(),
    }),
    (e) => e.code === "23505",
  );
  results.push("Noms assureurs normalisés protégés en base");

  const withdrawal = {
    insuranceCompanyId: id,
    amount: 30.25,
    withdrawalDate: "2026-09-17",
    reason: "Retrait de test",
    operationId: crypto.randomUUID(),
  };
  const w = await call("withdrawal", withdrawal);
  assert.equal(
    (await call("withdrawal", withdrawal)).withdrawal.id,
    w.withdrawal.id,
  );
  await assert.rejects(
    call("withdrawal", {
      ...withdrawal,
      amount: 90,
      operationId: crypto.randomUUID(),
    }),
    (e) => e.code === "P0001",
  );
  const cancelled = await call("cancel_withdrawal", {
    id: w.withdrawal.id,
    operationId: crypto.randomUUID(),
  });
  assert.ok(cancelled.withdrawal.cancelled_at);
  assert.equal(
    (
      await call("cancel_withdrawal", {
        id: w.withdrawal.id,
        operationId: crypto.randomUUID(),
      })
    ).withdrawal.cancelled_at,
    cancelled.withdrawal.cancelled_at,
  );
  await assert.rejects(
    call("withdrawal", {
      ...withdrawal,
      withdrawalDate: "2999-01-01",
      operationId: crypto.randomUUID(),
    }),
    (e) => e.code === "22023",
  );
  const grid = (
    await db.query("select * from insurance_nationality_rates order by min_age")
  ).rows;
  assert.equal(grid.length, 5);
  assert.equal(Number(grid[4].one_year_cost), 722.5);
  assert.equal(Number(grid[4].one_year_price), 850);
  await assert.rejects(
    db.exec("update insurance_nationality_rates set one_year_cost=999"),
    (e) => e.code === "22023",
  );

  const rateCG = grid[2];
  const fields = {};
  for (const name of schema.insurance_requests.required) {
    const kind = schema.insurance_requests.properties[name].format;
    fields[name] =
      kind === "uuid"
        ? crypto.randomUUID()
        : kind === "boolean"
          ? false
          : kind === "integer"
            ? 1
            : kind === "numeric"
              ? 650
              : kind === "timestamp with time zone"
                ? "2026-09-17T12:00:00Z"
                : "test";
  }
  Object.assign(fields, {
    insurance_company_id: rateCG.insurance_company_id,
    calculated_age: 30,
    insurance_duration_years: 1,
    actual_insurance_cost: 510,
    status: "policy_preparation",
    insurance_company_selected_at: "2026-09-17T12:00:00Z",
    nationality_rate_id: rateCG.id,
    quote_nationality: "Congo",
  });
  const names = Object.keys(fields),
    params = Object.values(fields);
  await db.query(
    "insert into insurance_requests(" +
      names.join(",") +
      ") values(" +
      names.map((_, i) => "$" + (i + 1)).join(",") +
      ")",
    params,
  );
  await assert.rejects(
    db.query(
      "update insurance_requests set actual_insurance_cost=650 where id=$1",
      [fields.id],
    ),
    (e) => e.code === "22023",
  );
  await assert.rejects(
    db.query("update insurance_requests set calculated_price=510 where id=$1", [
      fields.id,
    ]),
    (e) => e.code === "22023",
  );
  await call("deposit", {
    insuranceCompanyId: rateCG.insurance_company_id,
    amount: 600,
    depositDate: "2026-09-17",
    operationId: crypto.randomUUID(),
  });
  await assert.rejects(
    call("withdrawal", {
      ...withdrawal,
      insuranceCompanyId: rateCG.insurance_company_id,
      amount: 100,
      operationId: crypto.randomUUID(),
    }),
    (e) => e.code === "P0001",
  );
  await call("withdrawal", {
    ...withdrawal,
    insuranceCompanyId: rateCG.insurance_company_id,
    amount: 90,
    operationId: crypto.randomUUID(),
  });
  results.push(
    "Coût 510 et prix client 650 vérifiés indépendamment en base, réservations de police prises en compte dans le disponible",
  );
  await db.exec("set role anon");
  await assert.rejects(
    db.exec("select * from insurance_company_withdrawals"),
    (e) => e.code === "42501",
  );
  await assert.rejects(
    call("withdrawal", { ...withdrawal, operationId: crypto.randomUUID() }),
    (e) => e.code === "42501",
  );
  await db.exec("reset role");
  results.push(
    "Retraits et annulations idempotents, dépassement et dates futures refusés, grille Skyline exacte et immuable, accès anonyme interdit",
  );
  // Upgrade existing historical and unassigned Congo dossiers without rewriting them.
  const pendingId = crypto.randomUUID();
  await db.query(`insert into insurance_requests (${names.join(",")}) values (${names.map((_, i) => "$" + (i + 1)).join(",")})`,
    names.map(name => name === "id" ? pendingId : name === "insurance_company_id" || name === "actual_insurance_cost" || name === "insurance_company_selected_at" ? null : name === "status" ? "payment_confirmed" : fields[name]));
  const guards = fs.readFileSync(require("path").join(__dirname, "../supabase/migrations/202609170007_admin_functional_guards.sql"), "utf8");
  const functionStart = guards.indexOf("CREATE FUNCTION public.create_nationality_grid");
  await db.exec(guards.slice(functionStart, guards.indexOf("END $$;", functionStart) + 7));
  await db.exec("revoke all on function create_nationality_grid(uuid,uuid,date,date,jsonb) from public; grant execute on function create_nationality_grid(uuid,uuid,date,date,jsonb) to service_role;");
  const beforeRetirement = (await db.query("select * from insurance_requests order by id")).rows;
  await db.exec(fs.readFileSync(require("path").join(__dirname, "../supabase/migrations/202609240001_retire_nationality_pricing.sql"), "utf8"));
  assert.deepEqual((await db.query("select * from insurance_requests order by id")).rows, beforeRetirement);
  assert.equal((await db.query("select has_function_privilege('service_role','create_nationality_grid(uuid,uuid,date,date,jsonb)','execute') as allowed")).rows[0].allowed, false);
  // Existing frozen cost is preserved while its workflow can still progress.
  await db.query("update insurance_requests set status='policy_available' where id=$1", [fields.id]);
  await assert.rejects(db.query("update insurance_requests set actual_insurance_cost=1 where id=$1", [fields.id]), e => e.code === "22023");
  const standard = (await db.query("select * from insurance_cost_rates where insurance_company_id=$1 and duration_years=1 and min_age<=30 and max_age>=30 and is_active order by effective_from desc,created_at desc limit 1", [id])).rows[0];
  assert.ok(standard);
  await assert.rejects(db.query("update insurance_requests set insurance_company_id=$1, insurance_cost_rate_id=$2, actual_insurance_cost=999 where id=$3", [id, standard.id, pendingId]), e => e.code === "22023");
  await db.query("update insurance_requests set insurance_company_id=$1, insurance_cost_rate_id=$2, actual_insurance_cost=$3, status='policy_preparation' where id=$4", [id, standard.id, standard.real_cost, pendingId]);
  const pending = (await db.query("select * from insurance_requests where id=$1", [pendingId])).rows[0];
  assert.equal(pending.insurance_company_id, id);
  assert.equal(pending.insurance_cost_rate_id, standard.id);
  assert.equal(Number(pending.actual_insurance_cost), Number(standard.real_cost));
  assert.equal(pending.nationality_rate_id, rateCG.id); // Original client quote remains historical.
  await assert.rejects(db.query(`insert into insurance_requests (${names.join(",")}) values (${names.map((_, i) => "$" + (i + 1)).join(",")})`, names.map(name => name === "id" ? crypto.randomUUID() : fields[name])), e => e.code === "22023");
  await db.query(`insert into insurance_requests (${names.join(",")}) values (${names.map((_, i) => "$" + (i + 1)).join(",")})`, names.map(name => name === "id" ? crypto.randomUUID() : name === "nationality_rate_id" ? null : name === "calculated_price" ? 777 : fields[name]));
  results.push("Retrait de la règle : nouveaux devis standard, anciens montants conservés, dossiers non assignés au coût standard de tout assureur, anciennes grilles désactivées");
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
