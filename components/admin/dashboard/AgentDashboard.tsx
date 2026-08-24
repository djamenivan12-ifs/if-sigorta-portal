import Link from "next/link";
import QueueRealtimeSync from "@/components/admin/dashboard/QueueRealtimeSync";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  ShieldCheck,
  Siren,
} from "lucide-react";

import ClaimRequestButton from "@/components/admin/requests/ClaimRequestButton";
import { createServiceClient } from "@/lib/supabase/service";

type AgentDashboardProps = {
  userId: string;
  userName: string;
};

type RequestRow = {
  id: string;
  request_code: string;
  status: string;
  created_at: string;

  assigned_at:
    | string
    | null;

  assigned_agent_id:
    | string
    | null;

  calculated_price:
    | number
    | string
    | null;

  client:
    | {
        first_name: string;
        last_name: string;
      }
    | Array<{
        first_name: string;
        last_name: string;
      }>
    | null;
};

type ActivityRow = {
  request_id: string;
  action: string;
  created_at: string;
};

const ACTIVE_STATUSES = [
  "waiting_payment",
  "payment_review",
  "payment_confirmed",
  "policy_preparation",
  "policy_available",
];

const AVAILABLE_STATUSES = [
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
];

const statusLabels: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  draft: {
    label: "Brouillon",
    className:
      "bg-slate-100 text-slate-700",
  },

  waiting_payment: {
    label: "Paiement attendu",
    className:
      "bg-amber-100 text-amber-800",
  },

  payment_review: {
    label: "Paiement à vérifier",
    className:
      "bg-orange-100 text-orange-800",
  },

  payment_confirmed: {
    label: "Paiement confirmé",
    className:
      "bg-green-100 text-green-800",
  },

  policy_preparation: {
    label: "Assurance en préparation",
    className:
      "bg-blue-100 text-blue-800",
  },

  policy_available: {
    label: "Assurance disponible",
    className:
      "bg-emerald-100 text-emerald-800",
  },

  payment_rejected: {
    label: "Paiement refusé",
    className:
      "bg-red-100 text-red-800",
  },

  cancelled: {
    label: "Dossier annulé",
    className:
      "bg-slate-200 text-slate-700",
  },
};

function getClient(
  relation:
    RequestRow["client"],
) {
  if (
    Array.isArray(
      relation,
    )
  ) {
    return (
      relation[0] ??
      null
    );
  }

  return relation;
}

function getMinutesBetween(
  startValue: string,
  endValue: string,
) {
  const start =
    new Date(
      startValue,
    );

  const end =
    new Date(
      endValue,
    );

  if (
    Number.isNaN(
      start.getTime(),
    ) ||
    Number.isNaN(
      end.getTime(),
    )
  ) {
    return 0;
  }

  const difference =
    end.getTime() -
    start.getTime();

  if (
    difference <= 0
  ) {
    return 0;
  }

  return Math.floor(
    difference /
      60000,
  );
}

function formatDuration(
  minutes: number,
) {
  if (
    minutes < 1
  ) {
    return "moins d’une minute";
  }

  if (
    minutes < 60
  ) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes /
        60,
    );

  const remainingMinutes =
    minutes %
    60;

  if (
    remainingMinutes ===
    0
  ) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
}

function formatDate(
  value: string,
) {
  const date =
    new Date(
      value,
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
        "medium",

      timeStyle:
        "short",

      timeZone:
        "Europe/Istanbul",
    },
  ).format(
    date,
  );
}

