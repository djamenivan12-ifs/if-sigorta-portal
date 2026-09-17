
import { readAll } from "@/lib/supabase/readAll";
import { PROGRESS_ACTIONS } from "@/lib/dashboard/model";
import { day } from "@/lib/accounting/model";
import { isValidDate } from "@/lib/validation/date";
import { getLastProgress } from "@/lib/admin/progress";
import { createServiceClient } from "@/lib/supabase/service";

export type NotificationLevel =
  | "unavailable"
  | "none"
  | "watch"
  | "late"
  | "critical";

export type NotificationSummary = {
  count: number;
  level: NotificationLevel;
  renewalCount?:number;
};

type RequestRow = {
  id: string;
  status: string;
  created_at: string;
  assigned_at: string | null;
  assigned_agent_id:
    | string
    | null;
};

type ActivityRow = {
  request_id: string;
  action: string;
  created_at: string;
};

type RenewalRequestRelation =
  | {
      id: string;
      assigned_agent_id:
        | string
        | null;
      policy_end_date:
        | string
        | null;
    }
  | Array<{
      id: string;
      assigned_agent_id:
        | string
        | null;
      policy_end_date:
        | string
        | null;
    }>
  | null;

type RenewalRow = {
  id: string;
  status: string;
  request: RenewalRequestRelation;
};

/*
 * IMPORTANT :
 * cette liste doit rester identique à ACTION_STATUSES
 * dans app/admin/(protected)/notifications/page.tsx.
 *
 * Ainsi, le nombre affiché sur la cloche correspond
 * exactement aux dossiers visibles dans Notifications.
 */
const ACTIVE_REQUEST_STATUSES = [
  "draft",
  "waiting_payment",
  "payment_review",
  "payment_confirmed",
  "policy_preparation",
];

const ACTIVE_RENEWAL_STATUSES = [
  "pending",
  "contacted",
  "interested",
];

function unwrapRenewalRequest(
  relation: RenewalRequestRelation,
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
    difference <=
    0
  ) {
    return 0;
  }

  return Math.floor(
    difference /
      60_000,
  );
}

function getDaysRemaining(policyEndDate: string) {
  if (!isValidDate(policyEndDate)) return Number.POSITIVE_INFINITY;
  return Math.round((Date.parse(policyEndDate + "T00:00:00Z") - Date.parse(day(new Date().toISOString()) + "T00:00:00Z")) / 86_400_000);
}

function getRequestLevel({
  assignedAgentId,
  minutes,
}: {
  status: string;
  assignedAgentId:
    | string
    | null;
  minutes: number;
}): NotificationLevel {
  /*
   * Tout dossier non attribué
   * déclenche une notification immédiate.
   */
  if (
    assignedAgentId ===
    null
  ) {
    if (
      minutes >=
      30
    ) {
      return "critical";
    }

    if (
      minutes >=
      15
    ) {
      return "late";
    }

    return "watch";
  }

  /*
   * Dossier déjà pris en charge.
   *
   * La page Notifications affiche aussi
   * immédiatement les dossiers attribués.
   * Le compteur de la cloche doit donc
   * également les compter, même avant 5 min.
   */
  if (
    minutes >=
    30
  ) {
    return "critical";
  }

  if (
    minutes >=
    15
  ) {
    return "late";
  }

  return "watch";
}

function getRenewalLevel(
  daysRemaining: number,
): NotificationLevel {
  /*
   * Expiré ou échéance <= 7 jours.
   */
  if (
    daysRemaining <=
    7
  ) {
    return "critical";
  }

  /*
   * 8 à 15 jours.
   */
  if (
    daysRemaining <=
    15
  ) {
    return "late";
  }

  /*
   * 16 à 30 jours.
   */
  if (
    daysRemaining <=
    30
  ) {
    return "watch";
  }

  return "none";
}

