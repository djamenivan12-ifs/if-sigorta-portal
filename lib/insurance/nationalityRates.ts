import { createServiceClient } from "@/lib/supabase/service";
import { day } from "@/lib/accounting/model";
import { isCongoBrazzaville, isSkyline } from "./nationality";
export { isCongoBrazzaville } from "./nationality";
export type NationalityRate = {
  id: string;
  insurance_company_id: string;
  nationality: string;
  min_age: number;
  max_age: number;
  one_year_cost: number | string;
  two_year_cost: number | string;
  one_year_price: number | string;
  two_year_price: number | string;
  effective_from: string;
};
export async function skylineNationalityGrid(
  date: Date = new Date(),
): Promise<NationalityRate[]> {
  if (day(date.toISOString()) < "2026-09-17") return [];
  const db = createServiceClient();
  const { data: companies, error: companyError } = await db
    .from("insurance_companies")
    .select("id,name,is_active")
    .eq("is_active", true);
  if (companyError)
    throw new Error(
      "Les tarifs Skyline sont indisponibles. Vérifiez que la mise à jour de la base a été appliquée.",
    );
  const skyline = companies?.filter((c) => isSkyline(c.name));
  if (!skyline || skyline.length !== 1) return [];
  const { data, error } = await db
    .from("insurance_nationality_rates")
    .select("*")
    .eq("insurance_company_id", skyline[0].id)
    .eq("nationality", "CG")
    .lte("effective_from", day(date.toISOString()))
    .order("effective_from", { ascending: false });
  if (error)
    throw new Error("Les tarifs Skyline sont temporairement indisponibles.");
  // Select the latest complete grid before matching age; never fall back to an older bracket.
  const effective = data?.[0]?.effective_from;
  return (data ?? [])
    .filter((r) => r.effective_from === effective)
    .sort((a, b) => a.min_age - b.min_age);
}
export async function skylineNationalityRate(
  age: number,
  nationality: unknown,
  date: Date = new Date(),
): Promise<NationalityRate | null> {
  if (!isCongoBrazzaville(nationality)) return null;
  const grid = await skylineNationalityGrid(date);
  return grid.find((r) => r.min_age <= age && r.max_age >= age) ?? null;
}
export function nationalityAmounts(rate: NationalityRate, duration: 1 | 2) {
  return {
    cost: Number(duration === 1 ? rate.one_year_cost : rate.two_year_cost),
    price: Number(duration === 1 ? rate.one_year_price : rate.two_year_price),
  };
}
