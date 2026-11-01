const { PGlite } = require('@electric-sql/pglite');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const db = new PGlite();
 try {
 await db.exec(`create role anon; create role authenticated; create role service_role;
 create table partners(id uuid primary key, manager_name text,company_name text,whatsapp_country_code text,whatsapp_number text,is_active boolean);
 create table clients(id uuid primary key,first_name text,whatsapp_country_code text,whatsapp_number text);
 create table insurance_requests(id uuid primary key,client_id uuid,partner_id uuid,request_code text,source text,preferred_language text,status text,created_at timestamptz);
 create table payments(request_id uuid);create table uploaded_documents(request_id uuid,document_type text);`);
 await db.exec(fs.readFileSync('supabase/migrations/20261101154112_payment_reminders.sql','utf8'));
 const client=crypto.randomUUID(),partner=crypto.randomUUID();
 await db.query("insert into clients values($1,'Client','+90','111')",[client]);
 await db.query("insert into partners values($1,'Partner','Company','+90','222',true,'tr')",[partner]);
 async function seed(minutes,status='waiting_payment',source='direct') {
  const id=crypto.randomUUID();
  await db.query("insert into insurance_requests values($1,$2,$3,$4,$5,'en',$6,now()-$7*interval '1 minute')",[id,client,source==='partner'?partner:null,'TEST-'+id,source,status,minutes]);return id;
 }
 const ready=await seed(16),young=await seed(14),paid=await seed(20,'payment_review'),cancelled=await seed(20,'cancelled'),receipt=await seed(20),pay=await seed(20),old=await seed(120),pr=await seed(16,'waiting_payment','partner');
 await db.query("insert into uploaded_documents values($1,'payment_receipt')",[receipt]);await db.query('insert into payments values($1)',[pay]);
 const claim=()=>db.query("select * from claim_payment_reminders(now()-interval '60 minutes')");
 const rows=(await claim()).rows;assert.deepEqual(new Set(rows.map(r=>r.request_id)),new Set([ready,pr]));
 assert.equal((await claim()).rows.length,0);
 for (const id of [young,paid,cancelled,receipt,pay]) assert.equal((await db.query('select payment_reminder_recipient($1) r',[id])).rows[0].r,null);
 assert.equal((await db.query('select * from payment_reminders where request_id=$1',[old])).rows.length,0);
 let target=(await db.query('select payment_reminder_recipient($1) r',[pr])).rows[0].r;
 assert.equal(target.phoneNumber,'+90222');assert.equal(target.language,'tr');
 target=(await db.query('select payment_reminder_recipient($1) r',[ready])).rows[0].r;assert.equal(target.phoneNumber,'+90111');assert.equal(target.language,'en');
 await db.query("update insurance_requests set status='payment_review' where id=$1",[ready]);assert.equal((await db.query('select payment_reminder_recipient($1) r',[ready])).rows[0].r,null);
 await db.query('update partners set is_active=false where id=$1',[partner]);assert.equal((await db.query('select payment_reminder_recipient($1) r',[pr])).rows[0].r,null);
 for (const role of ['anon','authenticated']) {
  await db.exec('set role '+role);await assert.rejects(claim,e=>e.code==='42501');await assert.rejects(()=>db.query('select * from payment_reminders'),e=>e.code==='42501');await db.exec('reset role');
 }
 console.log('Payment reminders: 15-minute threshold, no backlog, deduplication, receipt/payment/cancellation exclusions, recipient language, recheck and permissions passed.');
 } finally { await db.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
