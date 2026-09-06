import Link from "next/link";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

const ACTION_STATUSES = [
  "draft",
  "waiting_payment",
  "payment_review",
  "payment_confirmed",
  "policy_preparation",
];

const ACTIVE_RENEWAL_STATUSES = [
  "pending",
  "contacted",
  "interested",
];

export default async function NotificationsPage() {
  const { user, role } = await requireRole([
    "agent",
    "admin",
  ]);

  const serviceClient = createServiceClient();

  let requestQuery = serviceClient
    .from("insurance_requests")
    .select(`
      id,
      request_code,
      status,
      created_at,
      assigned_agent_id
    `)
    .in("status", ACTION_STATUSES);

  if (role === "agent") {
    requestQuery = requestQuery.or(
      `assigned_agent_id.eq.${user.id},assigned_agent_id.is.null`,
    );
  }

  const {
    data: requestsData,
    error: requestsError,
  } = await requestQuery;

  if (requestsError) {
    throw new Error(requestsError.message);
  }

  const {
    data: renewalsData,
    error: renewalsError,
  } = await serviceClient
    .from("insurance_renewals")
    .select(`
      id,
      status
    `)
    .in("status", ACTIVE_RENEWAL_STATUSES);

  if (renewalsError) {
    throw new Error(renewalsError.message);
  }

  const requestsCount =
    requestsData?.length ?? 0;

  const renewalsCount =
    renewalsData?.length ?? 0;

  const totalCount =
    requestsCount + renewalsCount;

  const urgentCount =
    (requestsData ?? []).filter(
      (request) =>
        request.status === "payment_review" ||
        request.status === "payment_confirmed",
    ).length;

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-7">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B5D3B]">
            IF Sigorta
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-[#102B20]">
            Notifications
          </h1>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Total
            </p>

            <p className="mt-3 text-3xl font-bold text-[#102B20]">
              {totalCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Dossiers
            </p>

            <p className="mt-3 text-3xl font-bold text-[#102B20]">
              {requestsCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Renouvellements
            </p>

            <p className="mt-3 text-3xl font-bold text-[#102B20]">
              {renewalsCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Prioritaires
            </p>

            <p className="mt-3 text-3xl font-bold text-[#102B20]">
              {urgentCount}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="font-semibold text-[#0B5D3B]">
            ✓ Test des cartes réussi
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Cette étape teste le rendu de la zone
            récapitulative sans afficher encore la liste
            complète des notifications.
          </p>
        </section>

        <Link
          href="/admin/tableau-de-bord"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-[#102B20]"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}