import type { SupabaseClient } from "@supabase/supabase-js";
export async function hasQuoteSchema(db: SupabaseClient): Promise<boolean> {
  const { error } = await db
    .from("insurance_requests")
    .select("quote_nationality,nationality_rate_id")
    .limit(0);
  if (!error) return true;
  if (["42703", "PGRST204"].includes(error.code)) return false;
  throw new Error(
    "Impossible de vérifier la configuration des devis. Réessayez.",
  );
}

export type RequestPricingSnapshot = {
  id: string;
  status: string;
  assigned_agent_id: string | null;
  calculated_age: number | null;
  insurance_duration_years: number | null;
  insurance_company_id: string | null;
  insurance_cost_rate_id: string | null;
  actual_insurance_cost: number | string | null;
  created_at: string;
  quote_nationality?: string | null;
  nationality_rate_id?: string | null;
  client:
    { nationality: string | null } | { nationality: string | null }[] | null;
};
