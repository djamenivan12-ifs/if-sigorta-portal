
const test=require('node:test'),assert=require('node:assert/strict');
const {loadTs}=require('./load-ts.cjs');
const {validatePriceRanges}=loadTs('lib/insurance/validatePriceRanges.ts');
const {savePriceRanges}=loadTs('lib/insurance/savePriceRanges.ts');
const {normalizePaymentStatus}=loadTs('lib/insurance/paymentStatus.ts');
const band=(extra={})=>({minimumAge:0,maximumAge:20,oneYearPrice:100,twoYearPrice:180,isActive:true,...extra});
function database(initial,options={}){
 let rows=initial.map(r=>({...r})),next=100;const events=[];
 return {events,get rows(){return rows;},from(){let mode='read',values,filters=[];const q={
 select(){return q;},order(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},in(k,v){filters.push(r=>v.includes(r[k]));return q;},
 update(v){mode='update';values=v;return q;},insert(v){mode='insert';values=v;return q;},delete(){mode='delete';return q;},
 range(a,b){return Promise.resolve({data:rows.filter(r=>filters.every(f=>f(r))).slice(a,b+1),error:null});},
 async single(){return execute();},async maybeSingle(){return execute();},then(resolve,reject){return Promise.resolve(execute()).then(resolve,reject);}
 };function execute(){events.push(mode);if(options.fail===mode)return {data:null,error:{message:'simulated'}};
 if(mode==='insert'){const row={...values,id:next++};rows.push(row);return {data:{id:row.id},error:null};}
 const targets=rows.filter(r=>filters.every(f=>f(r)));
 if(mode==='update'){if(options.missing)return {data:null,error:null};targets.forEach(r=>Object.assign(r,values));return {data:targets[0]?{id:targets[0].id}:null,error:null};}
 if(mode==='delete')rows=rows.filter(r=>!targets.includes(r));return {data:null,error:null};
 }return q;}};
}
const stored=(id,extra={})=>({id,minimum_age:0,maximum_age:20,one_year_price:100,two_year_price:180,is_active:true,...extra});
test('price validation rejects malformed payloads and ambiguous scalar values',()=>{
 for(const body of [null,{},[],{ranges:[]},{ranges:[band({isActive:'false'})]},{ranges:[band({id:-1})]},{ranges:[band({oneYearPrice:Infinity})]},{ranges:[band({minimumAge:1.2})]},{ranges:[band({id:1}),band({id:1})]}])assert.equal(validatePriceRanges(body).success,false);
 assert.equal(validatePriceRanges({ranges:[band({maximumAge:999})]}).success,true);
});
test('foreign partner price IDs are rejected before mutation',async()=>{const db=database([stored(1,{partner_id:'a'})]);await assert.rejects(savePriceRanges(db,[band({id:2})],'a'),{status:409});assert.deepEqual(db.events,[]);});
test('direct grid checks overlaps against omitted existing bands',async()=>{const db=database([stored(1)]);await assert.rejects(savePriceRanges(db,[band()]),{status:400});assert.deepEqual(db.events,[]);});
test('failed partner insertion does not delete previous prices',async()=>{const db=database([stored(1,{partner_id:'a'})],{fail:'insert'});await assert.rejects(savePriceRanges(db,[band()],'a'));assert.deepEqual(db.events,['insert']);assert.equal(db.rows[0].id,1);});
test('partner replacement saves before deleting and returns IDs for repeat save',async()=>{const db=database([stored(1,{partner_id:'a'}),stored(2,{partner_id:'b'})]);const result=await savePriceRanges(db,[band()],'a');assert.deepEqual(db.events,['insert','delete']);assert.equal(result[0].id,100);await savePriceRanges(db,result,'a');assert.deepEqual(db.events,['insert','delete','update']);assert.deepEqual(db.rows.map(r=>r.id),[2,100]);});
test('direct save preserves omitted nonoverlapping bands',async()=>{const db=database([stored(1)]);const result=await savePriceRanges(db,[band({minimumAge:21,maximumAge:40})]);assert.deepEqual(result.map(r=>r.id),[1,100]);assert.deepEqual(db.events,['insert']);});
test('concurrently deleted price is reported as a conflict',async()=>{const db=database([stored(1,{partner_id:'a'})],{missing:true});await assert.rejects(savePriceRanges(db,[band({id:1})],'a'),{status:409});assert.deepEqual(db.events,['update']);});
test('payment state survives dossier progression and cancellation',()=>{for(const stage of ['policy_available','completed','cancelled']){assert.equal(normalizePaymentStatus('confirmed',stage),'confirmed');assert.equal(normalizePaymentStatus('submitted',stage),'review');assert.equal(normalizePaymentStatus('rejected',stage),'rejected');}assert.equal(normalizePaymentStatus(null,'policy_available'),'unknown');assert.equal(normalizePaymentStatus(null,'payment_confirmed'),'confirmed');assert.equal(normalizePaymentStatus('verified'),'confirmed');});

test('payments page retains advanced dossiers and enforces agent scope',async()=>{
 const {renderToStaticMarkup}=require('react-dom/server');
 const rows=[['VISIBLE','policy_available','agent-a','confirmed'],['CANCELLED','cancelled','agent-a','confirmed'],['OTHER','policy_available','agent-b','confirmed'],['REJECTED','payment_rejected','agent-a','rejected']].map(([id,status,assigned_agent_id,paymentStatus])=>({id,request_code:id,status,assigned_agent_id,calculated_price:100,created_at:'2026-01-01',client:null,payment:{status:paymentStatus,expected_amount:100,submitted_at:null,verified_at:null,rejection_reason:null}}));
 const db=database(rows);
 const page=loadTs('app/admin/(protected)/paiements/page.tsx',{
 '@/lib/auth/requireRole':{requireRole:async()=>({user:{id:'agent-a'},role:'agent'})},
 '@/lib/supabase/service':{createServiceClient:()=>db},
 '@/components/admin/pages/PageFrame':({children})=>require('react').createElement('section',null,children),
'@/components/admin/pages/ListTools':{ListPagination:()=>null},
'@/components/ui/Table':{Table:'table',TableBody:'tbody',TableCell:'td',TableContainer:'div',TableHead:'th',TableHeader:'thead',TableRow:'tr'},
 'next/link':'a'
 }).default;
 const html=renderToStaticMarkup(await page({searchParams:Promise.resolve({status:'confirmed'})}));
 assert.match(html,/VISIBLE/);assert.match(html,/CANCELLED/);assert.match(html,/Dossier annulé/);assert.doesNotMatch(html,/OTHER/);assert.doesNotMatch(html,/REJECTED/);
});
