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

const PROGRESS_ACTIONS = [
  "request_created",
  "payment_uploaded",
  "payment_confirmed",
  "policy_preparation_started",
  "policy_uploaded_year_1",
  "policy_uploaded_year_2",
  "policy_replaced_year_1",
  "policy_replaced_year_2",
  "whatsapp_sent",
  "request_claimed",
];

export default async function NotificationsPage() {
  const { user, role } = await requireRole([
    "agent",
    "admin",
  ]);

  const serviceClient =
    createServiceClient();

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

  const requestIds =
    (requestsData ?? []).map(
      (request) =>
        request.id,
    );

  let activitiesCount = 0;

  if (requestIds.length > 0) {
    const {
      data: activitiesData,
      error: activitiesError,
    } =
      await serviceClient
        .from("activity_logs")
        .select(`
          request_id,
          action,
          created_at
        `)
        .in(
          "request_id",
          requestIds,
        )
        .in(
          "action",
          PROGRESS_ACTIONS,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

    if (activitiesError) {
      throw new Error(
        activitiesError.message,
      );
    }

    activitiesCount =
      activitiesData?.length ?? 0;
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
            ✓ Activités chargées
          </p>

          <p className="mt-2 text-sm">
            Dossiers : {requestsData?.length ?? 0}
          </p>

          <p className="mt-1 text-sm">
            Activités : {activitiesCount}
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