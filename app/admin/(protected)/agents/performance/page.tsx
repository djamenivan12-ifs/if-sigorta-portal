import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type RequestRow = {
  id: string;
  status: string;
  created_at: string;
  assigned_at: string | null;
  assigned_agent_id: string | null;
};

type ActivityRow = {
  request_id: string;
  action: string;
  created_at: string;
};

type AgentPriority =
  | "normal"
  | "watch"
  | "late"
  | "critical";

type AgentPerformance = {
  id: string;
  name: string;
  email: string;

  total: number;
  active: number;
  completed: number;

  watch: number;
  late: number;
  critical: number;
  delayed: number;

  averageClaimMinutes: number | null;
  completionRate: number;

  priority: AgentPriority;
};

const ACTIVE_STATUSES = [
  "waiting_payment",
  "payment_review",
  "payment_confirmed",
  "policy_preparation",
];

const COMPLETED_STATUSES = [
  "policy_available",
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

function getMinutesBetween(
  startValue: string,
  endValue: string,
) {
  const start =
    new Date(startValue);

  const end =
    new Date(endValue);

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

  if (difference <= 0) {
    return 0;
  }

  return Math.floor(
    difference / 60000,
  );
}

function formatAverageTime(
  minutes: number | null,
) {
  if (minutes === null) {
    return "—";
  }

  if (minutes < 1) {
    return "moins d’une minute";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  const remainingMinutes =
    minutes % 60;

  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}

function getPriorityWeight(
  priority: AgentPriority,
) {
  switch (priority) {
    case "critical":
      return 3;

    case "late":
      return 2;

    case "watch":
      return 1;

    default:
      return 0;
  }
}

export default async function AgentPerformancePage() {
  await requireRole([
    "admin",
  ]);

  const supabase =
    createServiceClient();

  /*
   * 1. Utilisateurs agents / admins
   */
  const {
    data: usersData,
    error: usersError,
  } =
    await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (usersError) {
    throw new Error(
      usersError.message,
    );
  }

  const agents =
    usersData.users
      .filter(
        (
          user,
        ) => {
          const role =
            user.app_metadata
              ?.role;

          return (
            role ===
              "agent" ||
            role ===
              "admin"
          );
        },
      )
      .map(
        (
          user,
        ) => {
          const firstName =
            user.user_metadata
              ?.first_name
              ?.toString()
              .trim() ??
            "";

          const lastName =
            user.user_metadata
              ?.last_name
              ?.toString()
              .trim() ??
            "";

          const name =
            `${firstName} ${lastName}`.trim() ||
            user.user_metadata
              ?.name
              ?.toString()
              .trim() ||
            user.email ||
            "Agent";

          return {
            id:
              user.id,

            name,

            email:
              user.email ??
              "",
          };
        },
      );

  /*
   * 2. Tous les dossiers attribués
   */
  const {
    data: requestsData,
    error: requestsError,
  } =
    await supabase
      .from(
        "insurance_requests",
      )
      .select(
        `
          id,
          status,
          created_at,
          assigned_at,
          assigned_agent_id
        `,
      )
      .not(
        "assigned_agent_id",
        "is",
        null,
      );

  if (requestsError) {
    throw new Error(
      requestsError.message,
    );
  }

  const requests =
    (requestsData ??
      []) as RequestRow[];

  /*
   * 3. Historique de progression
   */
  const requestIds =
    requests.map(
      (
        request,
      ) =>
        request.id,
    );

  let activities:
    ActivityRow[] =
    [];

  if (
    requestIds.length >
    0
  ) {
    const {
      data: activitiesData,
      error: activitiesError,
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

    if (activitiesError) {
      throw new Error(
        activitiesError.message,
      );
    }

    activities =
      (activitiesData ??
        []) as ActivityRow[];
  }

  /*
   * 4. Dernière progression de chaque dossier
   */
  const lastProgressByRequest =
    new Map<
      string,
      string
    >();

  const whatsappSentRequests =
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
      whatsappSentRequests.add(
        activity.request_id,
      );
    }
  }

  const now =
    new Date().toISOString();

  /*
   * 5. Calcul des performances
   */
  const performances:
    AgentPerformance[] =
    agents.map(
      (
        agent,
      ) => {
        const agentRequests =
          requests.filter(
            (
              request,
            ) =>
              request.assigned_agent_id ===
              agent.id,
          );

        const total =
          agentRequests.length;

        const active =
          agentRequests.filter(
            (
              request,
            ) =>
              ACTIVE_STATUSES.includes(
                request.status,
              ),
          ).length;

        const completed =
          agentRequests.filter(
            (
              request,
            ) =>
              COMPLETED_STATUSES.includes(
                request.status,
              ) ||
              whatsappSentRequests.has(
                request.id,
              ),
          ).length;

        let watch = 0;
        let late = 0;
        let critical = 0;

        let priority:
          AgentPriority =
          "normal";

        for (
          const request of
          agentRequests
        ) {
          /*
           * Une notification WhatsApp signifie
           * que le workflow principal est terminé.
           */
          if (
            whatsappSentRequests.has(
              request.id,
            )
          ) {
            continue;
          }

          /*
           * Dossiers annulés :
           * pas comptés dans les retards.
           */
          if (
            request.status ===
            "cancelled"
          ) {
            continue;
          }

          /*
           * Les polices disponibles restent
           * suivies jusqu'à notification du client.
           */
          const shouldMonitor =
  ACTIVE_STATUSES.includes(
    request.status,
  );

          if (!shouldMonitor) {
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

          let requestPriority:
            AgentPriority =
            "normal";

          if (
            minutes >= 30
          ) {
            critical += 1;

            requestPriority =
              "critical";
          } else if (
            minutes >= 15
          ) {
            late += 1;

            requestPriority =
              "late";
          } else if (
            minutes >= 5
          ) {
            watch += 1;

            requestPriority =
              "watch";
          }

          if (
            getPriorityWeight(
              requestPriority,
            ) >
            getPriorityWeight(
              priority,
            )
          ) {
            priority =
              requestPriority;
          }
        }

        const delayed =
          watch +
          late +
          critical;

        /*
         * Temps de prise en charge
         */
        const claimTimes =
          agentRequests
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

        const averageClaimMinutes =
          claimTimes.length >
          0
            ? Math.round(
                claimTimes.reduce(
                  (
                    totalValue,
                    currentValue,
                  ) =>
                    totalValue +
                    currentValue,
                  0,
                ) /
                  claimTimes.length,
              )
            : null;

        const completionRate =
          total > 0
            ? (
                completed /
                total
              ) *
              100
            : 0;

        return {
          id:
            agent.id,

          name:
            agent.name,

          email:
            agent.email,

          total,
          active,
          completed,

          watch,
          late,
          critical,
          delayed,

          averageClaimMinutes,

          completionRate,

          priority,
        };
      },
    );

  /*
   * Priorités élevées d'abord,
   * puis agents avec le plus de dossiers.
   */
  performances.sort(
    (
      first,
      second,
    ) => {
      const priorityDifference =
        getPriorityWeight(
          second.priority,
        ) -
        getPriorityWeight(
          first.priority,
        );

      if (
        priorityDifference !==
        0
      ) {
        return priorityDifference;
      }

      return (
        second.total -
        first.total
      );
    },
  );

  /*
   * 6. KPI globaux
   */
  const totalAssigned =
    performances.reduce(
      (
        total,
        agent,
      ) =>
        total +
        agent.total,
      0,
    );

  const totalActive =
    performances.reduce(
      (
        total,
        agent,
      ) =>
        total +
        agent.active,
      0,
    );

  const totalCompleted =
    performances.reduce(
      (
        total,
        agent,
      ) =>
        total +
        agent.completed,
      0,
    );

  const totalDelayed =
    performances.reduce(
      (
        total,
        agent,
      ) =>
        total +
        agent.delayed,
      0,
    );

  const totalCritical =
    performances.reduce(
      (
        total,
        agent,
      ) =>
        total +
        agent.critical,
      0,
    );

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-[1500px]">
        {/* EN-TÊTE */}

        <header className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.75rem] sm:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
                Administration
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-3 sm:text-3xl lg:text-4xl">
                Performance des agents
              </h1>

              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-600 sm:text-sm">
                Suivez la charge de travail, les délais
                de traitement et la progression des
                dossiers attribués.
              </p>
            </div>

            <Link
              href="/admin/agents"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-11 sm:w-auto sm:px-5 sm:text-sm"
            >
              ← Gestion des agents
            </Link>
          </div>
        </header>

        {/* KPI */}

        <section className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
          <SummaryCard
            label="Attribués"
            value={
              totalAssigned
            }
            className="bg-[#EEF6EC] text-[#31513B]"
          />

          <SummaryCard
            label="Actifs"
            value={
              totalActive
            }
            className="bg-[#F3F8F2] text-[#0B5D3B]"
          />

          <SummaryCard
            label="Terminés"
            value={
              totalCompleted
            }
            className="bg-[#EAF4E8] text-[#0B5D3B]"
          />

          <SummaryCard
            label="À surveiller"
            value={
              totalDelayed
            }
            className="bg-amber-50 text-amber-700"
          />

          <SummaryCard
            label="Critiques"
            value={
              totalCritical
            }
            className="bg-red-50 text-red-700"
          />
        </section>

        {/* TABLEAU */}

        <section className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white sm:mt-6 sm:rounded-[1.5rem]">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
            <h2 className="text-lg font-semibold text-[#102B20]">
              Agents
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {performances.length.toLocaleString(
                "fr-FR",
              )}{" "}
              utilisateur
              {performances.length !==
              1
                ? "s"
                : ""}{" "}
              interne
              {performances.length !==
              1
                ? "s"
                : ""}
            </p>
          </div>

          {performances.length ===
          0 ? (
            <div className="px-4 py-10 text-center sm:px-6 sm:py-16">
              <p className="font-semibold text-slate-700">
                Aucun agent
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Aucun utilisateur interne n’a été trouvé.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 lg:hidden">
                {performances.map(
                  (
                    agent,
                  ) => (
                    <article
                      key={agent.id}
                      className="min-w-0 p-4 sm:p-5"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-[15px] font-bold leading-5 text-[#102B20] sm:text-base">
                            {agent.name}
                          </p>

                          <p className="mt-1 break-all text-[11px] leading-5 text-slate-500 sm:text-xs">
                            {agent.email}
                          </p>
                        </div>

                        <PriorityBadge
                          priority={agent.priority}
                        />
                      </div>

                      <div className="mt-4 grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                        <PerformanceMetric
                          label="Attribués"
                          value={agent.total}
                        />

                        <PerformanceMetric
                          label="Actifs"
                          value={agent.active}
                        />

                        <PerformanceMetric
                          label="Terminés"
                          value={agent.completed}
                        />

                        <PerformanceMetric
                          label="À surveiller"
                          value={agent.watch}
                        />

                        <PerformanceMetric
                          label="En retard"
                          value={agent.late}
                        />

                        <PerformanceMetric
                          label="Critiques"
                          value={agent.critical}
                        />

                        <PerformanceMetric
                          label="Prise en charge moy."
                          value={formatAverageTime(
                            agent.averageClaimMinutes,
                          )}
                        />

                        <PerformanceMetric
                          label="Finalisation"
                          value={`${agent.completionRate.toLocaleString(
                            "fr-FR",
                            {
                              maximumFractionDigits:
                                1,
                            },
                          )}%`}
                        />
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-medium text-slate-500 sm:text-xs">
                            Progression
                          </span>

                          <span className="text-[11px] font-semibold text-slate-600 sm:text-xs">
                            {agent.completed}/{agent.total}
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#0B5D3B]"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  agent.completionRate,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <Link
                        href={`/admin/agents/${agent.id}`}
                        className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#CFE3CF] bg-white px-4 text-[12px] font-semibold text-[#0B5D3B] transition hover:bg-[#F3F8F2] sm:text-sm"
                      >
                        Voir l’agent
                      </Link>
                    </article>
                  ),
                )}
              </div>

              <div className="hidden lg:block">
            <TableContainer className="rounded-none border-0 shadow-none">
              <Table className="min-w-[1500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Agent
                    </TableHead>

                    <TableHead>
                      Priorité
                    </TableHead>

                    <TableHead>
                      Attribués
                    </TableHead>

                    <TableHead>
                      Actifs
                    </TableHead>

                    <TableHead>
                      Terminés
                    </TableHead>

                    <TableHead>
                      À surveiller
                    </TableHead>

                    <TableHead>
                      En retard
                    </TableHead>

                    <TableHead>
                      Critiques
                    </TableHead>

                    <TableHead>
                      Prise en charge moy.
                    </TableHead>

                    <TableHead>
                      Finalisation
                    </TableHead>

                    <TableHead className="text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {performances.map(
                    (
                      agent,
                    ) => (
                      <TableRow
                        key={
                          agent.id
                        }
                      >
                        <TableCell>
                          <div className="min-w-[220px]">
                            <p className="font-semibold text-[#102B20]">
                              {
                                agent.name
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {
                                agent.email
                              }
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <PriorityBadge
                            priority={
                              agent.priority
                            }
                          />
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <span className="font-semibold text-[#102B20]">
                            {
                              agent.total
                            }
                          </span>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex min-w-9 justify-center rounded-full border border-[#DDE7D8] bg-[#F3F8F2] px-3 py-1 text-xs font-bold text-[#31513B]">
                            {
                              agent.active
                            }
                          </span>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex min-w-9 justify-center rounded-full border border-[#CFE3CF] bg-[#EEF6EC] px-3 py-1 text-xs font-bold text-[#0B5D3B]">
                            {
                              agent.completed
                            }
                          </span>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex min-w-9 justify-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                            {
                              agent.watch
                            }
                          </span>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex min-w-9 justify-center rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                            {
                              agent.late
                            }
                          </span>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex min-w-9 justify-center rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                            {
                              agent.critical
                            }
                          </span>
                        </TableCell>

                        <TableCell className="whitespace-nowrap font-medium text-slate-700">
                          {formatAverageTime(
                            agent.averageClaimMinutes,
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <div className="min-w-[150px]">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-semibold text-slate-900">
                                {agent.completionRate.toLocaleString(
                                  "fr-FR",
                                  {
                                    maximumFractionDigits:
                                      1,
                                  },
                                )}
                                %
                              </span>

                              <span className="text-xs text-slate-500">
                                {
                                  agent.completed
                                }
                                /
                                {
                                  agent.total
                                }
                              </span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-[#0B5D3B]"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      agent.completionRate,
                                    ),
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-right">
                          <Link
                            href={`/admin/agents/${agent.id}`}
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#CFE3CF] bg-white px-4 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#F3F8F2]"
                          >
                            Voir l’agent
                          </Link>
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </TableContainer>
              </div>
            </>
          )}
        </section>

        {/* LÉGENDE */}

        <section className="mt-4 min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:mt-6 sm:rounded-[1.5rem] sm:p-6">
          <h2 className="font-semibold text-[#102B20]">
            Niveaux de surveillance
          </h2>

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
            <div className="min-w-0 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:rounded-2xl sm:p-4">
              <p className="font-semibold text-amber-800">
                À surveiller
              </p>

              <p className="mt-1 text-sm text-amber-700">
                Aucune progression depuis au moins
                5 minutes.
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-orange-200 bg-orange-50 p-3 sm:rounded-2xl sm:p-4">
              <p className="font-semibold text-orange-800">
                En retard
              </p>

              <p className="mt-1 text-sm text-orange-700">
                Aucune progression depuis au moins
                15 minutes.
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-red-200 bg-red-50 p-3 sm:rounded-2xl sm:p-4">
              <p className="font-semibold text-red-800">
                Priorité élevée
              </p>

              <p className="mt-1 text-sm text-red-700">
                Aucune progression depuis au moins
                30 minutes ou paiement refusé.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function PriorityBadge({
  priority,
}: {
  priority:
    AgentPriority;
}) {
  const config = {
    normal: {
      label:
        "Normal",

      className:
        "border border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]",
    },

    watch: {
      label:
        "À surveiller",

      className:
        "bg-amber-50 text-amber-700",
    },

    late: {
      label:
        "En retard",

      className:
        "bg-orange-50 text-orange-700",
    },

    critical: {
      label:
        "Priorité élevée",

      className:
        "bg-red-50 text-red-700",
    },
  };

  const item =
    config[
      priority
    ];

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${item.className}`}
    >
      {
        item.label
      }
    </span>
  );
}

type PerformanceMetricProps = {
  label: string;
  value: string | number;
};

function PerformanceMetric({
  label,
  value,
}: PerformanceMetricProps) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-[#FAFCFA] p-3">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 sm:text-[10px]">
        {label}
      </p>

      <p className="mt-1 break-words text-[13px] font-bold leading-5 text-[#102B20] sm:text-sm">
        {value}
      </p>
    </div>
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
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}
      >
        {
          label
        }
      </span>

      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-4 sm:text-3xl">
        {value.toLocaleString(
          "fr-FR",
        )}
      </p>
    </div>
  );
}