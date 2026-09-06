import { requireRole } from "@/lib/auth/requireRole";

export default async function DashboardPage() {
  const { user, role } = await requireRole([
    "agent",
    "admin",
  ]);

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-semibold text-[#0B5D3B]">
          IF Sigorta
        </p>

        <h1 className="mt-3 text-3xl font-bold text-[#102B20]">
          Tableau de bord test
        </h1>

        <div className="mt-6 space-y-2 text-sm text-slate-600">
          <p>
            Utilisateur : {user.email}
          </p>

          <p>
            Rôle : {role}
          </p>

          <p className="font-semibold text-emerald-700">
            ✓ Le tableau de bord minimal fonctionne.
          </p>
        </div>
      </div>
    </main>
  );
}