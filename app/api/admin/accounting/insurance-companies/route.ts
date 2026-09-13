import { NextResponse } from "next/server";
import { accountingMutation } from "@/lib/accounting/api";
import { requireApiRole } from "@/lib/auth/requireApiRole";
import { createServiceClient } from "@/lib/supabase/service";
import { collectRows } from "@/lib/supabase/collectRows";
import { record, text, bool, uuid } from "@/lib/accounting/validation";
export async function GET() {
  const auth = await requireApiRole(["admin"]);
  if (!auth.success) return auth.response;
  const db = createServiceClient();
  const result = await collectRows((from, to) =>
    db
      .from("insurance_companies")
      .select("id,name,is_active,updated_at")
      .order("id")
      .range(from, to),
  );
  return NextResponse.json(
    result.error
      ? { success: false, error: "Impossible de charger les assureurs." }
      : { success: true, companies: result.data },
    { status: result.error ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  return accountingMutation(request, "create_company", (v) => {
    const b = record(v);
    return {
      name: text(b.name, "Nom", 120),
      isActive: bool(b.isActive),
      operationId: uuid(b.operationId),
    };
  });
}
