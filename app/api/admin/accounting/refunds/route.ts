import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiRole } from "@/lib/auth/requireApiRole";
import { createServiceClient } from "@/lib/supabase/service";
import { detectDocumentType } from "@/lib/security/fileSignature";
import { isValidDate } from "@/lib/validation/date";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "private, no-store" };
function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status, headers });
}
function dbFailure(code: string) {
  if (["PGRST202", "42P01", "42883"].includes(code)) return fail("La gestion des remboursements doit être activée dans la base.", 503);
  if (code === "42501") return fail("Accès réservé à l’administrateur.", 403);
  if (code === "P0002") return fail("Paiement ou remboursement introuvable.", 404);
  if (code === "40001") return fail("Opération déjà utilisée avec d’autres informations. Actualisez avant de réessayer.", 409);
  if (code === "P0001") return fail("Le montant dépasse le reste remboursable ou le paiement n’est pas confirmé. Actualisez la page.", 409);
  if (["22023", "23514"].includes(code)) return fail("Vérifiez le montant, la date, le moyen de paiement et les références.");
  return fail("Enregistrement incertain. Actualisez avant de réessayer ; conservez les mêmes informations pour éviter un doublon.", 503);
}
export async function POST(request: Request) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.success) return auth.response;
  try {
    if (Number(request.headers.get("content-length")) > 5 * 1024 * 1024) return fail("Justificatif trop volumineux (4 Mo maximum).", 413);
    const form = await request.formData();
    const get = (key: string) => typeof form.get(key) === "string" ? String(form.get(key)).trim() : "";
    const paymentId = get("paymentId"), operationId = get("operationId"), amount = get("amount").replace(",", "."), date = get("date"), method = get("method"), reason = get("reason"), reference = get("reference");
    if (!uuid.test(paymentId) || !uuid.test(operationId) || !/^\d{1,9}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || !isValidDate(date) || !["bank_transfer", "cash", "card", "other"].includes(method) || !reason || reason.length > 1000 || !reference || reference.length > 200) return fail("Complétez les champs obligatoires avec des valeurs valides.");
    const db = createServiceClient();
    let proofPath: string | null = null;
    const proof = form.get("proof");
    if (proof instanceof File && proof.size) {
      if (proof.size > 4 * 1024 * 1024) return fail("Justificatif trop volumineux (4 Mo maximum).", 413);
      const bytes = Buffer.from(await proof.arrayBuffer());
      const type = detectDocumentType(bytes);
      if (!type) return fail("Utilisez un justificatif PDF, JPEG ou PNG.");
      const extension = type === "application/pdf" ? "pdf" : type === "image/png" ? "png" : "jpg";
      proofPath = `${auth.user.id}/${operationId}/${createHash("sha256").update(bytes).digest("hex")}.${extension}`;
      const { error } = await db.storage.from("refund-proofs").upload(proofPath, bytes, { contentType: type, upsert: false });
      // Same operation and same bytes have the same path, making a retry safe.
      if (error && !["409", "Duplicate"].includes(String("statusCode" in error ? error.statusCode : "")) && error.message !== "The resource already exists") return fail("Le justificatif n’a pas pu être enregistré. Réessayez.", 503);
    }
    const { data, error } = await db.rpc("record_client_refund", {
      p_actor: auth.user.id, p_id: operationId, p_payment: paymentId,
      p_amount: Number(amount), p_date: date, p_method: method,
      p_reason: reason, p_reference: reference, p_proof: proofPath,
    });
    // Never remove a proof after an uncertain RPC response: the transaction may have committed.
    if (error) return dbFailure(error.code);
    revalidatePath("/admin/comptabilite", "layout");
    return NextResponse.json({success:true,refund:data}, {headers});
  } catch { return fail("Impossible d’enregistrer. Actualisez avant de réessayer.", 503); }
}
export async function PATCH(request: Request) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.success) return auth.response;
  try {
    const body = await request.json();
    if (!uuid.test(body?.id ?? "") || typeof body.reason !== "string" || !body.reason.trim() || body.reason.trim().length > 1000) return fail("Précisez le remboursement et le motif de correction.");
    const {data,error} = await createServiceClient().rpc("void_client_refund", {p_actor:auth.user.id,p_id:body.id,p_reason:body.reason.trim()});
    if(error) return dbFailure(error.code);
    revalidatePath("/admin/comptabilite", "layout");
    return NextResponse.json({success:true,refund:data}, {headers});
  } catch {return fail("Impossible d’annuler la saisie. Actualisez avant de réessayer.",503);}
}
