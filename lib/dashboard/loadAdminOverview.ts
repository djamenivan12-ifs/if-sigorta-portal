import "server-only";
import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";
import { listAllUsers } from "@/lib/supabase/listAllUsers";
import { PROGRESS_ACTIONS, type ActivityRow } from "./model";
import type { TeamMember } from "./adminOverview";

export async function loadAdminOverview() {
  await requireRole(["admin"]);
  const db = createServiceClient();
  const [team, activity] = await Promise.all([
    (async (): Promise<TeamMember[] | null> => {
      const { data, error } = await listAllUsers(db);
      if (error) return null;
      return data.users.flatMap((user) => {
        const role = user.app_metadata?.role;
        if (role !== "agent" && role !== "admin") return [];
        const name = [
          user.user_metadata?.first_name,
          user.user_metadata?.last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        return [
          { id: user.id, name: name || user.email || "Compte interne", role },
        ];
      });
    })().catch(() => null),
    (async (): Promise<ActivityRow[] | null> => {
      const { data, error } = await db
        .from("activity_logs")
        .select("id,request_id,action,created_at")
        .in("action", PROGRESS_ACTIONS)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(6);
      return error ? null : (data as ActivityRow[]);
    })().catch(() => null),
  ]);
  return { team, activity };
}
