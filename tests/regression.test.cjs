const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {loadTs,root}=require('./load-ts.cjs');
const dates=loadTs('lib/validation/date.ts');
for(const invalid of ['2026-02-31','2025-02-29','2000-invalid','2026-1-01','',null])test('Reject invalid calendar date '+invalid,()=>assert.equal(dates.isValidDate(invalid),false));
test('Leap day remains valid',()=>assert.equal(dates.isValidDate('2024-02-29'),true));
test('Insurer year-based age is preserved before birthday',()=>assert.equal(dates.calculateInsuranceAge('2000-12-31',new Date(2026,8,13)),26));
test('Future birth in current year is rejected',()=>assert.equal(dates.calculateInsuranceAge('2026-12-31',new Date(2026,8,13)),null));
test('Age outside supported range is rejected',()=>assert.equal(dates.calculateInsuranceAge('1900-01-01',new Date(2026,8,13)),null));
const {hasOverlappingRanges}=loadTs('lib/insurance/priceRanges.ts');
test('Adjacent inclusive age boundaries cannot overlap',()=>assert.equal(hasOverlappingRanges([{minimumAge:0,maximumAge:18,isActive:true},{minimumAge:18,maximumAge:25,isActive:true}]),true));
test('Inactive historical ranges do not block current prices',()=>assert.equal(hasOverlappingRanges([{minimumAge:0,maximumAge:99,isActive:false},{minimumAge:0,maximumAge:17,isActive:true},{minimumAge:18,maximumAge:25,isActive:true}]),false));
const {verifyWebhookSignature}=loadTs('lib/security/webhookSignature.ts');
const body='{"object":"whatsapp_business_account"}',secret='test-only-secret',signature='sha256='+crypto.createHmac('sha256',secret).update(body).digest('hex');
test('Accept authentic webhook',()=>assert.equal(verifyWebhookSignature(body,signature,secret),true));
test('Reject tampered webhook',()=>assert.equal(verifyWebhookSignature(body+' ',signature,secret),false));
test('Reject absent or malformed webhook signatures without throwing',()=>{for(const s of [null,'sha256=ff','x'.repeat(71)])assert.equal(verifyWebhookSignature(body,s,secret),false);});
const {detectDocumentType}=loadTs('lib/security/fileSignature.ts');
test('PDF, PNG and JPEG content signatures accepted',()=>{assert.equal(detectDocumentType(Buffer.from('%PDF-1.7')),'application/pdf');assert.equal(detectDocumentType(Uint8Array.from([137,80,78,71,13,10,26,10])),'image/png');assert.equal(detectDocumentType(Uint8Array.from([255,216,255])),'image/jpeg');});
test('HTML renamed as PDF is rejected',()=>assert.equal(detectDocumentType(Buffer.from('<html>')) ,null));
const {collectRows}=loadTs('lib/supabase/collectRows.ts');
test('Pagination does not silently truncate at a server cap smaller than requested',async()=>{const source=Array.from({length:501},(_,i)=>i);const result=await collectRows((from)=>Promise.resolve({data:source.slice(from,from+100),error:null}));assert.deepEqual(result.data,source);});
test('A failed page does not return a misleading partial total',async()=>{let page=0;const result=await collectRows(()=>Promise.resolve(page++?{data:null,error:{message:'offline'}}:{data:[1,2],error:null}));assert.equal(result.error.message,'offline');assert.deepEqual(result.data,[]);});
const {normalizeActivityAction}=loadTs('lib/activity/normalizeAction.ts');
test('Current and legacy WhatsApp event names match',()=>{assert.equal(normalizeActivityAction('partner_policy_whatsapp_sent'),'whatsapp_sent');assert.equal(normalizeActivityAction('policy_whatsapp_failed'),'whatsapp_failed');assert.equal(normalizeActivityAction('request_created'),'request_created');});
const {NextResponse}=require('next/server');
function renewalRoute(kind,{role='agent',assigned='agent-a',status='pending',concurrent=false}={}){
 const writes=[];
 const db={from(table){let updating=false;const q={select(){return q;},eq(){return q;},update(value){updating=true;writes.push(value);return q;},insert(){return Promise.resolve({error:null});},maybeSingle(){return Promise.resolve({error:null,data:table==='insurance_requests'?{assigned_agent_id:assigned}:updating?(concurrent?null:{id:'renewal'}):{id:'renewal',request_id:'request',status}});}};return q;}};
 const route=loadTs('app/api/admin/renewals/[id]/'+kind+'/route.ts',{'@/lib/auth/requireApiRole':{requireApiRole:async()=>({success:true,role,user:{id:'agent-a'}})},'@/lib/supabase/service':{createServiceClient:()=>db}});
 return {run:()=>route.POST(new Request('http://localhost'),{params:Promise.resolve({id:'renewal'})}),writes};
}
test('Agent cannot change another agent renewal',async()=>{const r=renewalRoute('contact',{assigned:'agent-b'});assert.equal((await r.run()).status,403);assert.equal(r.writes.length,0);});
test('Unassigned renewal workflow remains available',async()=>assert.equal((await renewalRoute('contact',{assigned:null}).run()).status,200));
test('Admin retains access to assigned renewals',async()=>assert.equal((await renewalRoute('interest',{role:'admin',assigned:'agent-b'}).run()).status,200));
test('Contact cannot reset an interested renewal',async()=>{const r=renewalRoute('contact',{status:'interested'});assert.equal((await r.run()).status,200);assert.equal(r.writes.length,0);});
test('Terminal renewal cannot regress',async()=>{const r=renewalRoute('interest',{status:'completed'});assert.equal((await r.run()).status,409);assert.equal(r.writes.length,0);});
test('Concurrent renewal change is reported instead of logged as success',async()=>assert.equal((await renewalRoute('interest',{concurrent:true}).run()).status,409));
test('Notes creation rejects empty content before database access',async()=>{const route=loadTs('app/api/admin/clients/[id]/notes/route.ts',{'@/lib/auth/requireApiRole':{requireApiRole:async()=>({success:true,role:'agent',user:{id:'a'}})},'@/lib/supabase/service':{createServiceClient:()=>{throw Error('must not query');}}});assert.equal((await route.POST(new Request('http://localhost',{method:'POST',body:'{"content":"  "}'}),{params:Promise.resolve({id:'c'})})).status,400);});
test('Anonymous notes creation returns auth response',async()=>{const route=loadTs('app/api/admin/clients/[id]/notes/route.ts',{'@/lib/auth/requireApiRole':{requireApiRole:async()=>({success:false,response:NextResponse.json({error:'auth'},{status:401})})},'@/lib/supabase/service':{createServiceClient:()=>{throw Error('must not query');}}});assert.equal((await route.POST(new Request('http://localhost'),{params:Promise.resolve({id:'c'})})).status,401);});
// Exercise the actual pure request transition without mounting React or accessing storage.
const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const source=fs.readFileSync(root+'/context/InsuranceRequestContext.tsx','utf8'),sf=ts.createSourceFile('context.tsx',source,99,true);let pieces=[];
for(const node of sf.statements){if((ts.isFunctionDeclaration(node)&&['valueHasChanged','sessionReducer'].includes(node.name?.text))||(ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(sf)==='initialRequestData')))pieces.push(node.getText(sf));}
const stateTools=vm.runInThisContext('(function(){'+ts.transpileModule(pieces.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';return {sessionReducer,initialRequestData};})()');
test('Canonical quote and new dossier id are adopted together',()=>{const {sessionReducer:r,initialRequestData:d}=stateTools;const next=r({requestData:d,pendingCancellation:null},{type:'update',values:{requestId:'new',requestCode:'CODE',calculatedPrice:750,calculatedAge:26}});assert.equal(next.requestData.requestId,'new');assert.equal(next.requestData.calculatedPrice,750);assert.equal(next.pendingCancellation,null);});
test('Editing an existing request preserves its cancellation credentials',()=>{const {sessionReducer:r,initialRequestData:d}=stateTools;const old={requestData:{...d,requestId:'old',requestCode:'OLD',whatsappNumber:'123'},pendingCancellation:null};const next=r(old,{type:'update',values:{duration:2}});assert.equal(next.requestData.requestId,'');assert.equal(next.pendingCancellation.requestId,'old');assert.equal(next.pendingCancellation.whatsappNumber,'123');assert.equal(old.requestData.requestId,'old');});
test('Receipt selection does not invalidate an existing dossier',()=>{const {sessionReducer:r,initialRequestData:d}=stateTools;const next=r({requestData:{...d,requestId:'old',requestCode:'OLD'},pendingCancellation:null},{type:'update',values:{paymentReceiptFile:{name:'receipt.pdf'}}});assert.equal(next.requestData.requestId,'old');});

const {verifyStoredDocument}=loadTs('lib/security/verifyStoredDocument.ts',{'@/lib/supabase/service':{createServiceClient:()=>{throw Error('unused');}}});
function storageMock(size,bytes){let downloads=0;return {db:{storage:{from(){return {list:async()=>({data:[{name:'document.pdf',metadata:{size}}],error:null}),download:async()=>{downloads++;return {data:new Blob([bytes]),error:null};}};}}},downloads:()=>downloads};}
test('Oversized storage metadata is rejected before download',async()=>{const m=storageMock(11*1024*1024,'%PDF-1.7');await assert.rejects(()=>verifyStoredDocument(m.db,'documents','pending/document.pdf'));assert.equal(m.downloads(),0);});
test('Stored document size must match metadata',async()=>{const m=storageMock(20,'%PDF-1.7');await assert.rejects(()=>verifyStoredDocument(m.db,'documents','pending/document.pdf'));});
test('PDF policy rejects image content even with a PDF filename',async()=>{const bytes=Uint8Array.from([255,216,255]);const m=storageMock(bytes.length,bytes);await assert.rejects(()=>verifyStoredDocument(m.db,'documents','pending/document.pdf',true));});
test('Valid stored PDF returns its actual type and size',async()=>{const m=storageMock(8,'%PDF-1.7');assert.deepEqual(await verifyStoredDocument(m.db,'documents','pending/document.pdf',true),{mimeType:'application/pdf',fileSize:8});});
function documentRoute({role='agent',assigned='agent-a',document=true}={}){
 let signed=0;
 const db={from(table){const q={select(){return q;},eq(){return q;},maybeSingle:async()=>({data:table==='insurance_requests'?{assigned_agent_id:assigned}:document?{storage_path:'request/policy.pdf'}:null,error:null})};return q;},storage:{from(){return {createSignedUrl:async()=>{signed++;return {data:{signedUrl:'https://example.test/document'},error:null};}};}}};
 const route=loadTs('app/api/admin/requests/[id]/documents/[documentId]/route.ts',{'@/lib/auth/requireApiRole':{requireApiRole:async()=>({success:true,role,user:{id:'agent-a'}})},'@/lib/supabase/service':{createServiceClient:()=>db}});
 return {run:()=>route.GET(new Request('http://localhost'),{params:Promise.resolve({id:'request',documentId:'doc'})}),signed:()=>signed};
}
test('Document download refuses another agent before signing',async()=>{const r=documentRoute({assigned:'agent-b'});assert.equal((await r.run()).status,404);assert.equal(r.signed(),0);});
test('Missing dossier document is not signed',async()=>{const r=documentRoute({document:false});assert.equal((await r.run()).status,404);assert.equal(r.signed(),0);});
test('Authorized document redirect is never cacheable',async()=>{const r=documentRoute();const response=await r.run();assert.equal(response.status,302);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(r.signed(),1);});
test('Administrator can download document assigned to another agent',async()=>assert.equal((await documentRoute({role:'admin',assigned:'agent-b'}).run()).status,302));

require('./price-payments.test.cjs');

require('./accounting.test.cjs');

require('./dashboard.test.cjs');

require('./navigation.test.cjs');
