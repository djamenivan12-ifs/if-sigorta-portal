import {NextResponse} from "next/server";
import {requireApiRole} from "@/lib/auth/requireApiRole";
import {processOutbox} from "@/lib/notifications/processOutbox";
export const maxDuration=60;
export async function POST(){const auth=await requireApiRole(["admin"]);if(!auth.success)return auth.response;try{return NextResponse.json({success:true,...await processOutbox()},{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({success:false,error:"File de notifications indisponible."},{status:503});}}
