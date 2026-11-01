import "server-only";

type Recipient = { requestId: string; requestCode: string; source: string; name: string; phoneNumber: string; language: string };

export async function sendPaymentReminder(recipient: Recipient) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const phone = recipient.phoneNumber?.replace(/\D/g, "");
  if (!token || !phoneId || !phone) throw new Error("Configuration WhatsApp incomplète.");
  const language = ["en", "tr"].includes(recipient.language) ? recipient.language : "fr";
  const partner = recipient.source === "partner";
  const origin = new URL(process.env.PAYMENT_REMINDER_SITE_URL || "https://ifsigorta.com");
  if (origin.protocol !== "https:") throw new Error("URL HTTPS requise.");
  const link = new URL(partner ? `/partenaire/dossiers/${encodeURIComponent(recipient.requestId)}` : "/suivi", origin);
  // Do not include telephone/authentication data in URLs.
  if (!partner) link.searchParams.set("code", recipient.requestCode);
  const response = await fetch(`https://graph.facebook.com/v23.0/${phoneId}/messages`, {
    method: "POST", signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "template", template: {
      name: `${partner ? "partner_" : ""}payment_reminder_${language}`,
      language: { code: language }, components: [{ type: "body", parameters:
        [recipient.name?.trim() || (partner ? "Partenaire" : "Client"), recipient.requestCode, link.toString()]
          .map(text => ({ type: "text", text })) }],
    } }),
  });
  const result = await response.json();
  if (!response.ok || !result.messages?.[0]?.id) throw new Error("Envoi WhatsApp non confirmé.");
  return result.messages[0].id as string;
}
