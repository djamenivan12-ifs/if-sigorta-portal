import Link from "next/link";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

const ACTIVE_RENEWAL_STATUSES = [
  "pending",
  "contacted",
  "interested",
];

function getDaysRemaining(
  policyEndDate: string,
) {
  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const end = new Date(
    `${policyEndDate}T00:00:00`,
  );

  if (Number.isNaN(end.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.ceil(
    (end.getTime() - today.getTime()) /
      86_400_000,
  );
}

export default async function NotificationsPage() {
  const { user, role } =
    await requireRole([
      "agent",
      "admin",
    ]);

  const serviceClient =
    createServiceClient();

  const {
    data: renewalsData,
    error: renewalsError,
  } =
    await serviceClient
      .from("insurance_renewals")
      .select(`
        id,
        status,

        request:insurance_requests!insurance_renewals_request_id_fkey (
          id,
          request_code,
          assigned_agent_id,
          policy_end_date,

          client:clients (
            id,
            first_name,
            last_name,
            whatsapp_country_code,
            whatsapp_number
          )
        )
      `)
      .in(
        "status",
        ACTIVE_RENEWAL_STATUSES,
      );

  if (renewalsError) {
    throw new Error(
      renewalsError.message,
    );
  }

  const processedRenewals =
    (renewalsData ?? [])
      .map((renewal) => {
        const request =
          Array.isArray(renewal.request)
            ? renewal.request[0] ?? null
            : renewal.request;

        if (!request?.policy_end_date) {
          return null;
        }

        if (
          role === "agent" &&
          request.assigned_agent_id !==
            user.id &&
          request.assigned_agent_id !==
            null
        ) {
          return null;
        }

        const client =
          Array.isArray(request.client)
            ? request.client[0] ?? null
            : request.client;

        return {
          id: renewal.id,

          requestCode:
            request.request_code,

          clientName:
            client
              ? `${client.first_name} ${client.last_name}`.trim()
              : "Client inconnu",

          policyEndDate:
            request.policy_end_date,

          daysRemaining:
            getDaysRemaining(
              request.policy_end_date,
            ),
        };
      })
      .filter(
        (
          renewal,
        ): renewal is NonNullable<
          typeof renewal
        > => renewal !== null,
      );

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
            ✓ Traitement des renouvellements réussi
          </p>

          <p className="mt-2 text-sm">
            Renouvellements traités :{" "}
            {processedRenewals.length}
          </p>

          {processedRenewals[0] && (
            <div className="mt-4 rounded-xl bg-white p-3 text-sm">
              <p>
                Dossier :{" "}
                {processedRenewals[0].requestCode}
              </p>

              <p className="mt-1">
                Client :{" "}
                {processedRenewals[0].clientName}
              </p>

              <p className="mt-1">
                Jours restants :{" "}
                {processedRenewals[0].daysRemaining}
              </p>
            </div>
          )}
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