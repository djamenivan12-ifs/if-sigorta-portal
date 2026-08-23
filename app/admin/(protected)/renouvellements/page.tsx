import Link from "next/link";


import RenewalInterestButton from "./RenewalInterestButton";
import RenewalWhatsappButton from "./RenewalWhatsappButton";
import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type ClientRelation = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  whatsapp_country_code: string | null;
  whatsapp_number: string | null;
};

type RequestRelation = {
  id: string;
  request_code: string;
  assigned_agent_id: string | null;
  policy_end_date: string | null;

  client:
    | ClientRelation
    | ClientRelation[]
    | null;
};

type RenewalRow = {
  id: string;
  status: string;

  request:
    | RequestRelation
    | RequestRelation[]
    | null;
};

type RenewalPriority =
  | "critical"
  | "high"
  | "medium";

type RenewalView = {
  id: string;
  status: string;
  requestId: string;
  requestCode: string;
  clientId: string;
  clientName: string;
  whatsapp: string;
  policyEndDate: string;
  daysRemaining: number;
  priority: RenewalPriority;
  priorityLabel: string;
  priorityClassName: string;
  title: string;
};

const ACTIVE_RENEWAL_STATUSES = [
  "pending",
  "contacted",
  "interested",
];

function unwrapRequest(
  relation:
    | RequestRelation
    | RequestRelation[]
    | null,
) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function unwrapClient(
  relation:
    | ClientRelation
    | ClientRelation[]
    | null,
) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function getDaysRemaining(
  policyEndDate: string,
) {
  const today =
    new Date();

  const endDate =
    new Date(
      `${policyEndDate}T00:00:00`,
    );

  const todayDate =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

  const difference =
    endDate.getTime() -
    todayDate.getTime();

  return Math.ceil(
    difference /
      (1000 * 60 * 60 * 24),
  );
}

function getRenewalPriority(
  daysRemaining: number,
) {
  if (
    daysRemaining < 0
  ) {
    return {
      priority:
        "critical" as const,

      label:
        "Expiré",

      className:
        "bg-red-100 text-red-700",

      title:
        "Assurance expirée",
    };
  }

  if (
    daysRemaining <= 7
  ) {
    return {
      priority:
        "critical" as const,

      label:
        "Contact urgent",

      className:
        "bg-red-100 text-red-700",

      title:
        "Client à contacter rapidement",
    };
  }

  if (
    daysRemaining <= 15
  ) {
    return {
      priority:
        "high" as const,

      label:
        "Relance conseillée",

      className:
        "bg-orange-100 text-orange-700",

      title:
        "Relance renouvellement",
    };
  }

  if (
    daysRemaining <= 30
  ) {
    return {
      priority:
        "medium" as const,

      label:
        "À contacter",

      className:
        "bg-amber-100 text-amber-700",

      title:
        "Renouvellement bientôt disponible",
    };
  }

  return null;
}

function formatDate(
  value: string,
) {
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
      dateStyle:
        "long",
    },
  ).format(
    date,
  );
}

