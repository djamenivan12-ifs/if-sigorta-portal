import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/requireApiRole";
import { createServiceClient } from "@/lib/supabase/service";
import { validatePriceGridRequest } from "@/lib/insurance/validatePriceRanges";
import { savePriceRanges, PriceGridError } from "@/lib/insurance/savePriceRanges";
const headers = { "Cache-Control": "no-store" };
export async function PUT(request: Request) {
    const auth = await requireApiRole(["admin"]);
    if (!auth.success)
        return auth.response;
    const validation = validatePriceGridRequest(await request.json().catch(() => null));
    if (!validation.success)
        return NextResponse.json({ success: false, error: validation.error }, { status: 400, headers });
    try {
        const db = createServiceClient();
        const ranges = await savePriceRanges(db, validation.ranges, undefined, validation.expectedRanges);
        return NextResponse.json({ success: true, ranges }, { headers });
    }
    catch (error) {
        if (error instanceof PriceGridError)
            return NextResponse.json({ success: false, error: error.message }, { status: error.status, headers });
        console.error("Enregistrement tarifaire interrompu.");
        return NextResponse.json({ success: false, error: "L’enregistrement a été interrompu. Rechargez la grille avant de réessayer." }, { status: 500, headers });
    }
}
