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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

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
      assigned_agent_id,

      client:clients (
        id,
        first_name,
        last_name
      )
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
  } = await requestQuery.order(
    "created_at",
    {
      ascending: false,
    },
  );

  if (requestsError) {
    throw new Error(requestsError.message);
  }

  const firstRequest =
    requestsData?.[0] ?? null;

  let clientName =
    "Client inconnu";

  if (firstRequest?.client) {
    const client = Array.isArray(
      firstRequest.client,
    )
      ? firstRequest.client[0] ?? null
      : firstRequest.client;

    if (client) {
      clientName =
        `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() ||
        "Client inconnu";
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-7">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B5D3B]">
          IF Sigorta
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-[#102B20]">
          Notifications
        </h1>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {!firstRequest ? (
            <div className="p-6 text-sm text-slate-500">
              Aucune notification dossier.
            </div>
          ) : (
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#102B20]">
                    {clientName}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Dossier{" "}
                    {firstRequest.request_code}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-[#F3F8F2] px-3 py-1 text-xs font-semibold text-[#0B5D3B]">
                  {firstRequest.status}
                </span>
              </div>

              <p className="mt-4 text-sm text-slate-600">
                Ce dossier nécessite une
                action dans l’espace
                administrateur.
              </p>

              <p className="mt-3 text-xs text-slate-400">
                {formatDateTime(
                  firstRequest.created_at,
                )}
              </p>

              <div className="mt-5">
                <Link
                  href={`/admin/dossiers/${firstRequest.id}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0B5D3B] px-5 text-sm font-semibold text-white"
                >
                  Voir le dossier
                </Link>
              </div>
            </div>
          )}
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