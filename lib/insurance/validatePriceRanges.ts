export type PriceRangeInput = {
    id?: number;
    minimumAge: number;
    maximumAge: number;
    oneYearPrice: number;
    twoYearPrice: number;
    isActive: boolean;
};
export type PriceRangesValidation = {
    success: true;
    ranges: PriceRangeInput[];
} | {
    success: false;
    error: string;
};
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
export function validatePriceRanges(body: unknown): PriceRangesValidation {
    if (!isRecord(body) || !Array.isArray(body.ranges) || !body.ranges.length || body.ranges.length > 200)
        return { success: false, error: "La grille doit contenir entre 1 et 200 tranches tarifaires." };
    const ranges: PriceRangeInput[] = [], ids = new Set<number>();
    for (const value of body.ranges) {
        if (!isRecord(value) || typeof value.isActive !== "boolean")
            return { success: false, error: "Une tranche tarifaire est invalide." };
        const { id, minimumAge, maximumAge, oneYearPrice, twoYearPrice, isActive } = value;
        if (id !== undefined && (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0 || ids.has(id)))
            return { success: false, error: "Un identifiant tarifaire est invalide ou présent plusieurs fois." };
        if (typeof minimumAge !== "number" || typeof maximumAge !== "number" || !Number.isSafeInteger(minimumAge) || !Number.isSafeInteger(maximumAge) || minimumAge < 0 || maximumAge < minimumAge)
            return { success: false, error: "Une tranche d’âge est invalide." };
        if (typeof oneYearPrice !== "number" || typeof twoYearPrice !== "number" || !Number.isFinite(oneYearPrice) || !Number.isFinite(twoYearPrice) || oneYearPrice <= 0 || twoYearPrice <= 0)
            return { success: false, error: "Un tarif est invalide." };
        if (id !== undefined)
            ids.add(id);
        ranges.push({ ...(id === undefined ? {} : { id }), minimumAge, maximumAge, oneYearPrice, twoYearPrice, isActive });
    }
    return { success: true, ranges };
}
