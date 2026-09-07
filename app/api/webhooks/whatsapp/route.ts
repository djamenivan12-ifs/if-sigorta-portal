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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log(
      "Webhook WhatsApp reçu :",
      JSON.stringify(body, null, 2),
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erreur webhook WhatsApp :",
      error,
    );

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      },
    );
  }
}