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

/** Keep the untouched baseline to reject stale browser edits. */
export function validatePriceGridRequest(body: unknown):
  | { success: true; ranges: PriceRangeInput[]; expectedRanges: PriceRangeInput[] }
  | { success: false; error: string } {
  const submission = validatePriceRanges(body);
  if (!submission.success) return submission;
  if (!isRecord(body) || !Array.isArray(body.expectedRanges) || body.expectedRanges.length > 10000)
    return { success: false, error: "Rechargez la grille avant de l’enregistrer." };
  const expectedRanges: PriceRangeInput[] = [];
  const ids = new Set<number>();
  for (let offset = 0; offset < body.expectedRanges.length; offset += 200) {
    const baseline = validatePriceRanges({ ranges: body.expectedRanges.slice(offset, offset + 200) });
    if (!baseline.success) return baseline;
    for (const row of baseline.ranges) {
      if (row.id === undefined || ids.has(row.id)) return { success: false, error: "La grille initiale est invalide. Rechargez la page." };
      ids.add(row.id); expectedRanges.push(row);
    }
  }
  return { success: true, ranges: submission.ranges, expectedRanges };
}
