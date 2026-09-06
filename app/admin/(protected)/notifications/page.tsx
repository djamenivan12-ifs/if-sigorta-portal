import Link from "next/link";

import ClaimRequestButton from "@/components/admin/requests/ClaimRequestButton";
import RenewalWhatsappButton from "../renouvellements/RenewalWhatsappButton";
import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

const ACTION_STATUSES = [
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function formatSimpleDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(date);
}

function getDaysRemaining(policyEndDate: string) {
  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const end = new Date(
    `${policyEndDate}T00:00:00`,
  );

  if (Number.isNaN(end.getTime())) {
    return 0;
  }

  return Math.ceil(
    (end.getTime() - today.getTime()) /
      86_400_000,
  );
}

function getClientName(clientValue: unknown) {
  if (!clientValue) {
    return "Client inconnu";
  }

  const client = Array.isArray(clientValue)
    ? clientValue[0] ?? null
    : clientValue;

  if (
    !client ||
    typeof client !== "object"
  ) {
    return "Client inconnu";
  }

  const typedClient = client as {
    first_name?: string | null;
    last_name?: string | null;
  };

  return (
    `${typedClient.first_name ?? ""} ${
      typedClient.last_name ?? ""
    }`.trim() || "Client inconnu"
  );
}

function unwrapRenewalRequest(value: unknown) {
  if (!value) {
    return null;
  }

  const request = Array.isArray(value)
    ? value[0] ?? null
    : value;

  if (
    !request ||
    typeof request !== "object"
  ) {
    return null;
  }

  return request as {
    id: string;
    request_code: string;
    assigned_agent_id: string | null;
    policy_end_date: string | null;
    client:
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
  };
}

