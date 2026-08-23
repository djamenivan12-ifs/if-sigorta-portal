import { createServiceClient } from "@/lib/supabase/service";

type RenewalRequestRelation =
  | {
      assigned_agent_id:
        | string
        | null;

      policy_end_date:
        | string
        | null;
    }
  | Array<{
      assigned_agent_id:
        | string
        | null;

      policy_end_date:
        | string
        | null;
    }>
  | null;

type RenewalRow = {
  status: string;

  request:
    RenewalRequestRelation;
};

function unwrapRequest(
  relation:
    RenewalRequestRelation,
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

function getDaysRemaining(
  endDateValue: string,
) {
  const now =
    new Date();

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

  const endDate =
    new Date(
      `${endDateValue}T00:00:00`,
    );

  if (
    Number.isNaN(
      endDate.getTime(),
    )
  ) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.ceil(
    (
      endDate.getTime() -
      today.getTime()
    ) /
      86_400_000,
  );
}

export async function getUrgentRenewalCount({
  role,
  userId,
}: {
  role:
    | "admin"
    | "agent";

  userId: string;
}) {
  try {
    const supabase =
      createServiceClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "insurance_renewals",
        )
        .select(
          `
            status,

            request:insurance_requests (
              assigned_agent_id,
              policy_end_date
            )
          `,
        )
        .in(
          "status",
          [
            "pending",
            "contacted",
            "interested",
          ],
        );

    if (
      error
    ) {
      console.error(
        "Erreur compteur renouvellements :",
        error.message,
      );

      return 0;
    }

    const renewals =
      (data ??
        []) as unknown as RenewalRow[];

    let count =
      0;

    for (
      const renewal of
      renewals
    ) {
      const request =
        unwrapRequest(
          renewal.request,
        );

      if (
        !request?.policy_end_date
      ) {
        continue;
      }

      /*
       * Agent :
       * uniquement ses dossiers
       * + dossiers non attribués.
       */
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

      /*
       * Expiré ou <= 7 jours.
       */
      if (
        daysRemaining <=
        7
      ) {
        count +=
          1;
      }
    }

    return count;
  } catch (
    error
  ) {
    console.error(
      "Erreur compteur renouvellements :",
      error,
    );

    return 0;
  }
}