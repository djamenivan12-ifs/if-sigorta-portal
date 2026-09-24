import { collectRows } from "@/lib/supabase/collectRows";
export const extensionTables = [
  "client_refunds",
  "insurance_company_withdrawals",
  "insurance_nationality_rates",
  "insurer_request_events",
  "accounting_capture_metadata",
] as const;
export async function readAccountingRows(
  table: string,
  load: Parameters<typeof collectRows<unknown>>[0],
) {
  const result = await collectRows(load);
  if (result.error) {
    const code = (result.error as { code?: string }).code;
    if (
      extensionTables.some((name) => name === table) &&
      ["PGRST205", "42P01"].includes(code ?? "")
    ) {
      return { data: [], missing: true };
    }
    console.error("Accounting read failed", { table, code });
    throw new Error(
      "Les données comptables sont temporairement indisponibles. Réessayez.",
    );
  }
  return { data: result.data as Record<string, unknown>[], missing: false };
}