function unwrapRenewalClient(
  value:
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
    | null,
) {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export default async function NotificationsPage() {
  const { user, role } = await requireRole([
    "agent",
    "admin",
  ]);

  const serviceClient =
    createServiceClient();

  /*
   * =========================
   * DOSSIERS
   * =========================
   */

  let requestQuery = serviceClient
    .from("insurance_requests")
    .select(`
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
    `)
    .in(
      "status",
      ACTION_STATUSES,
    );

  if (role === "agent") {
    requestQuery =
      requestQuery.or(
        `assigned_agent_id.eq.${user.id},assigned_agent_id.is.null`,
      );
  }

  const {
    data: requestsData,
    error: requestsError,
  } = await requestQuery.order(
    "created_at",
    {
      ascending: false,
    },
  );

  if (requestsError) {
    throw new Error(
      requestsError.message,
    );
  }

  const requests =
    requestsData ?? [];

  /*
   * =========================
   * RENOUVELLEMENTS
   * =========================
   */

  const {
    data: renewalsData,
    error: renewalsError,
  } = await serviceClient
    .from("insurance_renewals")
    .select(`
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
    `)
    .in(
      "status",
      ACTIVE_RENEWAL_STATUSES,
    );

  if (renewalsError) {
    throw new Error(
      renewalsError.message,
    );
  }

  const renewals =
    (renewalsData ?? [])
      .map((renewal) => {
        const request =
          unwrapRenewalRequest(
            renewal.request,
          );

        if (
          !request ||
          !request.policy_end_date
        ) {
          return null;
        }

        if (
          role === "agent" &&
          request.assigned_agent_id !==
            user.id &&
          request.assigned_agent_id !==
            null
        ) {
          return null;
        }

        const client =
          unwrapRenewalClient(
            request.client,
          );

        const whatsapp = client
          ? `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`.trim()
          : "";

        const clientName = client
          ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()
          : "Client inconnu";

        return {
          id: renewal.id,
          requestId: request.id,
          requestCode:
            request.request_code,
          policyEndDate:
            request.policy_end_date,
          clientId:
            client?.id ?? "",
          clientName:
            clientName ||
            "Client inconnu",
          whatsapp,
          daysRemaining:
            getDaysRemaining(
              request.policy_end_date,
            ),
        };
      })
      .filter(
        (
          renewal,
        ): renewal is NonNullable<
          typeof renewal
        > => renewal !== null,
      );

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-7">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B5D3B]">
          IF Sigorta
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-[#102B20]">
          Notifications
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {requests.length} dossier
          {requests.length > 1 ? "s" : ""}
          {" · "}
          {renewals.length} renouvellement
          {renewals.length > 1 ? "s" : ""}
        </p>

        {/* DOSSIERS */}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-semibold text-[#102B20]">
              Dossiers à traiter
            </h2>
          </div>

          {requests.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Aucun dossier à traiter.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map(
                (request) => {
                  const clientName =
                    getClientName(
                      request.client,
                    );

                  return (
                    <article
                      key={request.id}
                      className="p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#102B20]">
                            {clientName}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Dossier{" "}
                            {
                              request.request_code
                            }
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-[#F3F8F2] px-3 py-1 text-xs font-semibold text-[#0B5D3B]">
                          {
                            request.status
                          }
                        </span>
                      </div>

                      <p className="mt-3 text-xs text-slate-400">
                        {formatDateTime(
                          request.created_at,
                        )}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={`/admin/dossiers/${request.id}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0B5D3B] px-5 text-sm font-semibold text-white"
                        >
                          Voir le dossier
                        </Link>

                        {request.assigned_agent_id ===
                          null && (
                          <ClaimRequestButton
                            requestId={
                              request.id
                            }
                            assignedAgentId={
                              request.assigned_agent_id
                            }
                            currentUserId={
                              user.id
                            }
                            currentUserRole={
                              role
                            }
                          />
                        )}
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>

        {/* RENOUVELLEMENTS */}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-semibold text-[#102B20]">
              Renouvellements
            </h2>
          </div>

          {renewals.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Aucun renouvellement.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {renewals.map(
                (renewal) => (
                  <article
                    key={renewal.id}
                    className="p-5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#102B20]">
                        {
                          renewal.clientName
                        }
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Dossier{" "}
                        {
                          renewal.requestCode
                        }
                      </p>

                      <p className="mt-3 text-sm text-slate-600">
                        Fin de police :{" "}
                        <strong>
                          {formatSimpleDate(
                            renewal.policyEndDate,
                          )}
                        </strong>
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {renewal.daysRemaining >
                        0
                          ? `${renewal.daysRemaining} jour${
                              renewal.daysRemaining !==
                              1
                                ? "s"
                                : ""
                            } restant${
                              renewal.daysRemaining !==
                              1
                                ? "s"
                                : ""
                            }`
                          : renewal.daysRemaining ===
                              0
                            ? "Expire aujourd’hui"
                            : `Expirée depuis ${Math.abs(
                                renewal.daysRemaining,
                              )} jour${
                                Math.abs(
                                  renewal.daysRemaining,
                                ) !== 1
                                  ? "s"
                                  : ""
                              }`}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {renewal.whatsapp && (
                        <RenewalWhatsappButton
                          renewalId={
                            renewal.id
                          }
                          whatsapp={
                            renewal.whatsapp
                          }
                          message={`Bonjour ${renewal.clientName},

Votre assurance IF Sigorta arrive bientôt à expiration.

Date d'expiration : ${formatSimpleDate(
                            renewal.policyEndDate,
                          )}.

${
  renewal.daysRemaining > 0
    ? `Il vous reste ${renewal.daysRemaining} jour${
        renewal.daysRemaining !== 1
          ? "s"
          : ""
      } avant l'expiration.`
    : renewal.daysRemaining === 0
      ? "Votre assurance expire aujourd'hui."
      : `Votre assurance est expirée depuis ${Math.abs(
          renewal.daysRemaining,
        )} jour${
          Math.abs(
            renewal.daysRemaining,
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

                      {renewal.clientId && (
                        <Link
                          href={`/admin/clients/${renewal.clientId}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
                        >
                          Voir le client
                        </Link>
                      )}

                      <Link
                        href={`/admin/dossiers/${renewal.requestId}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
                      >
                        Voir le dossier
                      </Link>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>

        <Link
          href="/admin/tableau-de-bord"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-[#102B20]"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}