import { requireRole } from "@/lib/auth/requireRole";
import { loadDashboard } from "@/lib/dashboard/load";
import OperationsDashboard from "./OperationsDashboard";
export default async function AgentDashboard() {
  const { user, role } = await requireRole(["agent", "admin"]);
  return (
    <OperationsDashboard
      data={await loadDashboard({
        role,
        userId: user.id,
        userName: String(
          user.user_metadata?.first_name || user.user_metadata?.name || "Agent",
        ),
      })}
    />
  );
}
