const test=require('node:test'),assert=require('node:assert/strict');const {loadTs}=require('./load-ts.cjs');
test('Template setup: expiry, authorization, fixed templates, account binding, idempotence and sanitized errors',async()=>{
 const keys=['WHATSAPP_TEMPLATE_SETUP_SECRET','WHATSAPP_TEMPLATE_SETUP_UNTIL','WHATSAPP_BUSINESS_ACCOUNT_ID','WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID'];const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const originalFetch=global.fetch;let calls=[],mode='missing';
 global.fetch=async(url,opts)=>{calls.push({url,opts});if(mode==='error')return Response.json({error:{code:190,message:'secret'}},{status:401});if(url.includes('/phone_numbers'))return Response.json({data:[{id:mode==='wrong'?'other':'phone'}]});if(opts.method==='POST')return Response.json({id:'template',status:'PENDING',category:'UTILITY'});return Response.json({data:mode==='exists'?[{name:'payment_reminder_fr',language:'fr',id:'template',status:'APPROVED',components:[]}]:[]});};
 const route=loadTs('app/api/maintenance/whatsapp-templates/route.ts');const run=(body={name:'payment_reminder_fr',create:false},auth='Bearer setup')=>route.POST(new Request('https://example.test',{method:'POST',headers:{authorization:auth},body:JSON.stringify(body)}));
 try{
 process.env.WHATSAPP_TEMPLATE_SETUP_SECRET='setup';process.env.WHATSAPP_TEMPLATE_SETUP_UNTIL='2000-01-01';assert.equal((await run()).status,404);assert.equal(calls.length,0);
 process.env.WHATSAPP_TEMPLATE_SETUP_UNTIL=new Date(Date.now()+60000).toISOString();assert.equal((await run(undefined,'wrong')).status,401);assert.equal((await run({name:'arbitrary',create:true})).status,400);assert.equal(calls.length,0);
 process.env.WHATSAPP_BUSINESS_ACCOUNT_ID='123';process.env.WHATSAPP_ACCESS_TOKEN='secret';process.env.WHATSAPP_PHONE_NUMBER_ID='phone';
 mode='wrong';assert.equal((await run()).status,409);assert.equal(calls.length,1);
 mode='missing';assert.equal((await (await run()).json()).status,'MISSING');assert.equal(calls.filter(x=>x.opts.method==='POST').length,0);
 const created=await (await run({name:'payment_reminder_fr',create:true})).json();assert.equal(created.status,'PENDING');const posted=JSON.parse(calls.at(-1).opts.body);assert.equal(posted.category,'UTILITY');assert.equal(posted.components[0].example.body_text[0].length,3);
 mode='exists';calls=[];assert.equal((await (await run({name:'payment_reminder_fr',create:true})).json()).status,'APPROVED');assert.equal(calls.filter(x=>x.opts.method==='POST').length,0);
 mode='error';const error=await (await run()).json();assert.equal(error.code,190);assert.equal(JSON.stringify(error).includes('secret'),false);
 }finally{global.fetch=originalFetch;for(const k of keys)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
});
