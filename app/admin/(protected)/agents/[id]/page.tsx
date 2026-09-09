import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";
import AgentForm from "./AgentForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type RequestRow = {
  id: string;
  request_code: string;
  status: string;
  created_at: string;
  assigned_at: string | null;
  assigned_agent_id: string | null;

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

const statusLabels: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
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
      "border border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]",
  },

  policy_preparation: {
    label: "Assurance en préparation",
    className:
      "border border-amber-200 bg-amber-50 text-amber-700",
  },

  policy_available: {
    label: "Assurance disponible",
    className:
      "border border-[#CFE3CF] bg-[#EEF6EC] text-[#0B5D3B]",
  },

  payment_rejected: {
    label: "Paiement refusé",
    className:
      "bg-red-100 text-red-800",
  },

  cancelled: {
    label: "Dossier annulé",
    className:
      "bg-slate-200 text-slate-800",
  },
};

function formatDate(
  value: string,
) {
  const date =
    new Date(value);

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
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Europe/Istanbul",
    },
  ).format(date);
}

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

  if (
    difference <= 0
  ) {
    return 0;
  }

  return Math.floor(
    difference / 60000,
  );
}

function formatDuration(
  minutes: number | null,
) {
  if (
    minutes === null
  ) {
    return "—";
  }

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
      minutes / 60,
    );

  const remainingMinutes =
    minutes % 60;

  if (
    remainingMinutes === 0
  ) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
}

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