function getLevelWeight(
  level: NotificationLevel,
) {
  switch (
    level
  ) {
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

export async function getNotificationSummary({
  role,
  userId,
}: {
  role:
    | "admin"
    | "agent";
  userId: string;
}): Promise<NotificationSummary> {
  try {
    const supabase =
      createServiceClient();

    /*
     * ============================
     * 1. NOTIFICATIONS DOSSIERS
     * ============================
     */

    let requestQuery =
      supabase
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
        .in(
          "status",
          ACTIVE_REQUEST_STATUSES,
        );

    if (
      role ===
      "agent"
    ) {
      requestQuery =
        requestQuery.or(
          `assigned_agent_id.eq.${userId},assigned_agent_id.is.null`,
        );
    }

    const {
      data:
        requestsData,
      error:
        requestsError,
    } =
      await readAll(requestQuery.order("id"));

    if (
      requestsError
    ) {
      console.error(
        "Erreur récupération notifications dossiers :",
        requestsError.message,
      );
    }

    if (requestsError) throw new Error(requestsError.message);

    const requests =
      requestsError
        ? []
        : (
            requestsData ??
            []
          ) as RequestRow[];

    let requestNotificationCount =
      0;

    let highestLevel:
      NotificationLevel =
      "none";

    if (
      requests.length >
      0
    ) {
      const requestIds =
        requests.map(
          (
            request,
          ) =>
            request.id,
        );

      const activities: ActivityRow[] = [];
      for (let offset = 0; offset < requestIds.length; offset += 100) {
        const result = await readAll(supabase.from("activity_logs")
          .select("request_id,action,created_at")
          .in("request_id", requestIds.slice(offset, offset + 100))
          .in("action", PROGRESS_ACTIONS)
          .order("created_at", { ascending: false }).order("id"));
        if (result.error) throw new Error(result.error.message);
        activities.push(...result.data as ActivityRow[]);
      }
      const lastProgressByRequest =
        new Map<
          string,
          string
        >();

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

      }

      const now =
        new Date().toISOString();

      for (
        const request of
        requests
      ) {
        if (request.status === "waiting_payment" && request.assigned_agent_id !== null) continue;

        const lastProgressAt = getLastProgress(request, lastProgressByRequest, now);

        const minutes =
          getMinutesBetween(
            lastProgressAt,
            now,
          );

        const level =
          getRequestLevel({
            status:
              request.status,

            assignedAgentId:
              request.assigned_agent_id,

            minutes,
          });

        if (
          level ===
          "none"
        ) {
          continue;
        }

        requestNotificationCount +=
          1;

        if (
          getLevelWeight(
            level,
          ) >
          getLevelWeight(
            highestLevel,
          )
        ) {
          highestLevel =
            level;
        }
      }
    }

    /*
     * ============================
     * 2. RENOUVELLEMENTS
     * ============================
     */

    const {
      data:
        renewalsData,
      error:
        renewalsError,
    } =
      await readAll(supabase
        .from(
          "insurance_renewals",
        )
        .select(
          `
            id,
            status,

            request:insurance_requests!insurance_renewals_request_id_fkey (
              id,
              assigned_agent_id,
              policy_end_date
            )
          `,
        )
        .in(
          "status",
          ACTIVE_RENEWAL_STATUSES,
        ).order("id"));

    if (
      renewalsError
    ) {
      console.error(
        "Erreur récupération notifications renouvellements :",
        renewalsError.message,
      );
    }

    if (renewalsError) throw new Error(renewalsError.message);

    const renewals =
      renewalsError
        ? []
        : (
            renewalsData ??
            []
          ) as unknown as RenewalRow[];

    let renewalNotificationCount =
      0;

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

      if (
        role ===
          "agent" &&
        request.assigned_agent_id !==
          userId &&
        request.assigned_agent_id !==
          null
      ) {
        continue;
      }

      const daysRemaining =
        getDaysRemaining(
          request.policy_end_date,
        );

      const level =
        getRenewalLevel(
          daysRemaining,
        );

      if (
        level ===
        "none"
      ) {
        continue;
      }

      renewalNotificationCount +=
        1;

      if (
        getLevelWeight(
          level,
        ) >
        getLevelWeight(
          highestLevel,
        )
      ) {
        highestLevel =
          level;
      }
    }

    return {
      count:
        requestNotificationCount +
        renewalNotificationCount,

      level:
        highestLevel,
      renewalCount:renewalNotificationCount,
    };
  } catch (
    error
  ) {
    console.error(
      "Erreur compteur global notifications :",
      error,
    );

    return {
      count: 0,
      level: "unavailable",
    };
  }
}
