import { requireRole } from "@/lib/auth/requireRole";
import { loadAccounting } from "@/lib/accounting/load";
import Dashboard from "@/components/admin/accounting/Dashboard";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; edit?: string }>;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  return (
    <Dashboard
      data={await loadAccounting()}
      initialTab={params.tab === "refunds" ? "refunds" : params.tab === "rates" ? "rates" : "overview"}
      initialEdit={params.edit ?? ""}
    />
  );
}
