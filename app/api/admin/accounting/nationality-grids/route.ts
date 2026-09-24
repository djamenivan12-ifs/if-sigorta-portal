import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/requireApiRole";

export async function POST() {
  const auth = await requireApiRole(["admin"]);
  if (!auth.success) return auth.response;
  return NextResponse.json(
    {
      success: false,
      error: "Les tarifs par nationalité sont désactivés. Utilisez les grilles standard.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