function getDaysText(
  daysRemaining: number,
) {
  if (
    daysRemaining < 0
  ) {
    const days =
      Math.abs(
        daysRemaining,
      );

    return `Expirée depuis ${days} jour${
      days !== 1
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

function getWhatsappMessage({
  clientName,
  policyEndDate,
  daysRemaining,
}: {
  clientName: string;
  policyEndDate: string;
  daysRemaining: number;
}) {
  const dateLabel =
    formatDate(
      policyEndDate,
    );

  let remainingText =
    "";

  if (
    daysRemaining > 0
  ) {
    remainingText =
      `Il vous reste ${daysRemaining} jour${
        daysRemaining !== 1
          ? "s"
          : ""
      } avant l'expiration.`;
  } else if (
    daysRemaining === 0
  ) {
    remainingText =
      "Votre assurance expire aujourd’hui.";
  } else {
    const days =
      Math.abs(
        daysRemaining,
      );

    remainingText =
      `Votre assurance est expirée depuis ${days} jour${
        days !== 1
          ? "s"
          : ""
      }.`;
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  return `Bonjour ${clientName},

Votre assurance IF Sigorta arrive à expiration.

Date d'expiration : ${dateLabel}.

${remainingText}

Vous pouvez dès maintenant effectuer une nouvelle demande de renouvellement :

${siteUrl}/demande/etape-1

Après votre demande, vous pourrez effectuer le paiement et envoyer votre justificatif directement depuis la plateforme.

IF Sigorta`;
}

function getStatusInfo(
  status: string,
) {
  switch (status) {
    case "contacted":
      return {
        label: "Déjà contacté",
        className:
          "bg-blue-100 text-blue-700",
      };

    case "interested":
      return {
        label: "Intéressé",
        className:
          "bg-green-100 text-green-700",
      };

    default:
      return {
        label: "À contacter",
        className:
          "bg-slate-100 text-slate-700",
      };
  }
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
        `,
      )
      .in(
        "status",
        ACTIVE_RENEWAL_STATUSES,
      );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const rows =
    (
      data ??
      []
    ) as unknown as RenewalRow[];

  const renewals:
    RenewalView[] =
    [];

  for (
    const row of rows
  ) {
    const request =
      unwrapRequest(
        row.request,
      );

    if (
      !request ||
      !request.policy_end_date
    ) {
      continue;
    }

    if (
      role === "agent" &&
      request.assigned_agent_id !==
        user.id &&
      request.assigned_agent_id !==
        null
    ) {
      continue;
    }

    const daysRemaining =
      getDaysRemaining(
        request.policy_end_date,
      );

    const priorityInfo =
      getRenewalPriority(
        daysRemaining,
      );

    if (
      !priorityInfo
    ) {
      continue;
    }

    const client =
      unwrapClient(
        request.client,
      );

    const whatsapp =
      client
        ? `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`
            .replace(
              /\D/g,
              "",
            )
        : "";

    const clientName =
      client
        ? `${client.first_name ?? ""} ${client.last_name ?? ""}`
            .trim()
        : "Client";

    renewals.push({
      id:
        row.id,

      status:
        row.status,

      requestId:
        request.id,

      requestCode:
        request.request_code,

      clientId:
        client?.id ??
        "",

      clientName,

      whatsapp,

      policyEndDate:
        request.policy_end_date,

      daysRemaining,

      priority:
        priorityInfo.priority,

      priorityLabel:
        priorityInfo.label,

      priorityClassName:
        priorityInfo.className,

      title:
        priorityInfo.title,
    });
  }

  renewals.sort(
    (
      first,
      second,
    ) =>
      first.daysRemaining -
      second.daysRemaining,
  );

  const expiredCount =
    renewals.filter(
      (
        item,
      ) =>
        item.daysRemaining <
        0,
    ).length;

  const urgentCount =
    renewals.filter(
      (
        item,
      ) =>
        item.daysRemaining >=
          0 &&
        item.daysRemaining <=
          7,
    ).length;

  const upcomingCount =
    renewals.filter(
      (
        item,
      ) =>
        item.daysRemaining >
          7 &&
        item.daysRemaining <=
          30,
    ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
                Suivi client
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Renouvellements
              </h1>

              <p className="mt-2 max-w-3xl text-slate-600">
                Assurances arrivant à expiration dans les 30 prochains jours ou déjà expirées.
              </p>
            </div>

            <Link
              href="/admin/notifications"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← Notifications
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="À contacter"
            value={
              renewals.filter(
                (item) =>
                  item.status ===
                  "pending",
              ).length
            }
            className="bg-[#2F2963]/10 text-[#2F2963]"
          />

          <SummaryCard
            label="Urgents"
            value={
              urgentCount
            }
            className="bg-red-100 text-red-700"
          />

          <SummaryCard
            label="À venir"
            value={
              upcomingCount
            }
            className="bg-amber-100 text-amber-700"
          />

          <SummaryCard
            label="Expirés"
            value={
              expiredCount
            }
            className="bg-slate-200 text-slate-700"
          />
        </section>

        <section className="mt-6">
          {renewals.length ===
          0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-sm text-slate-500">
                Aucun client à contacter pour un renouvellement.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {renewals.map(
                (
                  renewal,
                ) => {
                  const whatsappMessage =
                    getWhatsappMessage({
                      clientName:
                        renewal.clientName,

                      policyEndDate:
                        renewal.policyEndDate,

                      daysRemaining:
                        renewal.daysRemaining,
                    });

                  return (
                    <article
                      key={
                        renewal.id
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${renewal.priorityClassName}`}
                            >
                              {
                                renewal.priorityLabel
                              }
                            </span>

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                getStatusInfo(
                                  renewal.status,
                                ).className
                              }`}
                            >
                              {
                                getStatusInfo(
                                  renewal.status,
                                ).label
                              }
                            </span>

                            <span className="text-xs font-semibold text-slate-400">
                              {
                                renewal.requestCode
                              }
                            </span>
                          </div>

                          <h2 className="mt-3 text-xl font-bold text-slate-900">
                            {
                              renewal.clientName
                            }
                          </h2>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {
                              renewal.title
                            }
                          </p>

                          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                            <div>
                              <span className="font-semibold text-slate-800">
                                Expiration :
                              </span>{" "}
                              {
                                formatDate(
                                  renewal.policyEndDate,
                                )
                              }
                            </div>

                            <div>
                              <span className="font-semibold text-slate-800">
                                Délai :
                              </span>{" "}
                              {
                                getDaysText(
                                  renewal.daysRemaining,
                                )
                              }
                            </div>

                            <div>
                              <span className="font-semibold text-slate-800">
                                WhatsApp :
                              </span>{" "}
                              {renewal.whatsapp ||
                                "Non renseigné"}
                            </div>

                            <div>
                              <span className="font-semibold text-slate-800">
                                Matricule :
                              </span>{" "}
                              {
                                renewal.requestCode
                              }
                            </div>
                          </div>
                        </div>

                        <div className="flex w-full shrink-0 flex-col gap-2 lg:w-60">
                          {renewal.whatsapp && (
  <RenewalWhatsappButton
    renewalId={
      renewal.id
    }
    whatsapp={
      renewal.whatsapp
    }
    message={
      whatsappMessage
    }
  />
)}

                          {renewal.clientId && (
                            <Link
                              href={`/admin/clients/${renewal.clientId}`}
                              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Voir le client
                            </Link>
                          )}

                          <Link
                            href={`/admin/dossiers/${renewal.requestId}`}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#2F2963]/20 bg-white px-5 text-sm font-semibold text-[#2F2963] transition hover:bg-[#2F2963]/5"
                          >
                            Ouvrir le dossier →
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
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
      <div
        className={`inline-flex rounded-xl px-3 py-1 text-xs font-semibold ${className}`}
      >
        {
          label
        }
      </div>

      <p className="mt-4 text-3xl font-bold text-slate-900">
        {
          value.toLocaleString(
            "fr-FR",
          )
        }
      </p>
    </div>
  );
}