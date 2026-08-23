import Link from "next/link";

import ClaimRequestButton from "@/components/admin/requests/ClaimRequestButton";
import NotificationsRealtimeSync from "@/components/admin/notifications/NotificationsRealtimeSync";
import RenewalWhatsappButton from "../renouvellements/RenewalWhatsappButton";
import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type RequestClientRelation =
  | {
      id: string;
      first_name: string;
      last_name: string;
    }
  | Array<{
      id: string;
      first_name: string;
      last_name: string;
    }>
  | null;

type RequestRow = {
  id: string;
  request_code: string;
  status: string;
  created_at: string;
  assigned_agent_id: string | null;
  client: RequestClientRelation;
};

type ActivityRow = {
  request_id: string;
  action: string;
  created_at: string;
};

type RenewalClientRelation =
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

type RenewalRequestRelation =
  | {
      id: string;
      request_code: string;
      assigned_agent_id: string | null;
      policy_end_date: string | null;
      client: RenewalClientRelation;
    }
  | Array<{
      id: string;
      request_code: string;
      assigned_agent_id: string | null;
      policy_end_date: string | null;
      client: RenewalClientRelation;
    }>
  | null;

type RenewalRow = {
  id: string;
  status: string;
  request: RenewalRequestRelation;
};

type NotificationPriority =
  | "critical"
  | "high"
  | "medium";

type RequestNotificationItem = {
  kind: "request";
  key: string;
  requestId: string;
  requestCode: string;
  clientName: string;
  title: string;
  description: string;
  createdAt: string;
  minutesWithoutProgress: number;
  priority: NotificationPriority;
  priorityLabel: string;
  priorityClassName: string;
  isUnassigned: boolean;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
};

type RenewalNotificationItem = {
  kind: "renewal";
  key: string;
  requestId: string;
  requestCode: string;
  clientId: string;
  clientName: string;
  whatsapp: string;
  title: string;
  description: string;
  policyEndDate: string;
  daysRemaining: number;
  priority: NotificationPriority;
  priorityLabel: string;
  priorityClassName: string;
};

type NotificationItem =
  | RequestNotificationItem
  | RenewalNotificationItem;

/*
 * Les dossiers terminés ou bloqués
 * ne doivent plus apparaître dans
 * la file normale de notifications.
 */
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

const ACTIVE_RENEWAL_STATUSES = [
  "pending",
  "contacted",
  "interested",
];

function unwrapRequestClient(
  relation: RequestClientRelation,
) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function unwrapRenewalRequest(
  relation: RenewalRequestRelation,
) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function unwrapRenewalClient(
  relation: RenewalClientRelation,
) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatDateTime(
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
      timeZone: "Europe/Istanbul",
    },
  ).format(date);
}

function formatSimpleDate(
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
      dateStyle: "long",
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
    difference /
      60_000,
  );
}

