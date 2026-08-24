import type {
  ReactNode,
} from "react";

import AdminShell from "@/components/admin/layout/AdminShell";

import {
  requireRole,
} from "@/lib/auth/requireRole";

import {
  createServiceClient,
} from "@/lib/supabase/service";

import {
  getNotificationSummary,
} from "@/lib/admin/getNotificationSummary";

type ProtectedAdminLayoutProps = {
  children: ReactNode;
};

type RenewalRequestRelation = {
  assigned_agent_id:
    | string
    | null;

  policy_end_date:
    | string
    | null;
};

type RenewalRow = {
  status: string;

  request:
    | RenewalRequestRelation
    | RenewalRequestRelation[]
    | null;
};

const ACTIVE_RENEWAL_STATUSES = [
  "pending",
  "contacted",
  "interested",
];

function unwrapRequest(
  relation:
    | RenewalRequestRelation
    | RenewalRequestRelation[]
    | null,
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

  const endDate =
    new Date(
      `${policyEndDate}T00:00:00`,
    );

  if (
    Number.isNaN(
      endDate.getTime(),
    )
  ) {
    return null;
  }

  return Math.ceil(
    (
      endDate.getTime() -
      today.getTime()
    ) /
      86_400_000,
  );
}

export default async function ProtectedAdminLayout({
  children,
}: ProtectedAdminLayoutProps) {
  const {
    user,
    role,
  } =
    await requireRole([
      "agent",
      "admin",
    ]);

  let urgentRenewalCount =
    0;

  try {
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
            status,

            request:insurance_requests!insurance_renewals_request_id_fkey (
              assigned_agent_id,
              policy_end_date
            )
          `,
        )
        .in(
          "status",
          ACTIVE_RENEWAL_STATUSES,
        );

    if (error) {
      console.error(
        "Erreur compteur renouvellements :",
        error.message,
      );
    } else {
      const renewals =
        (
          data ??
          []
        ) as unknown as RenewalRow[];

      urgentRenewalCount =
        renewals.filter(
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
              return false;
            }

            if (
              role ===
                "agent" &&
              request.assigned_agent_id !==
                user.id &&
              request.assigned_agent_id !==
                null
            ) {
              return false;
            }

            const daysRemaining =
              getDaysRemaining(
                request.policy_end_date,
              );

            if (
              daysRemaining ===
              null
            ) {
              return false;
            }

            return (
              daysRemaining <=
              30
            );
          },
        ).length;
    }
  } catch (
    error
  ) {
    console.error(
      "Erreur inattendue compteur renouvellements :",
      error,
    );

    urgentRenewalCount =
      0;
  }

  const notificationSummary =
    await getNotificationSummary({
      role,
      userId:
        user.id,
    });

  return (
    <AdminShell
      role={role}
      userEmail={user.email}
      urgentRenewalCount={
        urgentRenewalCount
      }
      notificationCount={
        notificationSummary.count
      }
      notificationLevel={
        notificationSummary.level
      }
    >
      {children}
    </AdminShell>
  );
}