import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/requireApiRole";
import { createServiceClient } from "@/lib/supabase/service";
export async function GET(_request:Request, context:{params:Promise<{id:string}>}) {
  const auth=await requireApiRole(["admin"]);
  if(!auth.success)return auth.response;
  const db=createServiceClient();
  const {id}=await context.params;
  const {data,error}=await db.from("client_refunds").select("proof_path").eq("id",id).maybeSingle();
  if(error||!data?.proof_path)return NextResponse.json({error:"Justificatif indisponible."},{status:404,headers:{"Cache-Control":"private, no-store"}});
  const signed=await db.storage.from("refund-proofs").createSignedUrl(data.proof_path,60,{download:true});
  if(signed.error)return NextResponse.json({error:"Téléchargement indisponible."},{status:503,headers:{"Cache-Control":"private, no-store"}});
  return new NextResponse(null,{status:302,headers:{Location:signed.data.signedUrl,"Cache-Control":"private, no-store"}});
}
