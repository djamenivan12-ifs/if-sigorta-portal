import Link from "next/link";

import StickyHorizontalScroll from "@/components/admin/layout/StickyHorizontalScroll";
import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type ClientRelation =
  | {
      id: string;
      first_name: string;
      last_name: string;
      whatsapp_country_code: string | null;
      whatsapp_number: string | null;
    }
  | Array<{
      id: string;
      first_name: string;
      last_name: string;
      whatsapp_country_code: string | null;
      whatsapp_number: string | null;
    }>
  | null;

type RequestRelation =
  | {
      id: string;
      request_code: string;
      status: string;
      assigned_agent_id: string | null;
      policy_start_date: string | null;
      policy_end_date: string | null;
      client: ClientRelation;
    }
  | Array<{
      id: string;
      request_code: string;
      status: string;
      assigned_agent_id: string | null;
      policy_start_date: string | null;
      policy_end_date: string | null;
      client: ClientRelation;
    }>
  | null;

type RenewalRow = {
  id: string;
  request_id: string;
  client_id: string;
  status: string;
  reminder_30_sent_at: string | null;
  reminder_15_sent_at: string | null;
  reminder_7_sent_at: string | null;
  contacted_at: string | null;
  renewed_request_id: string | null;
  created_at: string;
  updated_at: string;
  request: RequestRelation;
};

type RenewalPriority =
  | "expired"
  | "urgent"
  | "soon"
  | "watch"
  | "later";

type RenewalView = {
  id: string;
  requestId: string;
  requestCode: string;
  clientId: string;
  clientName: string;
  whatsapp: string;
  policyStartDate: string | null;
  policyEndDate: string;
  daysRemaining: number;
  priority: RenewalPriority;
  renewalStatus: string;
  assignedAgentId: string | null;
};

const renewalStatusLabels: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "À traiter",
    className: "bg-amber-100 text-amber-800",
  },

  contacted: {
    label: "Contacté",
    className: "bg-blue-100 text-blue-800",
  },

  interested: {
    label: "Intéressé",
    className: "bg-violet-100 text-violet-800",
  },

  renewed: {
    label: "Renouvelé",
    className: "bg-emerald-100 text-emerald-800",
  },

  declined: {
    label: "Refusé",
    className: "bg-slate-200 text-slate-700",
  },
};

function unwrapRequest(
  relation: RequestRelation,
) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function unwrapClient(
  relation: ClientRelation,
) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "long",
    },
  ).format(date);
}

function getStartOfToday() {
  const now =
    new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
}

function getDaysRemaining(
  policyEndDate: string,
) {
  const today =
    getStartOfToday();

  const end =
    new Date(
      `${policyEndDate}T00:00:00`,
    );

  if (
    Number.isNaN(
      end.getTime(),
    )
  ) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.ceil(
    (
      end.getTime() -
      today.getTime()
    ) /
      86_400_000,
  );
}

function getPriority(
  daysRemaining: number,
): RenewalPriority {
  if (
    daysRemaining < 0
  ) {
    return "expired";
  }

  if (
    daysRemaining <= 7
  ) {
    return "urgent";
  }

  if (
    daysRemaining <= 15
  ) {
    return "soon";
  }

  if (
    daysRemaining <= 30
  ) {
    return "watch";
  }

  return "later";
}

function getPriorityInfo(
  priority: RenewalPriority,
) {
  switch (priority) {
    case "expired":
      return {
        label: "Expiré",
        className:
          "bg-red-100 text-red-800",
      };

    case "urgent":
      return {
        label: "≤ 7 jours",
        className:
          "bg-red-50 text-red-700",
      };

    case "soon":
      return {
        label: "≤ 15 jours",
        className:
          "bg-orange-100 text-orange-800",
      };

    case "watch":
      return {
        label: "≤ 30 jours",
        className:
          "bg-amber-100 text-amber-800",
      };

    default:
      return {
        label: "> 30 jours",
        className:
          "bg-slate-100 text-slate-700",
      };
  }
}

function formatRemaining(
  daysRemaining: number,
) {
  if (
    daysRemaining < 0
  ) {
    const absolute =
      Math.abs(
        daysRemaining,
      );

    return `Expiré depuis ${absolute} jour${
      absolute !== 1
        ? "s"
        : ""
    }`;
  }

  if (
    daysRemaining === 0
  ) {
    return "Expire aujourd’hui";
  }

  return `${daysRemaining} jour${
    daysRemaining !== 1
      ? "s"
      : ""
  } restant${
    daysRemaining !== 1
      ? "s"
      : ""
  }`;
}

