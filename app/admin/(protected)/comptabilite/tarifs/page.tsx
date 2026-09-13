import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
export default async function Page() {
  await requireRole(["admin"]);
  redirect("/admin/comptabilite?tab=rates");
}
