import "server-only";
import {Resend} from "resend";
import {createServiceClient} from "@/lib/supabase/service";
import {sendWhatsAppMessage,sendPartnerWhatsAppMessage} from "@/lib/whatsapp/sendWhatsAppMessage";
type Event={id:string;lease_token:string;event_key:string;template:string;payload:Record<string,string>};
const escape=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]!);
export async function processOutbox(){
 const db=createServiceClient();const {data,error}=await db.rpc("claim_notifications",{p_limit:3});if(error)throw Error("File de notifications indisponible.");
 let sent=0,failed=0;
 for(const event of (data??[]) as Event[]){let failure:string|null=null;let retry=false;const p=event.payload;
  try{
   if(event.template==="payment_admin"){
    if(!process.env.RESEND_API_KEY||!process.env.ADMIN_NOTIFICATION_EMAIL)throw Error("Configuration e-mail absente.");
    const {error:sendError}=await new Resend(process.env.RESEND_API_KEY).emails.send({from:process.env.RESEND_FROM_EMAIL??"IF Sigorta <notifications@ifsigorta.com>",to:process.env.ADMIN_NOTIFICATION_EMAIL,subject:"Justificatif de paiement reçu — "+p.requestCode,html:"<p>Un justificatif de paiement est disponible pour le dossier <strong>"+escape(p.requestCode)+"</strong>.</p><p>Source : "+escape(p.source)+". Montant attendu : "+escape(p.amount)+" TL.</p><p>Connectez-vous à l’espace administrateur pour le vérifier.</p>"},{idempotencyKey:event.id});
    if(sendError)throw Error("Envoi e-mail refusé.");
   }else if(event.template==="assignment_email"){
    if(!process.env.RESEND_API_KEY||!p.agentEmail)throw Error("Configuration e-mail ou destinataire absent.");
    const {data:recipient,error:recipientError}=await db.auth.admin.getUserById(p.agentId);
    if(recipientError||!recipient.user||recipient.user.email?.trim()!==p.agentEmail||!["admin","agent"].includes(recipient.user.app_metadata?.role))throw Error("Destinataire modifié.");
    const {error:sendError}=await new Resend(process.env.RESEND_API_KEY).emails.send({from:process.env.RESEND_FROM_EMAIL??"IF Sigorta <notifications@ifsigorta.com>",to:p.agentEmail,subject:"Nouveau dossier attribué — "+p.requestCode,html:"<p>Bonjour "+escape(p.agentName)+",</p><p>Le dossier <strong>"+escape(p.requestCode)+"</strong> de "+escape(p.clientName)+" vous a été attribué. Connectez-vous à IF Sigorta pour le consulter.</p>"},{idempotencyKey:event.id});
    if(sendError)throw Error("Envoi refusé.");
   }else if(event.template==="policy_available"){
    if(!p.phoneNumber)throw Error("Destinataire WhatsApp absent.");await sendWhatsAppMessage({phoneNumber:p.phoneNumber,matricule:p.matricule,firstName:p.firstName,preferredLanguage:p.preferredLanguage});
   }else if(event.template==="partner_policy_available"){
    if(!p.phoneNumber)throw Error("Destinataire WhatsApp absent.");await sendPartnerWhatsAppMessage({phoneNumber:p.phoneNumber,matricule:p.matricule,partnerName:p.partnerName,clientName:p.clientName});
   }else throw Error("Modèle inconnu.");
  }catch{failure="Envoi non confirmé. Vérifier le fournisseur avant une relance.";retry=false;failed++;}
  const {data:finished,error:finishError}=await db.rpc("finish_notification",{p_id:event.id,p_token:event.lease_token,p_error:failure,p_retry:retry});
  if(finishError||!finished)throw Error("Le résultat de l’envoi n’a pas pu être enregistré. Vérifier avant relance.");if(!failure)sent++;
 }
 return {sent,failed};
}
