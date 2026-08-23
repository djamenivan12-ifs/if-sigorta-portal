import type {
  ReactNode,
} from "react";

import Header from "@/components/admin/layout/Header";
import Sidebar from "@/components/admin/layout/Sidebar";

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

  /*
   * ============================================
   * RENOUVELLEMENTS J-30
   * ============================================
   */

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

            /*
             * Un agent voit :
             * - ses dossiers
             * - les dossiers non attribués
             */
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

            /*
             * À partir de J-30.
             * Les assurances déjà expirées
             * restent également visibles.
             */
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
    /*
     * Une erreur du compteur renouvellements
     * ne doit jamais bloquer l'espace admin.
     */
    console.error(
      "Erreur inattendue compteur renouvellements :",
      error,
    );

    urgentRenewalCount =
      0;
  }

  /*
   * ============================================
   * NOTIFICATIONS GLOBALES
   * ============================================
   *
   * Le helper gère déjà :
   *
   * - dossiers nécessitant une action
   * - délais de traitement
   * - paiements refusés
   * - renouvellements J-30
   * - priorité watch / late / critical
   *
   * Le helper possède également son propre
   * try/catch : une erreur ne bloque donc
   * pas le layout admin.
   */

  const notificationSummary =
    await getNotificationSummary({
      role,
      userId:
        user.id,
    });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* SIDEBAR DESKTOP */}

      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-72">
        <Sidebar
          role={
            role
          }
          urgentRenewalCount={
            urgentRenewalCount
          }
        />
      </div>

      {/* CONTENU PRINCIPAL */}

      <div className="min-h-screen lg:pl-72">
        <Header
          userEmail={
            user.email
          }
          role={
            role
          }
          notificationCount={
            notificationSummary.count
          }
          notificationLevel={
            notificationSummary.level
          }
        />

        <div className="min-h-[calc(100vh-5rem)]">
          {
            children
          }
        </div>
      </div>
    </div>
  );
}