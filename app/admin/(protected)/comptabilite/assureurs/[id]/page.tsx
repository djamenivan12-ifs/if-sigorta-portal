import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import { loadAccounting } from "@/lib/accounting/load";
import Dashboard from "@/components/admin/accounting/Dashboard";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin"]);
  const { id } = await params;
  const data = await loadAccounting();
  if (!data.companies.some((c) => c.id === id)) notFound();
  return <Dashboard data={data} initialCompany={id} />;
}
