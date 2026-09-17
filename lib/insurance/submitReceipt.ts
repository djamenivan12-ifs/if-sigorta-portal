import {prepareDocumentCopy} from "@/lib/insurance/prepareDocumentCopy";
import "server-only";
import {processOutbox} from "@/lib/notifications/processOutbox";
import {NextResponse} from "next/server";
import {createServiceClient} from "@/lib/supabase/service";
import {verifyStoredDocument} from "@/lib/security/verifyStoredDocument";
import {consumeRateLimit,getClientIp} from "@/lib/security/rateLimit";
type ReceiptContext={id?:string;partnerId?:string;actorId?:string;reupload?:boolean};
const reply=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const text=(value:unknown)=>typeof value==="string"?value.trim():"";
export async function submitReceipt(request:Request,context:ReceiptContext){
 const db=createServiceClient();
 try{
  if(!context.partnerId){const limit=await consumeRateLimit({namespace:"payment-receipt-ip",identifier:getClientIp(request),limit:10,windowSeconds:600});if(!limit.allowed)return reply({success:false,error:"Trop de tentatives. Réessayez plus tard."},429);}
  let body:Record<string,unknown>;try{body=await request.json();if(!body||typeof body!=="object")throw Error();}catch{return reply({success:false,error:"Requête invalide."},400);}
  const code=text(body.requestCode).toUpperCase(),country=text(body.whatsappCountryCode),phone=text(body.whatsappNumber).replace(/\D/g,"");
  const pending=text(body.path),name=text(body.originalFileName),mime=text(body.mimeType).toLowerCase(),size=Number(body.fileSize);
  if(!pending||!name||!["application/pdf","image/jpeg","image/png"].includes(mime)||!Number.isInteger(size)||size<1||size>10485760)return reply({success:false,error:"Justificatif invalide. Utilisez PDF, JPG ou PNG, de 10 Mo maximum."},400);
  if(!context.partnerId){if(!code||!country||!phone)return reply({success:false,error:"Informations de suivi incomplètes."},400);const limit=await consumeRateLimit({namespace:"payment-receipt-identity",identifier:code+"|"+country+"|"+phone,limit:5,windowSeconds:600});if(!limit.allowed)return reply({success:false,error:"Trop de tentatives. Réessayez plus tard."},429);}
  let query=db.from("insurance_requests").select("id,request_code,source,partner_id,client:clients(whatsapp_country_code,whatsapp_number)");
  query=context.partnerId?query.eq("id",context.id!).eq("source","partner").eq("partner_id",context.partnerId):query.eq("request_code",code).eq("source","direct");
  if(context.id)query=query.eq("id",context.id);
  const {data:row,error}=await query.maybeSingle();if(error)throw error;if(!row)return reply({success:false,error:"Dossier introuvable."},404);
  const relation=row.client;const client=Array.isArray(relation)?relation[0]:relation;
  if(!context.partnerId&&(text(client?.whatsapp_country_code)!==country||text(client?.whatsapp_number).replace(/\D/g,"")!==phone))return reply({success:false,error:"Les informations ne correspondent pas au dossier."},403);
  const prefix=context.partnerId?"pending/partner/"+context.partnerId+"/payment/"+row.id+"/":"pending/direct/"+(context.reupload?"payment-reupload":"payment")+"/"+row.id+"/";
  if(!pending.startsWith(prefix)||pending.includes(".."))return reply({success:false,error:"Chemin du justificatif invalide."},403);
  // A retry reads the adopted result before touching storage. The pending source remains available until retention cleanup.
  const {data:prior,error:priorError}=await db.from("workflow_operations").select("actor_id,payload,result").eq("request_id",row.id).eq("operation_key","receipt:"+pending).maybeSingle();
  if(priorError)return reply({success:false,error:"La mise à jour de la base est nécessaire pour enregistrer ce paiement."},503);
  const document={original_file_name:name,mime_type:mime,file_size:size};
  if(prior){if(prior.actor_id!==(context.actorId??null)||prior.payload.original_file_name!==name||prior.payload.mime_type!==mime||Number(prior.payload.file_size)!==size)return reply({success:false,error:"Cette soumission a changé."},409);return reply(prior.result);}
  const actual=await verifyStoredDocument(db,"insurance-documents",pending);
  if(actual.mimeType!==mime||actual.fileSize!==size)return reply({success:false,error:"Les informations du fichier ne correspondent pas au justificatif."},400);
  const finalPath=row.id+"/payment_receipt/"+crypto.randomUUID();
  await prepareDocumentCopy(db,pending,finalPath,row.id);
  const {error:copyError}=await db.storage.from("insurance-documents").copy(pending,finalPath);if(copyError)throw copyError;
  const {data:result,error:saveError}=await db.rpc("submit_payment_receipt",{p_request_id:row.id,p_actor_id:context.actorId??null,p_partner_id:context.partnerId??null,p_request_code:code,p_country:country,p_phone:phone,p_pending_path:pending,p_document:{...document,storage_path:finalPath}});
  // Do not delete on an uncertain network response: the transaction may have committed.
  if(saveError){const status=saveError.code==="42501"?403:saveError.code==="40001"?409:saveError.code==="22023"?400:saveError.code==="PGRST202"?503:500;return reply({success:false,error:status===409?"Le dossier a changé. Actualisez la page.":status===503?"La mise à jour de la base est nécessaire.":"Le justificatif n’a pas pu être enregistré. Réessayez."},status);}
  await processOutbox().catch(()=>{});
  return reply(result);
 }catch{return reply({success:false,error:"Le justificatif n’a pas pu être enregistré. Réessayez."},500);}
}
