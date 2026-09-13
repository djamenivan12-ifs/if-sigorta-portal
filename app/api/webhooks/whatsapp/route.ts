import { verifyWebhookSignature } from "@/lib/security/webhookSignature";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    return new NextResponse(
      "WHATSAPP_WEBHOOK_VERIFY_TOKEN manquant",
      { status: 500 },
    );
  }

  if (
    mode === "subscribe" &&
    token === verifyToken &&
    challenge
  ) {
    return new NextResponse(challenge, {
      status: 200,
    });
  }

  return new NextResponse("Forbidden", {
    status: 403,
  });
}

export async function POST(request:Request) {
  const secret=process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
  if(!secret) return NextResponse.json({success:false},{status:503});
  const body=await request.text();
  if(body.length>1024*1024) return NextResponse.json({success:false},{status:413});
  if(!verifyWebhookSignature(body,request.headers.get("x-hub-signature-256"),secret)) return NextResponse.json({success:false},{status:403});
  try { JSON.parse(body); return NextResponse.json({success:true}); }
  catch {return NextResponse.json({success:false},{status:400});}
}