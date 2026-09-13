import { NextResponse } from "next/server";
import { accountingMutation } from "@/lib/accounting/api";
import { requireApiRole } from "@/lib/auth/requireApiRole";
import { createServiceClient } from "@/lib/supabase/service";
import { record, text, bool, uuid, version } from "@/lib/accounting/validation";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.success) return auth.response;
  const { id } = await params;
  const { data, error } = await createServiceClient()
    .from("insurance_companies")
    .select("id,name,is_active,updated_at")
    .eq("id", id)
    .maybeSingle();
  return NextResponse.json(
    error
      ? { success: false, error: "Impossible de charger cet assureur." }
      : data
        ? { success: true, company: data }
        : { success: false, error: "Assureur introuvable." },
    { status: error ? 503 : data ? 200 : 404, headers: { "Cache-Control": "no-store" } },
  );
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return accountingMutation(request, "update_company", (v) => {
    const b = record(v);
    return {
      id: uuid(id),
      name: text(b.name, "Nom", 120),
      isActive: bool(b.isActive),
      version: version(b.version),
    };
  });
}
