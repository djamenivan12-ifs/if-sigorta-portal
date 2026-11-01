const test=require('node:test'),assert=require('node:assert/strict');const {loadTs}=require('./load-ts.cjs');
test('Reminder worker authenticates, stays disabled without activation, rechecks and records failures without retry',async()=>{
 const keys=['PAYMENT_REMINDER_CRON_SECRET','PAYMENT_REMINDERS_ENABLED_FROM','WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID'];const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 let claims=0,sends=0,recipient=null,sendFailure=false;const outcomes=[];
 const db={rpc:async name=>name==='claim_payment_reminders'?(claims++,{data:[{request_id:'r',token:'t'}]}):{data:recipient},from(){const q={update(v){outcomes.push(v.status);return q},eq(){return q},select(){return q},maybeSingle:async()=>({data:{request_id:'r'}})};return q}};
 const route=loadTs('app/api/cron/payment-reminders/route.ts',{'@/lib/supabase/service':{createServiceClient:()=>db},'@/lib/whatsapp/sendPaymentReminder':{sendPaymentReminder:async()=>{sends++;if(sendFailure)throw Error('timeout');return 'meta-id'}}});
 const run=token=>route.POST(new Request('https://example.test/api/cron/payment-reminders',{method:'POST',headers:{authorization:token}}));
 try{
 process.env.PAYMENT_REMINDER_CRON_SECRET='test-secret';delete process.env.PAYMENT_REMINDERS_ENABLED_FROM;
 assert.equal((await run('wrong')).status,401);assert.equal(claims,0);
 assert.equal((await (await run('Bearer test-secret')).json()).enabled,false);assert.equal(claims,0);
 process.env.PAYMENT_REMINDERS_ENABLED_FROM='2026-11-01T12:00:00Z';process.env.WHATSAPP_ACCESS_TOKEN='mock';process.env.WHATSAPP_PHONE_NUMBER_ID='mock';
 await run('Bearer test-secret');assert.equal(sends,0);assert.equal(outcomes.at(-1),'skipped');
 recipient={phoneNumber:'+90111'};await run('Bearer test-secret');assert.equal(sends,1);assert.equal(outcomes.at(-1),'sent');
 sendFailure=true;await run('Bearer test-secret');assert.equal(sends,2);assert.equal(outcomes.at(-1),'failed');
 }finally{for(const k of keys)if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k];}
});
