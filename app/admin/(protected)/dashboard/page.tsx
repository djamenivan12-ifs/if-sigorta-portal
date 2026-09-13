import { requireRole } from "@/lib/auth/requireRole";
import { loadDashboard } from "@/lib/dashboard/load";
import OperationsDashboard from "@/components/admin/dashboard/OperationsDashboard";
export default async function Page() {
  const { user, role } = await requireRole(["admin", "agent"]);
  const name = String(
    user.user_metadata?.first_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      (role === "admin" ? "Administrateur" : "Agent"),
  );
  return (
    <OperationsDashboard
      data={await loadDashboard({ role, userId: user.id, userName: name })}
    />
  );
}
