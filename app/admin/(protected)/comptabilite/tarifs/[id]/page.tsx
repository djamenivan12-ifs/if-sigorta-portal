import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin"]);
  const { id } = await params;
  redirect("/admin/comptabilite?tab=rates&edit=" + encodeURIComponent(id));
}
