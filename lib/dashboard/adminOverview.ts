import { dashboard, type DashboardData, type Period } from "./model";

export type TeamMember = { id: string; name: string; role: "admin" | "agent" };
export type OverviewFilter =
  "actions" | "queue" | "payments" | "policies" | "new";
export function adminOverview(
  data: DashboardData,
  period: Period,
  team: TeamMember[] | null,
) {
  const model = dashboard(data, period);
  const payments = model.actions.filter((r) => r.status === "payment_review");
  const policies = model.actions.filter((r) =>
    ["payment_confirmed", "policy_preparation"].includes(r.status),
  );
  const counts = new Map<string, number>();
  const selectedIds = new Set(model.selected.map((row) => row.id));
  const teamIds = new Set(team?.map((member) => member.id));
  for (const row of model.actions) {
    if (row.assigned_agent_id)
      counts.set(
        row.assigned_agent_id,
        (counts.get(row.assigned_agent_id) ?? 0) + 1,
      );
  }
  const workload =
    team === null
      ? null
      : team
          .map((member) => ({ ...member, count: counts.get(member.id) ?? 0 }))
          .sort(
            (a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"),
          );
  const unknownAssignments =
    team === null
      ? 0
      : [...counts]
          .filter(([id]) => !teamIds.has(id))
          .reduce((sum, [, count]) => sum + count, 0);
  return {
    model,
    payments,
    policies,
    workload,
    unknownAssignments,
    lists: {
      actions: model.actions,
      queue: model.queue,
      payments,
      policies,
      new: model.recent.filter((r) => selectedIds.has(r.id)),
    },
  };
}
