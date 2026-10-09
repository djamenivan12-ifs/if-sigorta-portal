const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const read = name => fs.readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8');
const fix = read('20261009115343_business_conflicts_no_retry.sql');

(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role service_role;
      create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key, raw_app_meta_data jsonb);
      create table public.partners(id uuid primary key, auth_user_id uuid, is_active boolean);
      create table public.partner_request_drafts(partner_id uuid primary key, payload jsonb, version bigint, updated_at timestamptz, expires_at timestamptz);
      insert into auth.users values ('10000000-0000-4000-8000-000000000001','{"role":"partner"}');
      insert into partners values ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',true);
    `);
    const historical = read('202609170005_partner_submission_drafts.sql');
    const start = historical.indexOf('CREATE FUNCTION public.save_partner_draft(');
    const end = historical.indexOf('END $$;',start) + 'END $$;'.length;
    assert.ok(start >= 0 && end > start);
    await db.exec(historical.slice(start,end));
    await db.exec(`revoke all on function public.save_partner_draft(uuid,uuid,bigint,jsonb) from public;
      grant execute on function public.save_partner_draft(uuid,uuid,bigint,jsonb) to service_role;
      create function public.unrelated_serialization() returns void language plpgsql as $$begin raise exception using errcode='40001',message='Not a business conflict';end$$;
    `);
    const definition = async () => (await db.query("select pg_get_functiondef('public.save_partner_draft(uuid,uuid,bigint,jsonb)'::regprocedure) as definition, proacl::text as acl, proowner, prosecdef, proconfig from pg_proc where oid='public.save_partner_draft(uuid,uuid,bigint,jsonb)'::regprocedure")).rows[0];
    const before = await definition();
    await db.exec(fix);
    const after = await definition();
    assert.equal(after.definition, before.definition.replace(/(errcode\s*=\s*)'40001'/gi,"$1'PT409'"));
    for (const key of ['acl','proowner','prosecdef','proconfig']) assert.deepEqual(after[key],before[key]);
    await db.exec(fix);
    assert.deepEqual(await definition(),after);
    const draft = version => db.query("select public.save_partner_draft('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',$1,'{\"firstName\":\"TEST\"}') as version",[version]);
    assert.equal((await draft(0)).rows[0].version,1);
    await assert.rejects(()=>draft(0),error=>error.code==='PT409');
    assert.equal((await db.query('select version from partner_request_drafts')).rows[0].version,1);
    assert.equal((await draft(1)).rows[0].version,2);
    await assert.rejects(()=>db.query('select unrelated_serialization()'),error=>error.code==='40001');
    await db.exec('set role authenticated');
    await assert.rejects(()=>draft(2),error=>error.code==='42501');
    await db.exec('reset role');
    console.log('PASS: real draft function returns PT409 on stale version; fresh writes succeed; grants and settings preserved; migration idempotent; unrelated serialization errors untouched.');
  } finally { await db.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
