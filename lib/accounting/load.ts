import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { collectRows } from "@/lib/supabase/collectRows";
import { listAllUsers } from "@/lib/supabase/listAllUsers";
import type { AccountingData } from "./model";
export async function loadAccounting(): Promise<AccountingData> {
  const db = createServiceClient();
  async function rows(table: string, columns: string) {
    const result = await collectRows((from, to) =>
      db.from(table).select(columns).order("id").range(from, to),
    );
    if (result.error)
      throw new Error("Les données comptables sont temporairement indisponibles. Réessayez.");
    return result.data as unknown as Record<string, unknown>[];
  }
  const [companies, rates, deposits, requests, payments, history, users] = await Promise.all([
    rows("insurance_companies", "id,name,is_active,updated_at"),
    rows(
      "insurance_cost_rates",
      "id,insurance_company_id,min_age,max_age,duration_years,real_cost,effective_from,is_active,updated_at",
    ),
    rows(
      "insurance_company_deposits",
      "id,insurance_company_id,amount,deposit_date,payment_method,reference,note,created_by,created_at",
    ),
    rows(
      "insurance_requests",
      "id,request_code,insurance_company_id,calculated_age,insurance_duration_years,actual_insurance_cost,insurance_company_selected_at,status",
    ),
    rows("payments", "id,request_id,expected_amount,status,verified_at"),
    rows(
      "insurance_cost_rate_history",
      "id,insurance_company_id,insurance_cost_rate_id,min_age,max_age,duration_years,real_cost,effective_from,is_active,changed_by,changed_at",
    ),
    listAllUsers(db),
  ]);
  const authorIds = new Set([
    ...deposits.map((d) => d.created_by),
    ...history.map((h) => h.changed_by),
  ]);
  const authors = Object.fromEntries(
    users.data.users
      .filter((u) => authorIds.has(u.id))
      .map((u) => [
        u.id,
        String(u.user_metadata?.full_name || u.user_metadata?.name || u.email || "Administrateur"),
      ]),
  );
  return {
    companies,
    rates,
    deposits,
    requests,
    payments,
    history,
    authors,
    loadedAt: new Date().toISOString(),
  } as unknown as AccountingData;
}
