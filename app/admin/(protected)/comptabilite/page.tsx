import { requireRole } from "@/lib/auth/requireRole";
import { loadAccounting } from "@/lib/accounting/load";
import Dashboard from "@/components/admin/accounting/Dashboard";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; edit?: string; q?: string }>;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  return (
    <Dashboard
      key={`${params.tab ?? "overview"}:${params.q ?? ""}`}
      data={await loadAccounting()}
      initialSearch={params.q ?? ""}
      initialTab={params.tab === "history" ? "history" : params.tab === "refunds" ? "refunds" : params.tab === "rates" ? "rates" : "overview"}
      initialEdit={params.edit ?? ""}
    />
  );
}
