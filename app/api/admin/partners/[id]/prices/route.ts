import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/requireApiRole";
import { createServiceClient } from "@/lib/supabase/service";
import { validatePriceRanges } from "@/lib/insurance/validatePriceRanges";
import { savePriceRanges, PriceGridError } from "@/lib/insurance/savePriceRanges";
const headers = { "Cache-Control": "no-store" };
export async function PUT(request: Request, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const auth = await requireApiRole(["admin"]);
    if (!auth.success)
        return auth.response;
    const validation = validatePriceRanges(await request.json().catch(() => null));
    if (!validation.success)
        return NextResponse.json({ success: false, error: validation.error }, { status: 400, headers });
    try {
        const db = createServiceClient();
        const { id: partnerId } = await context.params;
        if (!partnerId)
            return NextResponse.json({ success: false, error: "Partenaire invalide." }, { status: 400, headers });
        const { data: partner, error } = await db.from("partners").select("id").eq("id", partnerId).maybeSingle();
        if (error)
            throw new Error("Lecture du partenaire impossible.");
        if (!partner)
            return NextResponse.json({ success: false, error: "Partenaire introuvable." }, { status: 404, headers });
        const ranges = await savePriceRanges(db, validation.ranges, partnerId);
        return NextResponse.json({ success: true, ranges }, { headers });
    }
    catch (error) {
        if (error instanceof PriceGridError)
            return NextResponse.json({ success: false, error: error.message }, { status: error.status, headers });
        console.error("Enregistrement tarifaire interrompu.");
        return NextResponse.json({ success: false, error: "L’enregistrement a été interrompu. Rechargez la grille avant de réessayer." }, { status: 500, headers });
    }
}