export default async function RenewalsPage() {
  const {
    user,
    role,
  } =
    await requireRole([
      "admin",
      "agent",
    ]);

  const serviceClient =
    createServiceClient();

  const {
    data,
    error,
  } =
    await serviceClient
      .from(
        "insurance_renewals",
      )
      .select(
        `
          id,
          request_id,
          client_id,
          status,
          reminder_30_sent_at,
          reminder_15_sent_at,
          reminder_7_sent_at,
          contacted_at,
          renewed_request_id,
          created_at,
          updated_at,

          request:insurance_requests!insurance_renewals_request_id_fkey (
            id,
            request_code,
            status,
            assigned_agent_id,
            policy_start_date,
            policy_end_date,

            client:clients (
              id,
              first_name,
              last_name,
              whatsapp_country_code,
              whatsapp_number
            )
          )
        `,
      )
      .order(
        "updated_at",
        {
          ascending: false,
        },
      );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const rows =
    (data ??
      []) as unknown as RenewalRow[];

  const renewals:
    RenewalView[] =
    rows
      .map(
        (
          renewal,
        ) => {
          const request =
            unwrapRequest(
              renewal.request,
            );

          if (
            !request ||
            !request.policy_end_date
          ) {
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
            unwrapClient(
              request.client,
            );

          const daysRemaining =
            getDaysRemaining(
              request.policy_end_date,
            );

          const whatsapp =
            client
              ? `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`.trim()
              : "";

          return {
            id:
              renewal.id,

            requestId:
              request.id,

            requestCode:
              request.request_code,

            clientId:
              client?.id ??
              renewal.client_id,

            clientName:
              client
                ? `${client.first_name} ${client.last_name}`.trim()
                : "Client inconnu",

            whatsapp,

            policyStartDate:
              request.policy_start_date,

            policyEndDate:
              request.policy_end_date,

            daysRemaining,

            priority:
              getPriority(
                daysRemaining,
              ),

            renewalStatus:
              renewal.status,

            assignedAgentId:
              request.assigned_agent_id,
          };
        },
      )
      .filter(
        (
          value,
        ): value is RenewalView =>
          value !== null,
      )
      .sort(
        (
          first,
          second,
        ) =>
          first.daysRemaining -
          second.daysRemaining,
      );

  const activeRenewals =
    renewals.filter(
      (renewal) =>
        renewal.renewalStatus !==
          "renewed" &&
        renewal.renewalStatus !==
          "declined",
    );

  const expiredCount =
    activeRenewals.filter(
      (renewal) =>
        renewal.priority ===
        "expired",
    ).length;

  const urgentCount =
    activeRenewals.filter(
      (renewal) =>
        renewal.priority ===
        "urgent",
    ).length;

  const soonCount =
    activeRenewals.filter(
      (renewal) =>
        renewal.priority ===
        "soon",
    ).length;

  const watchCount =
    activeRenewals.filter(
      (renewal) =>
        renewal.priority ===
        "watch",
    ).length;

  const completedCount =
    renewals.filter(
      (renewal) =>
        renewal.renewalStatus ===
        "renewed",
    ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
                CRM
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Renouvellements
              </h1>

              <p className="mt-2 max-w-3xl text-slate-600">
                Suivez les assurances proches de leur date d’expiration et contactez les clients au bon moment.
              </p>
            </div>

            <Link
              href="/admin/tableau-de-bord"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← Tableau de bord
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Expirés"
            value={
              expiredCount
            }
            className="bg-red-100 text-red-800"
          />

          <SummaryCard
            label="≤ 7 jours"
            value={
              urgentCount
            }
            className="bg-red-50 text-red-700"
          />

          <SummaryCard
            label="≤ 15 jours"
            value={
              soonCount
            }
            className="bg-orange-100 text-orange-800"
          />

          <SummaryCard
            label="≤ 30 jours"
            value={
              watchCount
            }
            className="bg-amber-100 text-amber-800"
          />

          <SummaryCard
            label="Renouvelés"
            value={
              completedCount
            }
            className="bg-emerald-100 text-emerald-800"
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Échéances
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Les assurances les plus urgentes apparaissent en premier.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {renewals.length.toLocaleString(
                "fr-FR",
              )}{" "}
              renouvellement
              {renewals.length !==
              1
                ? "s"
                : ""}
            </span>
          </div>

          {renewals.length ===
          0 ? (
            <div className="p-12 text-center">
              <p className="font-semibold text-slate-700">
                Aucun renouvellement disponible
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Les dossiers apparaîtront ici lorsqu’une police complète avec une date de fin aura été enregistrée.
              </p>
            </div>
          ) : (
            <StickyHorizontalScroll>
  <table className="min-w-full divide-y divide-slate-200">
    <thead className="bg-slate-50">
      {/* colonnes actuelles */}
    </thead>

    <tbody className="divide-y divide-slate-100 bg-white">
      {/* clients actuels */}
    </tbody>
  </table>
</StickyHorizontalScroll>
          )}
        </section>
      </div>
    </main>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
  className: string;
};

function SummaryCard({
  label,
  value,
  className,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span
        className={`inline-flex rounded-xl px-3 py-1 text-xs font-semibold ${className}`}
      >
        {
          label
        }
      </span>

      <p className="mt-4 text-3xl font-bold text-slate-900">
        {value.toLocaleString(
          "fr-FR",
        )}
      </p>
    </div>
  );
}

type TableContentProps = {
  children:
    React.ReactNode;
};

function TableHeader({
  children,
}: TableContentProps) {
  return (
    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {
        children
      }
    </th>
  );
}

function TableCell({
  children,
}: TableContentProps) {
  return (
    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
      {
        children
      }
    </td>
  );
}