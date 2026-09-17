import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";
import { hasOverlappingRanges } from "./priceRanges";
import type { PriceRangeInput } from "./validatePriceRanges";

export class PriceGridError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** All grid writes, replacement and conflict checks commit in one database transaction. */
export async function savePriceRanges(
  db: ReturnType<typeof createServiceClient>,
  ranges: PriceRangeInput[],
  partnerId: string | undefined,
  expected: PriceRangeInput[],
): Promise<PriceRangeInput[]> {
  const existingIds = new Set(expected.map(row => row.id));
  if (ranges.some(row => row.id !== undefined && !existingIds.has(row.id)))
    throw new PriceGridError("La grille a changé ou contient un tarif qui ne lui appartient pas. Rechargez la page.", 409);
  const submittedIds = new Set(ranges.map(row => row.id));
  const retained = partnerId ? [] : expected.filter(row => !submittedIds.has(row.id));
  if (hasOverlappingRanges([...retained, ...ranges]))
    throw new PriceGridError("Les tranches d’âge actives ne doivent pas se chevaucher, y compris avec les tarifs déjà enregistrés.", 400);
  const { data, error } = await db.rpc("save_price_grid", {
    p_ranges: ranges,
    p_expected: [...expected].sort((a, b) => a.id! - b.id!),
    p_partner_id: partnerId ?? null,
  });
  if (error) {
    if (["40001", "P0002"].includes(error.code))
      throw new PriceGridError("La grille a changé entre-temps. Rechargez la page avant de réessayer.", 409);
    if (["23P01", "23514", "22023", "22003", "22P02"].includes(error.code))
      throw new PriceGridError("Les valeurs tarifaires sont invalides ou les tranches actives se chevauchent.", 400);
    if (["PGRST202", "42883"].includes(error.code))
      throw new PriceGridError("La mise à jour sécurisée des tarifs n’est pas encore installée. Aucun tarif n’a été modifié.", 503);
    throw new Error("Enregistrement transactionnel des tarifs impossible.");
  }
  if (!Array.isArray(data)) throw new Error("Réponse tarifaire invalide.");
  return (data as PriceRangeInput[]).sort((a,b)=>a.minimumAge-b.minimumAge || a.id!-b.id!);
}