export default async function AgentDetailsPage({
  params,
}: PageProps) {
  await requireRole([
    "admin",
  ]);

  const {
    id,
  } =
    await params;

  const supabase =
    createServiceClient();

  /*
   * Agent.
   */
  const {
    data: agentData,
    error: agentError,
  } =
    await supabase.auth.admin.getUserById(
      id,
    );

  if (
    agentError ||
    !agentData.user
  ) {
    notFound();
  }

  const agent =
    agentData.user;

  const role =
    agent.app_metadata?.role;

  if (
    role !== "agent" &&
    role !== "admin"
  ) {
    notFound();
  }

  const firstName =
    agent.user_metadata
      ?.first_name
      ?.toString()
      .trim() ??
    "";

  const lastName =
    agent.user_metadata
      ?.last_name
      ?.toString()
      .trim() ??
    "";

  const agentName =
    `${firstName} ${lastName}`.trim() ||
    agent.user_metadata
      ?.name
      ?.toString()
      .trim() ||
    agent.email ||
    "Agent";
  const bannedUntil =
  agent.banned_until
    ? new Date(
        agent.banned_until,
      )
    : null;

const agentIsDisabled =
  bannedUntil !== null &&
  !Number.isNaN(
    bannedUntil.getTime(),
  ) &&
  bannedUntil.getTime() >
    Date.now();

  /*
   * Dossiers attribués.
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
        id,
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      );

  if (
    requestsError
  ) {
    throw new Error(
      requestsError.message,
    );
  }

  const requests =
    (requestsData ??
      []) as unknown as RequestRow[];

  /*
   * Historique de progression.
   */
  const requestIds =
    requests.map(
      (request) =>
        request.id,
    );

  let activities:
    ActivityRow[] = [];

  if (
    requestIds.length >
    0
  ) {
    const {
      data:
        activitiesData,
      error:
        activitiesError,
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
      activitiesError
    ) {
      throw new Error(
        activitiesError.message,
      );
    }

    activities =
      (activitiesData ??
        []) as ActivityRow[];
  }

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

  /*
   * Statistiques.
   */
  const total =
    requests.length;

  const active =
    requests.filter(
      (request) =>
        ACTIVE_STATUSES.includes(
          request.status,
        ),
    ).length;

  const completed =
    requests.filter(
      (request) =>
        COMPLETED_STATUSES.includes(
          request.status,
        ) ||
        whatsappSentRequests.has(
          request.id,
        ),
    ).length;

  const now =
    new Date().toISOString();

  let watchCount = 0;
  let lateCount = 0;
  let criticalCount = 0;

  for (
    const request of
    requests
  ) {

    /*
     * Dossier terminé :
     * pas de retard.
     */
    if (
      whatsappSentRequests.has(
        request.id,
      )
    ) {
      continue;
    }

    if (
      !ACTIVE_STATUSES.includes(
        request.status,
      ) &&
      request.status !==
        "policy_available"
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

    if (
      minutes >= 30
    ) {
      criticalCount += 1;
    } else if (
      minutes >= 15
    ) {
      lateCount += 1;
    } else if (
      minutes >= 5
    ) {
      watchCount += 1;
    }
  }

  const delayedTotal =
    watchCount +
    lateCount +
    criticalCount;

  /*
   * Temps moyen de prise en charge.
   */
  const claimTimes =
    requests
      .filter(
        (request) =>
          Boolean(
            request.assigned_at,
          ),
      )
      .map(
        (request) =>
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

  /*
   * Taux de finalisation.
   */
  const completionRate =
    total > 0
      ? (
          completed /
          total
        ) *
        100
      : 0;

  /*
   * Valeur totale des dossiers.
   */
  const totalRevenue =
    requests.reduce(
      (
        totalValue,
        request,
      ) =>
        totalValue +
        Number(
          request.calculated_price ??
            0,
        ),
      0,
    );

  /*
   * Dossiers récents.
   */
  const recentRequests =
    requests.slice(
      0,
      25,
    );

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-[1500px]">
        <div className="mb-4 flex min-w-0 flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <Link
            href="/admin/agents/performance"
            className="inline-flex min-h-10 items-center text-[13px] font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline sm:min-h-0 sm:text-base"
          >
            ← Performance des agents
          </Link>

          <Link
            href="/admin/agents"
            className="inline-flex min-h-10 items-center text-[13px] font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline sm:min-h-0 sm:text-base"
          >
            Gestion des agents
          </Link>
        </div>

        <header className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.75rem] sm:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                Agent IF Sigorta
              </p>

              <h1 className="mt-2 break-words text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-3 sm:text-3xl lg:text-4xl">
                {agentName}
              </h1>

              <p className="mt-2 break-all text-[12px] leading-5 text-slate-500 sm:mt-3 sm:text-sm sm:leading-7">
                {agent.email}
              </p>
            </div>

            <span className="inline-flex w-fit max-w-full rounded-full border border-[#CFE3CF] bg-[#F3F8F2] px-3 py-1.5 text-[11px] font-semibold text-[#0B5D3B] sm:px-4 sm:py-2 sm:text-sm">
              {role ===
              "admin"
                ? "Administrateur"
                : "Agent"}
            </span>
          </div>
        </header>

<section className="mt-4 min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:mt-6 sm:rounded-[1.5rem] sm:p-6">
  <div className="mb-4 sm:mb-6">
    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
      Gestion du compte
    </p>

    <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
      Informations de l’utilisateur
    </h2>

    <p className="mt-2 text-[12px] leading-5 text-slate-500 sm:text-sm sm:leading-6">
      Modifiez les informations, le rôle, le mot de passe ou l’état du compte.
    </p>
  </div>

  <AgentForm
    agentId={agent.id}
    initialFirstName={firstName}
    initialLastName={lastName}
    initialEmail={
      agent.email ?? ""
    }
    initialRole={role}
    initialDisabled={
      agentIsDisabled
    }
  />
</section>

        {/* Statistiques générales */}
        <section className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:mt-6 sm:gap-4 xl:grid-cols-4">
          <SummaryCard
            label="Dossiers attribués"
            value={total}
            className="bg-[#F3F8F2] text-[#0B5D3B]"
          />

          <SummaryCard
            label="En cours"
            value={active}
            className="bg-[#EEF6EC] text-[#31513B]"
          />

          <SummaryCard
            label="Terminés"
            value={completed}
            className="bg-[#EAF4E8] text-[#0B5D3B]"
          />

          <SummaryCard
            label="À surveiller ou en retard"
            value={delayedTotal}
            className={
              criticalCount > 0
                ? "bg-red-50 text-red-700"
                : lateCount > 0
                  ? "bg-orange-50 text-orange-700"
                  : watchCount > 0
                    ? "bg-amber-50 text-amber-700"
                    : "border border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]"
            }
          />
        </section>

        {/* Retards */}
        <section className="mt-4 min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:mt-6 sm:rounded-[1.5rem] sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
              Priorités
            </p>

            <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
              Retards de l’agent
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Calculés à partir de la dernière progression réelle enregistrée dans l’historique.
            </p>
          </div>

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-4">
            <DelayCard
              label="À surveiller"
              value={watchCount}
              description="5 à moins de 15 minutes sans progression."
              className="border-amber-200 bg-amber-50"
              valueClassName="text-amber-700"
            />

            <DelayCard
              label="En retard"
              value={lateCount}
              description="15 à moins de 30 minutes sans progression."
              className="border-orange-200 bg-orange-50"
              valueClassName="text-orange-700"
            />

            <DelayCard
              label="Priorité élevée"
              value={criticalCount}
              description="30 minutes ou plus sans progression."
              className="border-red-200 bg-red-50"
              valueClassName="text-red-700"
            />
          </div>

          {delayedTotal ===
            0 && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              ✓ Aucun dossier nécessitant une attention particulière.
            </div>
          )}
        </section>

        {/* Performance */}
        <section className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-3">
          <MetricCard
            label="Prise en charge moyenne"
            value={formatDuration(
              averageClaimMinutes,
            )}
            description="Temps moyen entre la création d’un dossier et son attribution."
          />

          <MetricCard
            label="Taux de finalisation"
            value={`${completionRate.toLocaleString(
              "fr-FR",
              {
                maximumFractionDigits:
                  1,
              },
            )} %`}
            description="Part des dossiers actuellement finalisés."
          />

          <MetricCard
            label="Valeur des dossiers"
            value={`${totalRevenue.toLocaleString(
              "fr-FR",
              {
                maximumFractionDigits:
                  2,
              },
            )} TL`}
            description="Montant cumulé des dossiers attribués à cet agent."
          />
        </section>

        {/* Dossiers */}
        <section className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white sm:mt-6 sm:rounded-[1.5rem]">
          <div className="flex min-w-0 flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
                Dossiers de l’agent
              </h2>

              <p className="mt-1 text-[12px] text-slate-500 sm:text-sm">
                Les 25 dossiers les plus récents sont affichés.
              </p>
            </div>

            <Link
              href={`/admin/dossiers?responsable=${agent.id}`}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-4 text-[12px] font-semibold text-[#0B5D3B] transition hover:bg-[#EAF4E8] sm:min-h-10 sm:w-auto sm:text-sm"
            >
              Voir tous les dossiers
            </Link>
          </div>

          {recentRequests.length ===
          0 ? (
            <div className="px-4 py-10 text-center sm:p-12">
              <p className="font-semibold text-slate-700">
                Aucun dossier attribué
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Cet agent n’a actuellement aucun dossier.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 lg:hidden">
                {recentRequests.map((request) => {
                  const client = getClient(request.client);

                  const clientName = client
                    ? `${client.first_name} ${client.last_name}`.trim()
                    : "Client inconnu";

                  const statusInformation =
                    statusLabels[request.status] ?? {
                      label: request.status,
                      className: "bg-slate-100 text-slate-700",
                    };

                  const lastProgressAt =
                    lastProgressByRequest.get(request.id) ??
                    request.assigned_at ??
                    request.created_at;

                  const minutesWithoutProgress =
                    getMinutesBetween(lastProgressAt, now);

                  const completedRequest =
                    whatsappSentRequests.has(request.id);

                  let delayLabel = "Normal";
                  let delayClassName =
                    "border border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]";

                  if (completedRequest) {
                    delayLabel = "Terminé";
                    delayClassName =
                      "border border-[#CFE3CF] bg-[#EEF6EC] text-[#0B5D3B]";
                  } else if (request.status === "payment_rejected") {
                    delayLabel = "Priorité élevée";
                    delayClassName = "bg-red-50 text-red-700";
                  } else if (minutesWithoutProgress >= 30) {
                    delayLabel = "Priorité élevée";
                    delayClassName = "bg-red-50 text-red-700";
                  } else if (minutesWithoutProgress >= 15) {
                    delayLabel = "En retard";
                    delayClassName = "bg-orange-50 text-orange-700";
                  } else if (minutesWithoutProgress >= 5) {
                    delayLabel = "À surveiller";
                    delayClassName = "bg-amber-50 text-amber-700";
                  }

                  return (
                    <article
                      key={request.id}
                      className="min-w-0 p-4 sm:p-5"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/admin/dossiers/${request.id}`}
                            className="break-all text-[13px] font-black text-[#0B5D3B] hover:underline sm:text-sm"
                          >
                            {request.request_code}
                          </Link>

                          <p className="mt-1 break-words text-[15px] font-bold leading-5 text-[#102B20] sm:text-base">
                            {clientName}
                          </p>
                        </div>

                        <span
                          className={`inline-flex max-w-[50%] shrink-0 rounded-full px-2.5 py-1 text-center text-[10px] font-semibold leading-4 sm:text-xs ${statusInformation.className}`}
                        >
                          {statusInformation.label}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold sm:text-xs ${delayClassName}`}
                        >
                          {delayLabel}
                        </span>

                        {!completedRequest && (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 sm:text-xs">
                            {formatDuration(minutesWithoutProgress)}
                          </span>
                        )}
                      </div>

                      <dl className="mt-4 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3">
                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Montant
                          </dt>
                          <dd className="mt-1 text-[12px] font-black text-[#102B20] sm:text-sm">
                            {Number(
                              request.calculated_price ?? 0,
                            ).toLocaleString("fr-FR")}{" "}
                            TL
                          </dd>
                        </div>

                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Attribution
                          </dt>
                          <dd className="mt-1 break-words text-[12px] font-semibold leading-5 text-slate-700 sm:text-sm">
                            {request.assigned_at
                              ? formatDate(request.assigned_at)
                              : "—"}
                          </dd>
                        </div>

                        <div className="col-span-2 min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Dernière progression
                          </dt>
                          <dd className="mt-1 break-words text-[12px] font-semibold leading-5 text-slate-700 sm:text-sm">
                            {formatDate(lastProgressAt)}
                          </dd>
                        </div>
                      </dl>

                      <Link
                        href={`/admin/dossiers/${request.id}`}
                        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-4 text-[12px] font-semibold text-[#0B5D3B] transition hover:bg-[#EAF4E8] sm:text-sm"
                      >
                        Ouvrir le dossier
                      </Link>
                    </article>
                  );
                })}
              </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-[#FAFCFA]">
                  <tr>
                    <TableHeader>
                      Matricule
                    </TableHeader>

                    <TableHeader>
                      Client
                    </TableHeader>

                    <TableHeader>
                      Montant
                    </TableHeader>

                    <TableHeader>
                      Statut
                    </TableHeader>

                    <TableHeader>
                      Dernière progression
                    </TableHeader>

                    <TableHeader>
                      Délai
                    </TableHeader>

                    <TableHeader>
                      Attribution
                    </TableHeader>

                    <TableHeader>
                      Action
                    </TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recentRequests.map(
                    (request) => {
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

                      const completedRequest =
                        whatsappSentRequests.has(
                          request.id,
                        );

                      let delayLabel =
                        "Normal";

                      let delayClassName =
                        "border border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]";

                      if (
                        completedRequest
                      ) {
                        delayLabel =
                          "Terminé";

                        delayClassName =
                          "border border-[#CFE3CF] bg-[#EEF6EC] text-[#0B5D3B]";
                      } else if (
                        request.status ===
                        "payment_rejected"
                      ) {
                        delayLabel =
                          "Priorité élevée";

                        delayClassName =
                          "bg-red-50 text-red-700";
                      } else if (
                        minutesWithoutProgress >=
                        30
                      ) {
                        delayLabel =
                          "Priorité élevée";

                        delayClassName =
                          "bg-red-50 text-red-700";
                      } else if (
                        minutesWithoutProgress >=
                        15
                      ) {
                        delayLabel =
                          "En retard";

                        delayClassName =
                          "bg-orange-50 text-orange-700";
                      } else if (
                        minutesWithoutProgress >=
                        5
                      ) {
                        delayLabel =
                          "À surveiller";

                        delayClassName =
                          "bg-amber-50 text-amber-700";
                      }

                      return (
                        <tr
                          key={
                            request.id
                          }
                          className="transition hover:bg-[#FAFCFA]"
                        >
                          <TableCell>
                            <strong className="text-slate-900">
                              {
                                request.request_code
                              }
                            </strong>
                          </TableCell>

                          <TableCell>
                            {
                              clientName
                            }
                          </TableCell>

                          <TableCell>
                            {Number(
                              request.calculated_price ??
                                0,
                            ).toLocaleString(
                              "fr-FR",
                            )}{" "}
                            TL
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusInformation.className}`}
                            >
                              {
                                statusInformation.label
                              }
                            </span>
                          </TableCell>

                          <TableCell>
                            {formatDate(
                              lastProgressAt,
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${delayClassName}`}
                              >
                                {
                                  delayLabel
                                }
                              </span>

                              {!completedRequest && (
                                <span className="text-xs text-slate-400">
                                  {formatDuration(
                                    minutesWithoutProgress,
                                  )}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            {request.assigned_at
                              ? formatDate(
                                  request.assigned_at,
                                )
                              : "—"}
                          </TableCell>

                          <TableCell>
                            <Link
                              href={`/admin/dossiers/${request.id}`}
                              className="inline-flex min-h-10 items-center text-[13px] font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline sm:min-h-0 sm:text-base"
                            >
                              Ouvrir
                            </Link>
                          </TableCell>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
            </>
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
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.5rem] sm:p-5">
      <span
        className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${className}`}
      >
        {label}
      </span>

      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-4 sm:text-3xl">
        {value.toLocaleString(
          "fr-FR",
        )}
      </p>
    </div>
  );
}

type DelayCardProps = {
  label: string;
  value: number;
  description: string;
  className: string;
  valueClassName: string;
};

function DelayCard({
  label,
  value,
  description,
  className,
  valueClassName,
}: DelayCardProps) {
  return (
    <div
      className={`min-w-0 rounded-xl border p-4 sm:p-5 ${className}`}
    >
      <p
        className={`text-2xl font-bold sm:text-3xl ${valueClassName}`}
      >
        {value.toLocaleString(
          "fr-FR",
        )}
      </p>

      <p className="mt-2 text-[13px] font-semibold text-[#102B20] sm:mt-3 sm:text-base">
        {label}
      </p>

      <p className="mt-2 text-[11px] leading-5 text-slate-600 sm:text-xs">
        {description}
      </p>
    </div>
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
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.5rem] sm:p-5">
      <p className="text-[12px] font-medium text-slate-500 sm:text-sm">
        {label}
      </p>

      <p className="mt-2 break-words text-xl font-bold text-slate-900 sm:text-2xl">
        {value}
      </p>

      <p className="mt-2 text-[11px] leading-5 text-slate-500 sm:text-xs">
        {description}
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
      {children}
    </th>
  );
}

function TableCell({
  children,
}: TableContentProps) {
  return (
    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
      {children}
    </td>
  );
}