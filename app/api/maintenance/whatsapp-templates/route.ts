import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;
const headers = { "Cache-Control": "no-store" };
const definitions = [
  ["payment_reminder_fr", "fr", "Bonjour {{1}}, votre demande d’assurance IF Sigorta n° {{2}} est en attente de paiement. Vous pouvez la reprendre ici : {{3}}. Besoin d’aide ? Répondez à ce message."],
  ["payment_reminder_en", "en", "Hello {{1}}, your IF Sigorta insurance application {{2}} is awaiting payment. Resume your application here: {{3}}. Need help? Reply to this message."],
  ["payment_reminder_tr", "tr", "Merhaba {{1}}, {{2}} numaralı IF Sigorta sigorta başvurunuz ödeme bekliyor. Başvurunuza buradan devam edebilirsiniz: {{3}}. Yardıma ihtiyacınız varsa bu mesajı yanıtlayabilirsiniz."],
  ["partner_payment_reminder_fr", "fr", "Bonjour {{1}}, le dossier IF Sigorta n° {{2}} créé depuis votre espace partenaire est en attente de paiement. Consultez le dossier ici : {{3}}. Besoin d’aide ? Répondez à ce message."],
  ["partner_payment_reminder_en", "en", "Hello {{1}}, IF Sigorta application {{2}}, created from your partner account, is awaiting payment. Open the application here: {{3}}. Need help? Reply to this message."],
  ["partner_payment_reminder_tr", "tr", "Merhaba {{1}}, iş ortağı hesabınızdan oluşturulan {{2}} numaralı IF Sigorta başvurusu ödeme bekliyor. Başvuruyu buradan açabilirsiniz: {{3}}. Yardıma ihtiyacınız varsa bu mesajı yanıtlayabilirsiniz."],
];
class MetaError extends Error { constructor(public code: number, public subcode?: number) { super("Meta request failed"); } }

export async function POST(request: Request) {
  const secret = process.env.WHATSAPP_TEMPLATE_SETUP_SECRET;
  const until = Date.parse(process.env.WHATSAPP_TEMPLATE_SETUP_UNTIL || "");
  if (!secret || !Number.isFinite(until) || until <= Date.now()) return NextResponse.json({ error: "Setup disabled" }, { status: 404, headers });
  const given = Buffer.from(request.headers.get("authorization") || ""), expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const body = await request.json().catch(() => null);
  const definition = definitions.find(([name]) => name === body?.name);
  if (!definition || ![true, false].includes(body?.create)) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers });
  const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phone = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!waba || !/^\d+$/.test(waba) || !token || !phone) return NextResponse.json({ error: "Missing configuration" }, { status: 503, headers });
  const [name, language, text] = definition;
  async function meta(path: string, payload?: object) {
    const response = await fetch(`https://graph.facebook.com/v23.0/${waba}/${path}`, {
      method: payload ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new MetaError(result.error?.code || response.status, result.error?.error_subcode);
    return result;
  }
  try {
    const phones = await meta("phone_numbers?fields=id&limit=100");
    if (!phones.data?.some((entry: { id: string }) => entry.id === phone)) return NextResponse.json({ error: "Phone does not belong to configured account" }, { status: 409, headers });
    const list = await meta(`message_templates?name=${name}&fields=id,name,language,status,category,components&limit=100`);
    const existing = list.data?.find((entry: { name: string; language: string }) => entry.name === name && entry.language === language);
    if (existing) return NextResponse.json({ name, language, id: existing.id, status: existing.status, category: existing.category, matches: existing.components?.find((c: { type: string }) => c.type === "BODY")?.text === text }, { headers });
    if (!body.create) return NextResponse.json({ name, language, status: "MISSING" }, { headers });
    const result = await meta("message_templates", { name, language, category: "UTILITY", components: [{ type: "BODY", text,
      example: { body_text: [["Alex", "IF-EXEMPLE", name.startsWith("partner_") ? "https://ifsigorta.com/partenaire/dossiers/00000000-0000-4000-8000-000000000000" : "https://ifsigorta.com/suivi?code=IF-EXEMPLE"]] },
    }] });
    return NextResponse.json({ name, language, id: result.id, status: result.status, category: result.category, created: true }, { headers });
  } catch (error) {
    // Never return tokens, provider response bodies or customer data.
    return NextResponse.json({ error: "Meta request failed", ...(error instanceof MetaError ? { code: error.code, subcode: error.subcode } : {}) }, { status: 502, headers });
  }
}
