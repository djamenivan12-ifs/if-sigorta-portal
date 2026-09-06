import Link from "next/link";

export default function NotificationsTestPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Test notifications
        </h1>

        <p className="mt-3 text-slate-600">
          Si vous voyez cette page sur iPhone, la route admin fonctionne correctement.
        </p>

        <Link
          href="/admin/dashboard"
          className="mt-6 inline-flex rounded-xl bg-green-700 px-4 py-3 font-semibold text-white"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}