import { requireRole } from "@/lib/auth/requireRole";
import CreateForm from "./CreateForm";
export default async function Page() {
  await requireRole(["admin"]);
  return <CreateForm />;
}