function getDaysRemaining(
  policyEndDate: string,
) {
  const now =
    new Date();

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

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

function getRequestPriority({
  status,
  assignedAgentId,
  minutesWithoutProgress,
}: {
  status: string;
  assignedAgentId: string | null;
  minutesWithoutProgress: number;
}) {
  if (
    assignedAgentId ===
    null
  ) {
    if (
      minutesWithoutProgress >=
      30
    ) {
      return {
        priority:
          "critical" as const,

        label:
          "Priorité élevée",

        className:
          "bg-red-100 text-red-700",

        title:
          "Nouvelle demande non prise en charge",
      };
    }

    if (
      minutesWithoutProgress >=
      15
    ) {
      return {
        priority:
          "high" as const,

        label:
          "En retard",

        className:
          "bg-orange-100 text-orange-700",

        title:
          "Nouvelle demande en attente",
      };
    }

    return {
      priority:
        "medium" as const,

      label:
        "Nouvelle demande",

      className:
        "bg-amber-100 text-amber-700",

      title:
        "Nouveau dossier disponible",
    };
  }

  if (
    minutesWithoutProgress >=
    30
  ) {
    return {
      priority:
        "critical" as const,

      label:
        "Priorité élevée",

      className:
        "bg-red-100 text-red-700",

      title:
        "Dossier sans progression",
    };
  }

  if (
    minutesWithoutProgress >=
    15
  ) {
    return {
      priority:
        "high" as const,

      label:
        "En retard",

      className:
        "bg-orange-100 text-orange-700",

      title:
        "Dossier en retard",
    };
  }

  if (
    minutesWithoutProgress >=
    5
  ) {
    return {
      priority:
        "medium" as const,

      label:
        "À surveiller",

      className:
        "bg-amber-100 text-amber-700",

      title:
        "Dossier à surveiller",
    };
  }

  return {
    priority:
      "medium" as const,

    label:
      "Pris en charge",

    className:
      "bg-blue-100 text-blue-700",

    title:
      "Dossier sous votre responsabilité",
  };
}

function getRequestDescription({
  status,
  isUnassigned,
}: {
  status: string;
  isUnassigned: boolean;
}) {
  if (
    isUnassigned
  ) {
    return "Une nouvelle demande est disponible et peut être prise en charge.";
  }

  switch (status) {
    case "draft":
      return "Le dossier est encore au stade brouillon.";

    case "waiting_payment":
      return "Le paiement du client est attendu.";

    case "payment_review":
      return "Le reçu de paiement doit être vérifié.";

    case "payment_confirmed":
      return "Le paiement est confirmé. Le dossier peut passer à la préparation.";

    case "policy_preparation":
      return "La police d’assurance doit être préparée.";

    default:
      return "Ce dossier nécessite votre attention.";
  }
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

function getRenewalDescription(
  daysRemaining: number,
) {
  if (
    daysRemaining < 0
  ) {
    const days =
      Math.abs(
        daysRemaining,
      );

    return `L’assurance est expirée depuis ${days} jour${days !== 1 ? "s" : ""}. Contactez le client pour lui proposer de faire une nouvelle demande de renouvellement.`;
  }

  if (
    daysRemaining === 0
  ) {
    return "L’assurance expire aujourd’hui. Contactez le client pour lui proposer de renouveler.";
  }

  return `L’assurance expire dans ${daysRemaining} jour${daysRemaining !== 1 ? "s" : ""}. Le client peut être contacté afin de lui proposer un renouvellement.`;
}

function getPriorityWeight(
  priority: NotificationPriority,
) {
  switch (priority) {
    case "critical":
      return 3;

    case "high":
      return 2;

    default:
      return 1;
  }
}

function getInternalUserName(
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<
      string,
      unknown
    >;
  },
) {
  const firstName =
    typeof user.user_metadata
      ?.first_name ===
    "string"
      ? user.user_metadata.first_name.trim()
      : "";

  const lastName =
    typeof user.user_metadata
      ?.last_name ===
    "string"
      ? user.user_metadata.last_name.trim()
      : "";

  const fullName =
    `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  const name =
    typeof user.user_metadata
      ?.name ===
    "string"
      ? user.user_metadata.name.trim()
      : "";

  return (
    name ||
    user.email ||
    "Agent"
  );
}

export default async function NotificationsPage() {
  const {
    user,
    role,
  } =
    await requireRole([
      "agent",
      "admin",
    ]);

  const serviceClient =
    createServiceClient();

  /*
   * ============================
   * UTILISATEURS INTERNES
   * ============================
   *
   * Permet à l'administrateur
   * d'afficher le nom de l'agent
   * responsable d'un dossier.
   */

  const {
    data: internalUsersData,
    error: internalUsersError,
  } =
    await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (
    internalUsersError
  ) {
    throw new Error(
      internalUsersError.message,
    );
  }

  const internalUserNames =
    new Map<
      string,
      string
    >();

  for (
    const internalUser of
    internalUsersData.users
  ) {
    const internalRole =
      internalUser.app_metadata
        ?.role;

    if (
      internalRole !==
        "agent" &&
      internalRole !==
        "admin"
    ) {
      continue;
    }

    internalUserNames.set(
      internalUser.id,
      getInternalUserName(
        internalUser,
      ),
    );
  }

  /*
   * ============================
   * 1. DOSSIERS
   * ============================
   */

  let requestQuery =
    serviceClient
      .from(
        "insurance_requests",
      )
      .select(
        `
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
        `,
      )
      .in(
        "status",
        ACTION_STATUSES,
      );

  /*
   * AGENT :
   *
   * - voit les dossiers non attribués
   * - voit ses propres dossiers
   * - ne voit pas ceux des autres agents
   *
   * ADMIN :
   *
   * - voit tout
   */

  if (
    role ===
    "agent"
  ) {
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
      data: activitiesData,
      error: activitiesError,
    } =
      await serviceClient
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
            ascending: false,
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

  const now =
    new Date().toISOString();

  const notifications:
    NotificationItem[] =
    [];

  for (
    const request of
    requests
  ) {
    if (
      completedRequests.has(
        request.id,
      )
    ) {
      continue;
    }

    const client =
      unwrapRequestClient(
        request.client,
      );

    const lastProgressAt =
      lastProgressByRequest.get(
        request.id,
      ) ??
      request.created_at;

    const minutesWithoutProgress =
      getMinutesBetween(
        lastProgressAt,
        now,
      );

    const priorityInfo =
      getRequestPriority({
        status:
          request.status,

        assignedAgentId:
          request.assigned_agent_id,

        minutesWithoutProgress,
      });

    const isUnassigned =
      request.assigned_agent_id ===
      null;

    notifications.push({
      kind:
        "request",

      key:
        `request-${request.id}`,

      requestId:
        request.id,

      requestCode:
        request.request_code,

      clientName:
        client
          ? `${client.first_name} ${client.last_name}`.trim()
          : "Client inconnu",

      title:
        priorityInfo.title,

      description:
        getRequestDescription({
          status:
            request.status,

          isUnassigned,
        }),

      createdAt:
        request.created_at,

      minutesWithoutProgress,

      priority:
        priorityInfo.priority,

      priorityLabel:
        priorityInfo.label,

      priorityClassName:
        priorityInfo.className,

      isUnassigned,

      assignedAgentId:
        request.assigned_agent_id,

      assignedAgentName:
        request.assigned_agent_id
          ? internalUserNames.get(
              request.assigned_agent_id,
            ) ??
            "Agent"
          : null,
    });
  }

  /*
   * ============================
   * 2. RENOUVELLEMENTS
   * ============================
   */

  const {
    data: renewalsData,
    error: renewalsError,
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
          )
        `,
      )
      .in(
        "status",
        ACTIVE_RENEWAL_STATUSES,
      );

  if (
    renewalsError
  ) {
    throw new Error(
      renewalsError.message,
    );
  }

  const renewals =
    (renewalsData ??
      []) as unknown as RenewalRow[];

  for (
    const renewal of
    renewals
  ) {
    const request =
      unwrapRenewalRequest(
        renewal.request,
      );

    if (
      !request
        ?.policy_end_date
    ) {
      continue;
    }

    /*
     * Un agent ne voit que :
     *
     * - ses renouvellements
     * - les renouvellements non attribués
     *
     * L'admin voit tout.
     */

    if (
      role ===
        "agent" &&
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
      unwrapRenewalClient(
        request.client,
      );

    const whatsapp =
      client
        ? `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`.trim()
        : "";

    notifications.push({
      kind:
        "renewal",

      key:
        `renewal-${renewal.id}`,

      requestId:
        request.id,

      requestCode:
        request.request_code,

      clientId:
        client?.id ??
        "",

      clientName:
        client
          ? `${client.first_name} ${client.last_name}`.trim()
          : "Client inconnu",

      whatsapp,

      title:
        priorityInfo.title,

      description:
        getRenewalDescription(
          daysRemaining,
        ),

      policyEndDate:
        request.policy_end_date,

      daysRemaining,

      priority:
        priorityInfo.priority,

      priorityLabel:
        priorityInfo.label,

      priorityClassName:
        priorityInfo.className,
    });
  }

  /*
   * Plus urgent en premier.
   */

  notifications.sort(
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

      if (
        first.kind ===
          "renewal" &&
        second.kind ===
          "renewal"
      ) {
        return (
          first.daysRemaining -
          second.daysRemaining
        );
      }

      if (
        first.kind ===
          "request" &&
        second.kind ===
          "request"
      ) {
        return (
          second.minutesWithoutProgress -
          first.minutesWithoutProgress
        );
      }

      return 0;
    },
  );

  const criticalCount =
    notifications.filter(
      (item) =>
        item.priority ===
        "critical",
    ).length;

  const lateCount =
    notifications.filter(
      (item) =>
        item.priority ===
        "high",
    ).length;

  const watchCount =
    notifications.filter(
      (item) =>
        item.priority ===
        "medium",
    ).length;

  const requestCount =
    notifications.filter(
      (item) =>
        item.kind ===
        "request",
    ).length;

  const renewalCount =
    notifications.filter(
      (item) =>
        item.kind ===
        "renewal",
    ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <NotificationsRealtimeSync />

      <div className="mx-auto max-w-6xl">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
                IF Sigorta
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Notifications
              </h1>

              <p className="mt-2 text-slate-600">
                Dossiers à traiter et renouvellements arrivant à échéance.
              </p>
            </div>

            <Link
              href="/admin/tableau-de-bord"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← Tableau de bord
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Total"
            value={
              notifications.length
            }
            className="bg-[#2F2963]/10 text-[#2F2963]"
          />

          <SummaryCard
            label="Dossiers"
            value={
              requestCount
            }
            className="bg-blue-50 text-blue-700"
          />

          <SummaryCard
            label="Renouvellements"
            value={
              renewalCount
            }
            className="bg-violet-50 text-violet-700"
          />

          <SummaryCard
            label="À surveiller / retard"
            value={
              watchCount +
              lateCount
            }
            className="bg-amber-50 text-amber-700"
          />

          <SummaryCard
            label="Priorité élevée"
            value={
              criticalCount
            }
            className="bg-red-50 text-red-700"
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900">
              À traiter
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Les éléments les plus urgents apparaissent en premier.
            </p>
          </div>

          {notifications.length ===
          0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl">
                ✅
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                Tout est à jour
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Aucun dossier ou renouvellement ne nécessite actuellement votre attention.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map(
                (
                  notification,
                ) => (
                  <article
                    key={
                      notification.key
                    }
                    className="p-5 transition hover:bg-slate-50 sm:p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${notification.priorityClassName}`}
                          >
                            {
                              notification.priorityLabel
                            }
                          </span>

                          <span
                            className={
                              notification.kind ===
                              "renewal"
                                ? "rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"
                                : "rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                            }
                          >
                            {notification.kind ===
                            "renewal"
                              ? "Renouvellement"
                              : "Dossier"}
                          </span>

                          {notification.kind ===
                            "request" &&
                            notification.isUnassigned && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                Non attribué
                              </span>
                            )}

                          {notification.kind ===
                            "request" &&
                            role ===
                              "admin" &&
                            !notification.isUnassigned &&
                            notification.assignedAgentName && (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                Pris en charge par{" "}
                                {
                                  notification.assignedAgentName
                                }
                              </span>
                            )}

                          {notification.kind ===
                            "request" &&
                            role ===
                              "agent" &&
                            notification.assignedAgentId ===
                              user.id && (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                Pris en charge par vous
                              </span>
                            )}

                          <span className="text-sm font-bold text-[#2F2963]">
                            {
                              notification.requestCode
                            }
                          </span>
                        </div>

                        <h3 className="mt-3 text-base font-bold text-slate-900">
                          {
                            notification.title
                          }
                        </h3>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {
                            notification.clientName
                          }
                        </p>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                          {
                            notification.description
                          }
                        </p>

                        {notification.kind ===
                        "request" ? (
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                            <span>
                              Sans progression :{" "}
                              <strong className="text-slate-700">
                                {formatDuration(
                                  notification.minutesWithoutProgress,
                                )}
                              </strong>
                            </span>

                            <span>
                              Créé :{" "}
                              <strong className="text-slate-700">
                                {formatDateTime(
                                  notification.createdAt,
                                )}
                              </strong>
                            </span>
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                            <span>
                              Fin de police :{" "}
                              <strong className="text-slate-700">
                                {formatSimpleDate(
                                  notification.policyEndDate,
                                )}
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex w-full shrink-0 flex-col gap-2 lg:w-56">
                        {notification.kind ===
                          "request" &&
                          notification.isUnassigned && (
                            <ClaimRequestButton
                              requestId={
                                notification.requestId
                              }
                              assignedAgentId={
                                null
                              }
                              currentUserId={
                                user.id
                              }
                              currentUserRole={
                                role
                              }
                            />
                          )}

                        {notification.kind ===
                          "renewal" &&
                          notification.whatsapp && (
                            <RenewalWhatsappButton
                              renewalId={
                                notification.key.replace(
                                  "renewal-",
                                  "",
                                )
                              }
                              whatsapp={
                                notification.whatsapp
                              }
                              message={`Bonjour ${notification.clientName},

Votre assurance IF Sigorta arrive bientôt à expiration.

Date d'expiration : ${
                                notification.policyEndDate
                                  ? new Intl.DateTimeFormat(
                                      "fr-FR",
                                      {
                                        dateStyle:
                                          "long",
                                      },
                                    ).format(
                                      new Date(
                                        `${notification.policyEndDate}T00:00:00`,
                                      ),
                                    )
                                  : "Date non disponible"
                              }.

${
  notification.daysRemaining > 0
    ? `Il vous reste ${notification.daysRemaining} jour${
        notification.daysRemaining !== 1
          ? "s"
          : ""
      } avant l'expiration.`
    : notification.daysRemaining === 0
      ? "Votre assurance expire aujourd'hui."
      : `Votre assurance est expirée depuis ${Math.abs(
          notification.daysRemaining,
        )} jour${
          Math.abs(
            notification.daysRemaining,
          ) !== 1
            ? "s"
            : ""
        }.`
}

Vous pouvez dès maintenant effectuer une nouvelle demande de renouvellement :

${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/demande/etape-1

Après votre demande, vous pourrez effectuer le paiement et envoyer votre justificatif directement depuis la plateforme.

IF Sigorta`}
                            />
                          )}

                        {notification.kind ===
                          "renewal" &&
                          notification.clientId && (
                            <Link
                              href={`/admin/clients/${notification.clientId}`}
                              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Voir le client
                            </Link>
                          )}

                        <Link
                          href={`/admin/dossiers/${notification.requestId}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#2F2963]/20 bg-white px-5 text-sm font-semibold text-[#2F2963] transition hover:bg-[#2F2963]/5"
                        >
                          Ouvrir le dossier →
                        </Link>

                        {notification.kind ===
                          "renewal" && (
                            <Link
                              href="/admin/renouvellements"
                              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2F2963] px-5 text-sm font-semibold text-white transition hover:bg-[#24204F]"
                            >
                              Renouvellements
                            </Link>
                          )}
                      </div>
                    </div>
                  </article>
                ),
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
        {value.toLocaleString(
          "fr-FR",
        )}
      </p>
    </div>
  );
}