import { requireRole } from "@/lib/auth/requireRole";

export default async function DashboardTestPage() {
  const { user, role } = await requireRole([
    "agent",
    "admin",
  ]);

  return (
    <main className="min-h-screen bg-white p-8">
      <h1 className="text-3xl font-bold">
        Dashboard test
      </h1>

      <p className="mt-4">
        {user.email}
      </p>

      <p className="mt-2">
        Rôle : {role}
      </p>
    </main>
  );
}