export default async function AgentDashboard({
  userId,
  userName,
}: AgentDashboardProps) {
  const supabase =
    createServiceClient();

  /*
   * ============================
   * 1. DOSSIERS DE L'AGENT
   * ============================
   */

  const {
    data: assignedData,
    error: assignedError,
  } =
    await supabase
      .from(
        "insurance_requests",
      )
      .select(
        `
          id,
          request_code,
          status,
          created_at,
          assigned_at,
          assigned_agent_id,
          calculated_price,

          client:clients (
            first_name,
            last_name
          )
        `,
      )
      .eq(
        "assigned_agent_id",
        userId,
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      );

  if (
    assignedError
  ) {
    throw new Error(
      assignedError.message,
    );
  }

  const requests =
    (assignedData ??
      []) as unknown as RequestRow[];

  /*
   * ============================
   * 2. DOSSIERS NON ATTRIBUÉS
   * ============================
   *
   * Tous les agents peuvent voir
   * ces dossiers et les prendre
   * en charge.
   */

  const {
    data: availableData,
    error: availableError,
  } =
    await supabase
      .from(
        "insurance_requests",
      )
      .select(
        `
          id,
          request_code,
          status,
          created_at,
          assigned_at,
          assigned_agent_id,
          calculated_price,

          client:clients (
            first_name,
            last_name
          )
        `,
      )
      .is(
        "assigned_agent_id",
        null,
      )
      .in(
        "status",
        AVAILABLE_STATUSES,
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        50,
      );

  if (
    availableError
  ) {
    throw new Error(
      availableError.message,
    );
  }

  const availableRequests =
    (availableData ??
      []) as unknown as RequestRow[];

  /*
   * ============================
   * 3. HISTORIQUE DES DOSSIERS
   * ============================
   */

  const requestIds =
    requests.map(
      (
        request,
      ) =>
        request.id,
    );

  let activities:
    ActivityRow[] = [];

  if (
    requestIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "activity_logs",
        )
        .select(
          `
            request_id,
            action,
            created_at
          `,
        )
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
            ascending:
              false,
          },
        );

    if (
      error
    ) {
      throw new Error(
        error.message,
      );
    }

    activities =
      (data ??
        []) as ActivityRow[];
  }

  /*
   * Dernière progression par dossier.
   */

  const lastProgressByRequest =
    new Map<
      string,
      string
    >();

  /*
   * Dossiers dont le client
   * a déjà été notifié.
   */

  const completedRequests =
    new Set<string>();

  for (
    const activity of
    activities
  ) {
    if (
      !lastProgressByRequest.has(
        activity.request_id,
      )
    ) {
      lastProgressByRequest.set(
        activity.request_id,
        activity.created_at,
      );
    }

    if (
      activity.action ===
      "whatsapp_sent"
    ) {
      completedRequests.add(
        activity.request_id,
      );
    }
  }

  /*
   * ============================
   * 4. CALCUL DES PRIORITÉS
   * ============================
   */

  const now =
    new Date().toISOString();

  let watchCount =
    0;

  let lateCount =
    0;

  let criticalCount =
    0;

  for (
    const request of
    requests
  ) {
    /*
     * Workflow terminé.
     */
    if (
      completedRequests.has(
        request.id,
      )
    ) {
      continue;
    }

    /*
     * Paiement refusé :
     * priorité élevée.
     */
    if (
      request.status ===
      "payment_rejected"
    ) {
      criticalCount +=
        1;

      continue;
    }

    /*
     * Dossier annulé :
     * pas de suivi de retard.
     */
    if (
      request.status ===
      "cancelled"
    ) {
      continue;
    }

    const lastProgressAt =
      lastProgressByRequest.get(
        request.id,
      ) ??
      request.assigned_at ??
      request.created_at;

    const minutes =
      getMinutesBetween(
        lastProgressAt,
        now,
      );

    /*
     * Seuils IF Sigorta
     *
     * 0 - 5 min :
     * normal
     *
     * 5 - 15 min :
     * à surveiller
     *
     * 15 - 30 min :
     * retard
     *
     * 30+ :
     * critique
     */

    if (
      minutes >=
      30
    ) {
      criticalCount +=
        1;
    } else if (
      minutes >=
      15
    ) {
      lateCount +=
        1;
    } else if (
      minutes >=
      5
    ) {
      watchCount +=
        1;
    }
  }

  /*
   * ============================
   * 5. STATISTIQUES
   * ============================
   */

  const totalRequests =
    requests.length;

  const activeRequests =
    requests.filter(
      (
        request,
      ) =>
        ACTIVE_STATUSES.includes(
          request.status,
        ) &&
        !completedRequests.has(
          request.id,
        ),
    ).length;

  const paymentsToReview =
    requests.filter(
      (
        request,
      ) =>
        request.status ===
        "payment_review",
    ).length;

  const policiesToPrepare =
    requests.filter(
      (
        request,
      ) =>
        request.status ===
        "policy_preparation",
    ).length;

  /*
   * Temps moyen de prise en charge.
   */

  const claimTimes =
    requests
      .filter(
        (
          request,
        ) =>
          Boolean(
            request.assigned_at,
          ),
      )
      .map(
        (
          request,
        ) =>
          getMinutesBetween(
            request.created_at,
            request.assigned_at!,
          ),
      );

  const averageClaimTime =
    claimTimes.length >
    0
      ? Math.round(
          claimTimes.reduce(
            (
              total,
              value,
            ) =>
              total +
              value,
            0,
          ) /
            claimTimes.length,
        )
      : null;

  /*
   * Dossiers terminés.
   */

  const completedCount =
    requests.filter(
      (
        request,
      ) =>
        completedRequests.has(
          request.id,
        ),
    ).length;

  const completionRate =
    totalRequests >
    0
      ? (
          completedCount /
          totalRequests
        ) *
        100
      : 0;

  const recentRequests =
    requests.slice(
      0,
      8,
    );

  /*
   * ============================
   * 6. INTERFACE
   * ============================
   */

  return (
    <main className="px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <QueueRealtimeSync />
      <div className="mx-auto max-w-[1500px]">
        {/* BIENVENUE */}

        <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#0B5D3B]">
            Espace agent
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#102B20]">
            Hey{" "}
            {
              userName
            }
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Gérez vos dossiers et prenez en charge les nouvelles demandes disponibles sans attendre l’administrateur.
          </p>
        </section>

        {/* FILE D'ATTENTE */}

        <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#CFE3CF] bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#0B5D3B]">
                File d’attente
              </p>

              <h2 className="mt-1 text-xl font-semibold text-[#102B20]">
                Nouvelles demandes disponibles
              </h2>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Ces dossiers n’ont encore aucun responsable. Le premier agent qui clique sur « Prendre en charge » devient responsable du dossier.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="flex h-12 min-w-12 items-center justify-center rounded-full bg-[#0B5D3B] px-3 text-lg font-bold text-white">
                {
                  availableRequests.length
                }
              </span>

              <Link
                href="/admin/dossiers?agent=unassigned"
                className="hidden text-sm font-semibold text-[#0B5D3B] hover:text-[#084A2F] sm:block"
              >
                Voir tous →
              </Link>
            </div>
          </div>

          {availableRequests.length ===
          0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF6EC] text-[#0B5D3B]">
                ✓
              </div>

              <p className="mt-4 font-semibold text-slate-700">
                Aucun dossier non attribué
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Toutes les demandes disponibles ont été prises en charge.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {availableRequests.map(
                (
                  request,
                ) => {
                  const client =
                    getClient(
                      request.client,
                    );

                  const clientName =
                    client
                      ? `${client.first_name} ${client.last_name}`.trim()
                      : "Client inconnu";

                  const statusInformation =
                    statusLabels[
                      request.status
                    ] ?? {
                      label:
                        request.status,

                      className:
                        "bg-slate-100 text-slate-700",
                    };

                  const waitingMinutes =
                    getMinutesBetween(
                      request.created_at,
                      now,
                    );

                  return (
                    <article
                      key={
                        request.id
                      }
                      className="p-5 transition hover:bg-slate-50 sm:p-6"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-[#0B5D3B]">
                              {
                                request.request_code
                              }
                            </strong>

                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              Non attribué
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInformation.className}`}
                            >
                              {
                                statusInformation.label
                              }
                            </span>

                            {waitingMinutes >=
                              30 && (
                              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                Disponible depuis{" "}
                                {formatDuration(
                                  waitingMinutes,
                                )}
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-base font-bold text-slate-900">
                            {
                              clientName
                            }
                          </p>

                          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                            <span>
                              Créé :{" "}
                              <strong className="text-slate-700">
                                {formatDate(
                                  request.created_at,
                                )}
                              </strong>
                            </span>

                            <span>
                              Montant :{" "}
                              <strong className="text-slate-700">
                                {Number(
                                  request.calculated_price ??
                                    0,
                                ).toLocaleString(
                                  "fr-FR",
                                )}{" "}
                                TL
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row lg:w-auto">
                          <div className="min-w-44">
                            <ClaimRequestButton
  requestId={request.id}
  assignedAgentId={
    request.assigned_agent_id
  }
  currentUserId={
    userId
  }
  currentUserRole="agent"
/>
                          </div>

                          <Link
                            href={`/admin/dossiers/${request.id}`}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#CFE3CF] bg-white px-5 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#F3F8F2]"
                          >
                            Ouvrir
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

        {/* KPI PRINCIPAUX */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Mes dossiers"
            value={
              totalRequests
            }
            description="Dossiers sous votre responsabilité"
            icon={
              <FileText className="h-5 w-5" />
            }
          />

          <StatCard
            label="En cours"
            value={
              activeRequests
            }
            description="Dossiers actuellement actifs"
            icon={
              <Clock3 className="h-5 w-5" />
            }
          />

          <StatCard
            label="Paiements à vérifier"
            value={
              paymentsToReview
            }
            description="Validation nécessaire"
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
          />

          <StatCard
            label="Assurances à préparer"
            value={
              policiesToPrepare
            }
            description="Polices en préparation"
            icon={
              <ShieldCheck className="h-5 w-5" />
            }
          />
        </section>

        {/* PRIORITÉS */}

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[#102B20]">
              Mes priorités
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Dossiers classés selon le temps sans progression.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <PriorityCard
              label="À surveiller"
              value={
                watchCount
              }
              description="5 à moins de 15 minutes"
              className="border-amber-200 bg-amber-50 text-amber-700"
              icon={
                <Clock3 className="h-5 w-5" />
              }
            />

            <PriorityCard
              label="En retard"
              value={
                lateCount
              }
              description="15 à moins de 30 minutes"
              className="border-orange-200 bg-orange-50 text-orange-700"
              icon={
                <AlertTriangle className="h-5 w-5" />
              }
            />

            <PriorityCard
              label="Priorité élevée"
              value={
                criticalCount
              }
              description="30 minutes ou plus"
              className="border-red-200 bg-red-50 text-red-700"
              icon={
                <Siren className="h-5 w-5" />
              }
            />
          </div>
        </section>

        {/* PERFORMANCE */}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Taux de finalisation"
            value={`${completionRate.toLocaleString(
              "fr-FR",
              {
                maximumFractionDigits:
                  1,
              },
            )} %`}
            description={`${completedCount} dossier${
              completedCount !==
              1
                ? "s"
                : ""
            } finalisé${
              completedCount !==
              1
                ? "s"
                : ""
            }`}
          />

          <MetricCard
            label="Prise en charge moyenne"
            value={
              averageClaimTime ===
              null
                ? "—"
                : formatDuration(
                    averageClaimTime,
                  )
            }
            description="Temps moyen entre la création et la prise en charge."
          />

          <MetricCard
            label="Demandes disponibles"
            value={
              availableRequests.length.toLocaleString(
                "fr-FR",
              )
            }
            description="Dossiers que vous pouvez prendre immédiatement."
          />
        </section>

        {/* MES DOSSIERS */}

        <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#102B20]">
                Mes dossiers récents
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Les derniers dossiers actuellement sous votre responsabilité.
              </p>
            </div>

            <Link
              href="/admin/dossiers?agent=me"
              className="font-semibold text-[#0B5D3B] hover:text-[#084A2F]"
            >
              Voir tous mes dossiers →
            </Link>
          </div>

          {recentRequests.length ===
          0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold text-slate-700">
                Vous n’avez encore aucun dossier
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Prenez un dossier dans la file d’attente pour commencer.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentRequests.map(
                (
                  request,
                ) => {
                  const client =
                    getClient(
                      request.client,
                    );

                  const clientName =
                    client
                      ? `${client.first_name} ${client.last_name}`.trim()
                      : "Client inconnu";

                  const statusInformation =
                    statusLabels[
                      request.status
                    ] ?? {
                      label:
                        request.status,

                      className:
                        "bg-slate-100 text-slate-700",
                    };

                  const lastProgressAt =
                    lastProgressByRequest.get(
                      request.id,
                    ) ??
                    request.assigned_at ??
                    request.created_at;

                  const minutesWithoutProgress =
                    getMinutesBetween(
                      lastProgressAt,
                      now,
                    );

                  let priorityLabel =
                    "Normal";

                  let priorityClassName =
                    "bg-[#EEF6EC] text-[#0B5D3B]";

                  if (
                    completedRequests.has(
                      request.id,
                    )
                  ) {
                    priorityLabel =
                      "Terminé";

                    priorityClassName =
                      "bg-emerald-50 text-emerald-700";
                  } else if (
                    request.status ===
                    "payment_rejected"
                  ) {
                    priorityLabel =
                      "Priorité élevée";

                    priorityClassName =
                      "bg-red-50 text-red-700";
                  } else if (
                    minutesWithoutProgress >=
                    30
                  ) {
                    priorityLabel =
                      "Priorité élevée";

                    priorityClassName =
                      "bg-red-50 text-red-700";
                  } else if (
                    minutesWithoutProgress >=
                    15
                  ) {
                    priorityLabel =
                      "En retard";

                    priorityClassName =
                      "bg-orange-50 text-orange-700";
                  } else if (
                    minutesWithoutProgress >=
                    5
                  ) {
                    priorityLabel =
                      "À surveiller";

                    priorityClassName =
                      "bg-amber-50 text-amber-700";
                  }

                  return (
                    <article
                      key={
                        request.id
                      }
                      className="p-5 transition hover:bg-slate-50"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/dossiers/${request.id}`}
                              className="font-semibold text-[#0B5D3B] hover:text-[#084A2F]"
                            >
                              {
                                request.request_code
                              }
                            </Link>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInformation.className}`}
                            >
                              {
                                statusInformation.label
                              }
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityClassName}`}
                            >
                              {
                                priorityLabel
                              }
                            </span>
                          </div>

                          <p className="mt-2 font-semibold text-slate-800">
                            {
                              clientName
                            }
                          </p>

                          {!completedRequests.has(
                            request.id,
                          ) &&
                            minutesWithoutProgress >
                              0 && (
                              <p className="mt-1 text-xs text-slate-400">
                                Sans progression depuis{" "}
                                {formatDuration(
                                  minutesWithoutProgress,
                                )}
                              </p>
                            )}
                        </div>

                        <Link
                          href={`/admin/dossiers/${request.id}`}
                          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[#CFE3CF] px-4 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#F3F8F2]"
                        >
                          Ouvrir →
                        </Link>
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

type StatCardProps = {
  label: string;
  value: number;
  description: string;
  icon:
    React.ReactNode;
};

function StatCard({
  label,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B5D3B]/10 text-[#0B5D3B]">
        {icon}
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#102B20]">
        {value.toLocaleString(
          "fr-FR",
        )}
      </p>

      <p className="mt-2 font-semibold text-slate-800">
        {label}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {
          description
        }
      </p>
    </div>
  );
}

type PriorityCardProps = {
  label: string;
  value: number;
  description: string;
  className: string;
  icon:
    React.ReactNode;
};

function PriorityCard({
  label,
  value,
  description,
  className,
  icon,
}: PriorityCardProps) {
  return (
    <Link
      href="/admin/notifications"
      className={`rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between">
        {icon}

        <span className="text-3xl font-bold">
          {value.toLocaleString(
            "fr-FR",
          )}
        </span>
      </div>

      <p className="mt-4 font-bold">
        {
          label
        }
      </p>

      <p className="mt-1 text-xs opacity-80">
        {
          description
        }
      </p>
    </Link>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
};

function MetricCard({
  label,
  value,
  description,
}: MetricCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">
        {
          label
        }
      </p>

      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#102B20]">
        {
          value
        }
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {
          description
        }
      </p>
    </div>
  );
}