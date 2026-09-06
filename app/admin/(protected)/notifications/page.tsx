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

export default async function NotificationsPage() {
  const { user, role } = await requireRole([
    "agent",
    "admin",
  ]);

  const serviceClient =
    createServiceClient();

  const {
    data: internalUsersData,
    error: internalUsersError,
  } =
    await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (internalUsersError) {
    throw new Error(
      internalUsersError.message,
    );
  }

  let requestQuery =
    serviceClient
      .from("insurance_requests")
      .select(`
        id,
        request_code,
        status,
        created_at,
        assigned_agent_id,

        client:clients (
          id,
          first_name,
          last_name
        )
      `)
      .in(
        "status",
        ACTION_STATUSES,
      );

  if (role === "agent") {
    requestQuery =
      requestQuery.or(
        `assigned_agent_id.eq.${user.id},assigned_agent_id.is.null`,
      );
  }

  const {
    data: requestsData,
    error: requestsError,
  } =
    await requestQuery.order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (requestsError) {
    throw new Error(
      requestsError.message,
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-7">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-black uppercase tracking-widest text-[#0B5D3B]">
          IF Sigorta
        </p>

        <h1 className="mt-3 text-3xl font-semibold text-[#102B20]">
          Notifications
        </h1>

        <div className="mt-6 rounded-xl bg-[#F3F8F2] p-4 text-[#0B5D3B]">
          <p className="font-semibold">
            ✓ Requête dossiers réussie
          </p>

          <p className="mt-2 text-sm">
            Utilisateurs internes :{" "}
            {internalUsersData.users.length}
          </p>

          <p className="mt-1 text-sm">
            Dossiers chargés :{" "}
            {requestsData?.length ?? 0}
          </p>
        </div>

        <Link
          href="/admin/tableau-de-bord"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}