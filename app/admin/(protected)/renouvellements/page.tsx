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
          "border border-[#DDE7D8] bg-[#F3F8F2] text-[#31513B]",
      };

    case "interested":
      return {
        label: "Intéressé",
        className:
          "border border-[#CFE3CF] bg-[#EEF6EC] text-[#0B5D3B]",
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
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-[1500px]">
        <header className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.75rem] sm:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
                Suivi client
              </p>

              <h1 className="mt-2 break-words text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-3 sm:text-3xl lg:text-4xl">
                Renouvellements
              </h1>

              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500 sm:mt-3 sm:text-sm sm:leading-7 lg:text-base">
                Assurances arrivant à expiration dans les 30 prochains jours ou déjà expirées.
              </p>
            </div>

            <Link
              href="/admin/notifications"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-11 sm:w-auto sm:px-5 sm:text-sm"
            >
              ← Notifications
            </Link>
          </div>
        </header>

        <section className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:mt-6 sm:gap-4 xl:grid-cols-4">
          <SummaryCard
            label="À contacter"
            value={
              renewals.filter(
                (item) =>
                  item.status ===
                  "pending",
              ).length
            }
            className="bg-[#F3F8F2] text-[#0B5D3B]"
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

        <section className="mt-4 min-w-0 sm:mt-6">
          {renewals.length ===
          0 ? (
            <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white px-4 py-10 text-center sm:rounded-[1.5rem] sm:px-6 sm:py-16">
              <p className="text-[13px] text-slate-500 sm:text-sm">
                Aucun client à contacter pour un renouvellement.
              </p>
            </div>
          ) : (
            <div className="min-w-0 space-y-3 sm:space-y-4">
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
                      className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.5rem] sm:p-5 lg:p-6"
                    >
                      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:text-xs ${renewal.priorityClassName}`}
                            >
                              {
                                renewal.priorityLabel
                              }
                            </span>

                            <span
                              className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:text-xs ${
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

                            <span className="break-all font-mono text-[10px] font-semibold text-slate-400 sm:text-xs">
                              {
                                renewal.requestCode
                              }
                            </span>
                          </div>

                          <h2 className="mt-3 break-words text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
                            {
                              renewal.clientName
                            }
                          </h2>

                          <p className="mt-1 break-words text-[13px] font-medium text-slate-700 sm:text-sm">
                            {
                              renewal.title
                            }
                          </p>

                          <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-[12px] text-slate-600 sm:grid-cols-2 sm:text-sm">
                            <div className="min-w-0 rounded-xl bg-slate-50 p-3 sm:bg-transparent sm:p-0">
                              <span className="font-semibold text-slate-800">
                                Expiration :
                              </span>{" "}
                              <span className="break-words">
                                {
                                  formatDate(
                                    renewal.policyEndDate,
                                  )
                                }
                              </span>
                            </div>

                            <div className="min-w-0 rounded-xl bg-slate-50 p-3 sm:bg-transparent sm:p-0">
                              <span className="font-semibold text-slate-800">
                                Délai :
                              </span>{" "}
                              <span className="break-words">
                                {
                                  getDaysText(
                                    renewal.daysRemaining,
                                  )
                                }
                              </span>
                            </div>

                            <div className="min-w-0 rounded-xl bg-slate-50 p-3 sm:bg-transparent sm:p-0">
                              <span className="font-semibold text-slate-800">
                                WhatsApp :
                              </span>{" "}
                              <span className="break-all">
                                {renewal.whatsapp ||
                                  "Non renseigné"}
                              </span>
                            </div>

                            <div className="min-w-0 rounded-xl bg-slate-50 p-3 sm:bg-transparent sm:p-0">
                              <span className="font-semibold text-slate-800">
                                Matricule :
                              </span>{" "}
                              <span className="break-all font-mono text-[11px] sm:text-sm">
                                {
                                  renewal.requestCode
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 lg:w-60">
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

                          {renewal.status !== "interested" && (
                            <RenewalInterestButton
                              renewalId={
                                renewal.id
                              }
                            />
                          )}

                          {renewal.clientId && (
                            <Link
                              href={`/admin/clients/${renewal.clientId}`}
                              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 sm:min-h-11 sm:px-5 sm:text-sm"
                            >
                              Voir le client
                            </Link>
                          )}

                          <Link
                            href={`/admin/dossiers/${renewal.requestId}`}
                            className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#CFE3CF] bg-white px-4 text-[12px] font-semibold text-[#0B5D3B] transition hover:bg-[#F3F8F2] sm:min-h-11 sm:px-5 sm:text-sm"
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
    <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 sm:rounded-[1.5rem] sm:p-5">
      <div
        className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${className}`}
      >
        {
          label
        }
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-4 sm:text-3xl">
        {
          value.toLocaleString(
            "fr-FR",
          )
        }
      </p>
    </div>
  );
}
