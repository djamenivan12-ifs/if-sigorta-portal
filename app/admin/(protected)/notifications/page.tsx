import Link from "next/link";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

const ACTIVE_RENEWAL_STATUSES = [
  "pending",
  "contacted",
  "interested",
];

export default async function NotificationsPage() {
  const { role } = await requireRole([
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
            ✓ Renouvellements chargés
          </p>

          <p className="mt-2 text-sm">
            Rôle : {role}
          </p>

          <p className="mt-1 text-sm">
            Renouvellements : {renewalsData?.length ?? 0}
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