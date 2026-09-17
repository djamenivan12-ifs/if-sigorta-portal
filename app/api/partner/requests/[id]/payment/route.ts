import {submitReceipt} from "@/lib/insurance/submitReceipt";
import {requireApiPartner} from "@/lib/auth/requireApiPartner";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){const auth=await requireApiPartner();if(!auth.success)return auth.response;return submitReceipt(request,{id:(await context.params).id,partnerId:auth.partner.id,actorId:auth.user.id});}
