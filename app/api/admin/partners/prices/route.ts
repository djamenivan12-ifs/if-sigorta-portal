import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/requireApiRole";
import { createServiceClient } from "@/lib/supabase/service";
import { validatePriceRanges } from "@/lib/insurance/validatePriceRanges";
import { hasOverlappingRanges } from "@/lib/insurance/priceRanges";

const headers = { "Cache-Control": "no-store" };

export async function PUT(request: Request) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.success) return auth.response;
  const body = await request.json().catch(() => null);
  const validation = validatePriceRanges(body);
  if (!validation.success) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400, headers });
  }
  if (body.confirmAll !== true || typeof body.revision !== "string" || !/^[a-f0-9]{32}$/.test(body.revision)) {
    return NextResponse.json({ success: false, error: "Confirmez l’application à tous les partenaires depuis une grille à jour." }, { status: 400, headers });
  }
  if (hasOverlappingRanges(validation.ranges)) {
    return NextResponse.json({ success: false, error: "Les tranches d’âge actives ne doivent pas se chevaucher." }, { status: 400, headers });
  }
  try {
    const { data, error } = await createServiceClient().rpc("save_all_partner_price_grids", {
      p_ranges: validation.ranges.map(({ minimumAge, maximumAge, oneYearPrice, twoYearPrice, isActive }) =>
        ({ minimumAge, maximumAge, oneYearPrice, twoYearPrice, isActive })),
      p_revision: body.revision,
    });
    if (error) {
      const conflict = ["PT409", "40001", "P0002"].includes(error.code);
      const invalid = ["22023", "23514", "23P01", "22003", "22P02"].includes(error.code);
      return NextResponse.json({ success: false, error: conflict
        ? "Un partenaire ou ses tarifs ont changé. Rechargez cette page avant de réessayer."
        : invalid ? "Les tranches ou les montants sont invalides. Aucun tarif n’a été modifié."
        : "L’enregistrement a échoué. Rechargez la page pour vérifier les tarifs avant de réessayer." },
      { status: conflict ? 409 : invalid ? 400 : 500, headers });
    }
    return NextResponse.json({ success: true, ...data }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: "L’enregistrement a été interrompu. Rechargez la page pour vérifier les tarifs." }, { status: 500, headers });
  }
}
