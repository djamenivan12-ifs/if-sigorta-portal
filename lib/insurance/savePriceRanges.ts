import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";
import { collectRows } from "@/lib/supabase/collectRows";
import { hasOverlappingRanges } from "./priceRanges";
import type { PriceRangeInput } from "./validatePriceRanges";
export class PriceGridError extends Error {
    constructor(message: string, public status: number) { super(message); }
}
/** Preserve direct-grid merge and partner-grid replacement semantics. Not a DB transaction. */
export async function savePriceRanges(db: ReturnType<typeof createServiceClient>, ranges: PriceRangeInput[], partnerId?: string): Promise<PriceRangeInput[]> {
    const table = partnerId ? "partner_price_ranges" : "insurance_price_ranges";
    let query = db.from(table).select("id,minimum_age,maximum_age,one_year_price,two_year_price,is_active").order("id");
    if (partnerId)
        query = query.eq("partner_id", partnerId);
    const { data: rows, error } = await collectRows((from, to) => query.range(from, to));
    if (error)
        throw new Error("Lecture des tarifs impossible.");
    const existing: PriceRangeInput[] = rows.map(row => ({ id: Number(row.id), minimumAge: Number(row.minimum_age), maximumAge: Number(row.maximum_age), oneYearPrice: Number(row.one_year_price), twoYearPrice: Number(row.two_year_price), isActive: row.is_active }));
    const existingIds = new Set(existing.map(row => row.id));
    if (ranges.some(row => row.id !== undefined && !existingIds.has(row.id)))
        throw new PriceGridError("La grille a changé ou contient un tarif qui ne lui appartient pas. Rechargez la page.", 409);
    const submittedIds = new Set(ranges.map(row => row.id).filter(id => id !== undefined));
    const retained = partnerId ? [] : existing.filter(row => !submittedIds.has(row.id!));
    if (hasOverlappingRanges([...retained, ...ranges]))
        throw new PriceGridError("Les tranches d’âge actives ne doivent pas se chevaucher, y compris avec les tarifs déjà enregistrés.", 400);
    const saved: PriceRangeInput[] = [];
    for (const range of ranges) {
        const values = { minimum_age: range.minimumAge, maximum_age: range.maximumAge, one_year_price: range.oneYearPrice, two_year_price: range.twoYearPrice, is_active: range.isActive };
        if (range.id !== undefined) {
            let update = db.from(table).update({ ...values, updated_at: new Date().toISOString() }).eq("id", range.id);
            if (partnerId)
                update = update.eq("partner_id", partnerId);
            const { data, error } = await update.select("id").maybeSingle();
            if (error)
                throw new Error("Mise à jour tarifaire interrompue.");
            if (!data)
                throw new PriceGridError("Un tarif a été supprimé pendant l’enregistrement. Rechargez la page.", 409);
            saved.push({ ...range, id: Number(data.id) });
        }
        else {
            const { data, error } = await db.from(table).insert({ ...values, ...(partnerId ? { partner_id: partnerId } : {}) }).select("id").single();
            if (error || !data)
                throw new Error("Création tarifaire interrompue.");
            saved.push({ ...range, id: Number(data.id) });
        }
    }
    // Do not remove the previous rows before all requested saves have succeeded.
    if (partnerId) {
        const idsToDelete = existing.map(row => row.id!).filter(id => !submittedIds.has(id));
        if (idsToDelete.length) {
            const { error } = await db.from(table).delete().eq("partner_id", partnerId).in("id", idsToDelete);
            if (error)
                throw new Error("Suppression tarifaire interrompue.");
        }
    }
    return [...retained, ...saved].sort((a, b) => a.minimumAge - b.minimumAge || (a.id ?? 0) - (b.id ?? 0));
}
