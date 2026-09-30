const test=require('node:test'),assert=require('node:assert/strict');
const {loadTs}=require('./load-ts.cjs');
const {addressError,addressFromForm}=loadTs('lib/insurance/addressValidation.ts');
const address={provinceId:'34',districtId:'10',neighborhoodId:'50',street:'Test Sokak',buildingNumber:'12',apartmentNumber:''};
test('A complete address is accepted, including an empty optional apartment',()=>assert.equal(addressError(address),null));
test('Address validation names exactly the missing fields before final submission',()=>{
 const error=addressError({...address,neighborhoodId:'',buildingNumber:' '});
 assert.match(error,/quartier/);assert.match(error,/Bina No/);assert.doesNotMatch(error,/province|rue|appartement/);
 assert.ok(addressError({...address,provinceId:'not-an-id'}));
 assert.ok(addressError(undefined));
});
test('Visible autofilled address values are adopted even without React change events',()=>{
 const Native=global.FormData;
 try { global.FormData=class {get(name){return {street:' Actual street ',buildingNumber:' 23 ',apartmentNumber:''}[name]??null;}};
 const result=addressFromForm({}, {...address,street:'',buildingNumber:''});
 assert.equal(result.street,'Actual street');assert.equal(result.buildingNumber,'23');assert.equal(result.neighborhoodId,address.neighborhoodId);assert.equal(addressError(result),null);
 }finally{global.FormData=Native;}
});
const id='10000000-0000-4000-8000-000000000001';
function uploadAPI({status='waiting_payment',payment=null,phone='061234567',source='direct',partner=false,authorized=true}={}){
 const calls={signed:[],filters:[]};
 const db={from(table){let filters={};const q={select(){return q;},eq(key,value){filters[key]=value;calls.filters.push([table,key,value]);return q;},maybeSingle:async()=>({data:table==='insurance_requests'?(source!==filters.source?null:{id,request_code:'IF-TEST',status,source,partner_id:'partner-a',client:{whatsapp_country_code:'+242',whatsapp_number:phone}}):payment,error:null})};return q;},storage:{from(){return {createSignedUploadUrl:async(path)=>{calls.signed.push(path);return {data:{token:'signed-token'},error:null};}};}}};
 const mocks={'@/lib/supabase/service':{createServiceClient:()=>db},'@/lib/security/rateLimit':{getClientIp:()=> 'TEST',consumeRateLimit:async()=>({allowed:true,retryAfterSeconds:0})},'@/lib/auth/requireApiPartner':{requireApiPartner:async()=>authorized?{success:true,partner:{id:'partner-a'},user:{id:'actor-a'}}:{success:false,response:new Response(null,{status:401})}}};
 const route=loadTs(partner?'app/api/partner/requests/[id]/payment-upload-url/route.ts':'app/api/tracking/payment-receipt-upload-url/route.ts',mocks);
 return {calls,run:()=>route.POST(new Request('http://localhost',{method:'POST',body:JSON.stringify({requestCode:'IF-TEST',whatsappCountryCode:'+242',whatsappNumber:'061234567',fileName:'receipt.pdf',mimeType:'application/pdf',fileSize:100})}),{params:Promise.resolve({id})})};
}
test('A client can prepare the first receipt with the existing matricule and phone',async()=>{const api=uploadAPI();const res=await api.run();assert.equal(res.status,200);assert.match(api.calls.signed[0],new RegExp('^pending/direct/payment/'+id+'/'));assert.equal((await res.json()).requestId,id);});
test('A rejected payment still prepares a replacement receipt',async()=>{const api=uploadAPI({status:'payment_rejected',payment:{id:'p',status:'rejected'}});assert.equal((await api.run()).status,200);assert.match(api.calls.signed[0],/pending\/direct\/payment-reupload\//);});
for(const status of ['payment_review','payment_confirmed','policy_available','cancelled'])test('Receipt preparation refuses '+status,async()=>{const api=uploadAPI({status});assert.equal((await api.run()).status,409);assert.equal(api.calls.signed.length,0);});
test('Wrong WhatsApp cannot sign a receipt upload',async()=>{const api=uploadAPI({phone:'OTHER'});assert.equal((await api.run()).status,403);assert.equal(api.calls.signed.length,0);});
test('Public tracking cannot sign partner uploads',async()=>{const api=uploadAPI({source:'partner'});assert.equal((await api.run()).status,404);assert.equal(api.calls.signed.length,0);});
test('Inconsistent existing payment is not overwritten from tracking',async()=>{const api=uploadAPI({payment:{id:'p',status:'confirmed'}});assert.notEqual((await api.run()).status,200);assert.equal(api.calls.signed.length,0);});
test('Partners can resume a waiting dossier and upload without a new request',async()=>{const api=uploadAPI({partner:true,source:'partner'});assert.equal((await api.run()).status,200);assert.match(api.calls.signed[0],new RegExp('^pending/partner/partner-a/payment/'+id+'/'));assert.ok(api.calls.filters.some(([t,k,v])=>t==='insurance_requests'&&k==='partner_id'&&v==='partner-a'));});
test('Signed-out partner cannot prepare uploads',async()=>{const api=uploadAPI({partner:true,source:'partner',authorized:false});assert.equal((await api.run()).status,401);assert.equal(api.calls.signed.length,0);});
// Exercise finalization through the public tracking entry point, not only the signing route.
for(const kind of ['payment','payment-reupload'])test('Tracking finalizes '+kind+' on the same dossier',async()=>{
 let saved;
 const db={from(table){const q={select(){return q;},eq(){return q;},maybeSingle:async()=>({data:table==='insurance_requests'?{id,client:{whatsapp_country_code:'+242',whatsapp_number:'061234567'}}:null,error:null})};return q;},storage:{from(){return {copy:async()=>({error:null})};}},rpc:async(name,args)=>{saved=args;return {data:{success:true,requestId:id,status:'payment_review'},error:null};}};
 const mocks={'@/lib/supabase/service':{createServiceClient:()=>db},'@/lib/security/rateLimit':{getClientIp:()=> 'TEST',consumeRateLimit:async()=>({allowed:true})},'@/lib/security/verifyStoredDocument':{verifyStoredDocument:async()=>({mimeType:'application/pdf',fileSize:100})},'@/lib/insurance/prepareDocumentCopy':{prepareDocumentCopy:async()=>{}},'@/lib/notifications/processOutbox':{processOutbox:async()=>{}}};
 const route=loadTs('app/api/tracking/payment-receipt/route.ts',mocks);
 const res=await route.POST(new Request('http://localhost',{method:'POST',body:JSON.stringify({requestCode:'IF-TEST',whatsappCountryCode:'+242',whatsappNumber:'061234567',path:`pending/direct/${kind}/${id}/test.pdf`,originalFileName:'receipt.pdf',mimeType:'application/pdf',fileSize:100})}));
 assert.equal(res.status,200);assert.equal(saved.p_request_id,id);assert.equal(saved.p_partner_id,null);assert.equal(saved.p_phone,'061234567');
});
