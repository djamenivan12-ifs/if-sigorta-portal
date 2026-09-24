const test=require('node:test'),assert=require('node:assert/strict');
const {loadTs}=require('./load-ts.cjs');
const {accounting}=loadTs('lib/accounting/model.ts');
const data=()=>({companies:[],rates:[],deposits:[],history:[],authors:{},loadedAt:'2026-09-24',requests:[{id:'r',request_code:'REF',status:'cancelled',insurance_company_id:'sky',actual_insurance_cost:100,insurance_company_selected_at:'2026-09-01',calculated_age:30}],payments:[{id:'p',request_id:'r',expected_amount:525,status:'confirmed',verified_at:'2026-09-01'}],refunds:[]});
const refund=(amount,extra={})=>({id:'f',payment_id:'p',request_id:'r',amount,refund_date:'2026-09-24',voided_at:null,...extra});
const all={from:'',to:'',company:''};
test('Refunds: cancelled dossier stays flagged after partial and clears after full refund',()=>{
 const d=data();d.refunds=[refund(200)];let r=accounting(d,all);assert.equal(r.netCollected,32500);assert.equal(r.anomalies.length,1);assert.equal(r.refundBalances[0].remaining,32500);
 d.refunds.push(refund(325,{id:'f2'}));r=accounting(d,all);assert.equal(r.netCollected,0);assert.equal(r.anomalies.length,0);assert.equal(r.refundBalances[0].remaining,0);assert.equal(r.balance,0);
});
test('Refunds: prior-period refund reduces this period net cash and revenue without a second insurer cost',()=>{
 const d=data();d.requests[0].status='policy_available';d.refunds=[refund(100)];
 const r=accounting(d,{from:'2026-09-24',to:'2026-09-24',company:'sky'});
 assert.equal(r.collected,0);assert.equal(r.netCollected,-10000);assert.equal(r.revenue,-10000);assert.equal(r.cost,0);assert.equal(r.profit,-10000);assert.equal(r.balance,-10000);
 const unrelated=accounting(d,{...all,company:'other'});assert.equal(unrelated.netCollected,0);
});
test('Refunds: voided entry retains historical reporting and reopens current amount due',()=>{
 const d=data();d.refunds=[refund(525,{refund_date:'2026-09-22',voided_at:'2026-09-24T12:00:00Z'})];
 assert.equal(accounting(d,all).netCollected,52500);assert.equal(accounting(d,all).anomalies.length,1);
 assert.equal(accounting(d,{...all,to:'2026-09-23'}).netCollected,0);
});
test('Refunds: missing migration never silently reports net figures as complete',()=>{
 const d=data();d.missingTables=['client_refunds'];const r=accounting(d,all);assert.equal(r.netCollected,null);assert.equal(r.refunded,null);assert.equal(r.refundBalances[0].remaining,null);
});
test('Refund API rejects unauthorized calls before parsing or uploading',async()=>{
 const route=loadTs('app/api/admin/accounting/refunds/route.ts',{'@/lib/auth/requireApiRole':{requireApiRole:async()=>({success:false,response:new Response('',{status:403})})},'@/lib/supabase/service':{createServiceClient(){throw Error('must not access database')}},'next/cache':{revalidatePath(){}}});
 assert.equal((await route.POST(new Request('http://localhost',{method:'POST'}))).status,403);
 assert.equal((await route.PATCH(new Request('http://localhost',{method:'PATCH'}))).status,403);
});
test('Refund API rejects malformed amounts without any write',async()=>{
 const route=loadTs('app/api/admin/accounting/refunds/route.ts',{'@/lib/auth/requireApiRole':{requireApiRole:async()=>({success:true,user:{id:'admin'}})},'@/lib/supabase/service':{createServiceClient(){throw Error('must not access database')}},'next/cache':{revalidatePath(){}}});
 const form=new FormData();form.set('amount','-1');assert.equal((await route.POST(new Request('http://localhost',{method:'POST',body:form}))).status,400);
});

test('Refund history uses recording time, keeps business date, and sorts newest first',async()=>{
 const tables={insurance_requests:[{id:'r',request_code:'REF',insurance_company_id:'sky',partner_id:null}],payments:[{id:'p',request_id:'r',status:'confirmed',expected_amount:525,verified_at:'2026-09-24T10:00:00Z'}],client_refunds:[{id:'f',request_id:'r',amount:525,refund_date:'2026-09-23',created_at:'2026-09-24T13:19:47Z',created_by:'admin',reason:'Annulation',reference:'BANK'}]};
 const db={from(table){const q={select(){return q},order(){return q},range:async(from,to)=>({data:(tables[table]??[]).slice(from,to+1),error:null})};return q},auth:{admin:{getUserById:async()=>({data:{user:{id:'admin',email:'admin@example.test',user_metadata:{}}},error:null})}}};
 const {loadAccounting}=loadTs('lib/accounting/load.ts',{'@/lib/supabase/service':{createServiceClient:()=>db}});
 const result=await loadAccounting();
 assert.equal(result.history[0].type,'refund');
 assert.equal(result.history[0].occurred_at,'2026-09-24T13:19:47Z');
 assert.match(result.history[0].description,/23\/09\/2026/);
 assert.equal(result.history[0].request_code,'REF');
 assert.equal(result.history[0].amount,525);
 assert.equal(result.history[0].direction,'out');
 assert.equal(result.refunds[0].refund_date,'2026-09-23');
});
