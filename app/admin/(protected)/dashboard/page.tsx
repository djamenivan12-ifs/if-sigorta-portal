import { requireRole } from "@/lib/auth/requireRole";
import { loadDashboard } from "@/lib/dashboard/load";
import OperationsDashboard from "@/components/admin/dashboard/OperationsDashboard";
import AdminOverview from "@/components/admin/dashboard/AdminOverview";
import { loadAdminOverview } from "@/lib/dashboard/loadAdminOverview";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { user, role } = await requireRole(["admin", "agent"]);
  const name = String(
    user.user_metadata?.first_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      (role === "admin" ? "Administrateur" : "Agent"),
  );
  const params = await searchParams;
  const scope = { role, userId: user.id, userName: name };
  if (role === "admin" && params.view !== "analysis") {
    const [data, extra] = await Promise.all([
      loadDashboard(scope),
      loadAdminOverview(),
    ]);
    return (
      <AdminOverview data={data} team={extra.team} activity={extra.activity} />
    );
  }
  return (
    <OperationsDashboard
      data={await loadDashboard({ role, userId: user.id, userName: name })}
    />
  );
}
