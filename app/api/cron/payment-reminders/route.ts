import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPaymentReminder } from "@/lib/whatsapp/sendPaymentReminder";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const secret = process.env.PAYMENT_REMINDER_CRON_SECRET;
  const supplied = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const suppliedBytes = Buffer.from(supplied), expectedBytes = Buffer.from(expected);
  if (!secret || suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const since = process.env.PAYMENT_REMINDERS_ENABLED_FROM;
  if (!since || !Number.isFinite(Date.parse(since)))
    return NextResponse.json({ enabled: false }, { headers });
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID)
    return NextResponse.json({ error: "Configuration WhatsApp absente." }, { status: 503, headers });
  const db = createServiceClient();
  const { data, error } = await db.rpc("claim_payment_reminders", { p_since: new Date(since).toISOString() });
  if (error) return NextResponse.json({ error: "Relances indisponibles." }, { status: 503, headers });
  let sent = 0, skipped = 0, failed = 0;
  for (const item of data ?? []) {
    let status = "failed", messageId: string | null = null;
    try {
      // Recheck immediately before the external call, including receipt and payment records.
      const { data: recipient, error: readError } = await db.rpc("payment_reminder_recipient", { p_request: item.request_id });
      if (readError) throw readError;
      if (!recipient) { status = "skipped"; skipped++; }
      else { messageId = await sendPaymentReminder(recipient); status = "sent"; sent++; }
    } catch { failed++; }
    // Ambiguous network failures are never automatically retried: avoid duplicate messages.
    const { data: finished, error: finishError } = await db.from("payment_reminders")
      .update({ status, provider_message_id: messageId, finished_at: new Date().toISOString() })
      .eq("request_id", item.request_id).eq("token", item.token).eq("status", "processing").select("request_id").maybeSingle();
    if (finishError || !finished) return NextResponse.json({ error: "Résultat non enregistré. Vérification requise." }, { status: 503, headers });
  }
  return NextResponse.json({ sent, skipped, failed }, { headers });
}
