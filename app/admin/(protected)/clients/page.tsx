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

type SearchParams = Promise<{
  q?: string;
  nationality?: string;
}>;

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  nationality: string | null;
  whatsapp_country_code: string | null;
  whatsapp_number: string | null;
};

type RequestRow = {
  id: string;
  client_id: string;
  request_code: string;
  status: string;
  calculated_price: number | string | null;
  assigned_agent_id: string | null;
  created_at: string;
};

type ClientView = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nationality: string;
  whatsapp: string;
  requestCount: number;
  totalAmount: number;
  latestRequest: RequestRow | null;
  activeRequestCount: number;
};

const ACTIVE_STATUSES = new Set([
  "waiting_payment",
  "payment_review",
  "payment_confirmed",
  "policy_preparation",
]);

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

function normalize(
  value:
    | string
    | null
    | undefined,
) {
  return (
    value ??
    ""
  )
    .trim()
    .toLocaleLowerCase(
      "fr-FR",
    );
}

function normalizePhone(
  value:
    | string
    | null
    | undefined,
) {
  return (
    value ??
    ""
  ).replace(
    /\D/g,
    "",
  );
}

function formatDate(
  value:
    | string
    | null,
) {
  if (!value) {
    return "—";
  }

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
      dateStyle:
        "medium",

      timeStyle:
        "short",

      timeZone:
        "Europe/Istanbul",
    },
  ).format(date);
}

function formatMoney(
  value:
    | number
    | string
    | null
    | undefined,
) {
  return `${Number(
    value ??
      0,
  ).toLocaleString(
    "fr-FR",
    {
      maximumFractionDigits:
        2,
    },
  )} TL`;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams:
    SearchParams;
}) {
  const {
    user,
    role,
  } =
    await requireRole([
      "admin",
      "agent",
    ]);

  const params =
    await searchParams;

  const search =
    params.q?.trim() ??
    "";

  const nationalityFilter =
    params.nationality?.trim() ??
    "";

  const serviceClient =
    createServiceClient();

  /*
   * ============================
   * CLIENTS
   * ============================
   */

  const {
    data: clientsData,
    error: clientsError,
  } =
    await serviceClient
      .from(
        "clients",
      )
      .select(
        `
          id,
          first_name,
          last_name,
          nationality,
          whatsapp_country_code,
          whatsapp_number
        `,
      )
      .order(
        "last_name",
        {
          ascending:
            true,
        },
      )
      .order(
        "first_name",
        {
          ascending:
            true,
        },
      );

  if (
    clientsError
  ) {
    throw new Error(
      clientsError.message,
    );
  }

  const clients =
    (clientsData ??
      []) as ClientRow[];

  /*
   * ============================
   * DOSSIERS
   * ============================
   */

  let requestsQuery =
    serviceClient
      .from(
        "insurance_requests",
      )
      .select(
        `
          id,
          client_id,
          request_code,
          status,
          calculated_price,
          assigned_agent_id,
          created_at
        `,
      );

  if (
    role ===
    "agent"
  ) {
    requestsQuery =
      requestsQuery.or(
        `assigned_agent_id.eq.${user.id},assigned_agent_id.is.null`,
      );
  }

  const {
    data: requestsData,
    error: requestsError,
  } =
    await requestsQuery.order(
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
      []) as RequestRow[];

  const visibleClientIds =
    new Set(
      requests.map(
        (
          request,
        ) =>
          request.client_id,
      ),
    );

  const visibleClients =
    role ===
    "admin"
      ? clients
      : clients.filter(
          (
            client,
          ) =>
            visibleClientIds.has(
              client.id,
            ),
        );

  /*
   * ============================
   * NATIONALITÉS
   * ============================
   */

  const nationalities =
    Array.from(
      new Set(
        visibleClients
          .map(
            (
              client,
            ) =>
              client.nationality
                ?.trim(),
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(
                value,
              ),
          ),
      ),
    ).sort(
      (
        first,
        second,
      ) =>
        first.localeCompare(
          second,
          "fr-FR",
        ),
    );

  /*
   * ============================
   * VUE CLIENT
   * ============================
   */

  let clientViews:
    ClientView[] =
    visibleClients.map(
      (
        client,
      ) => {
        const clientRequests =
          requests.filter(
            (
              request,
            ) =>
              request.client_id ===
              client.id,
          );

        const latestRequest =
          clientRequests[0] ??
          null;

        const totalAmount =
          clientRequests.reduce(
            (
              total,
              request,
            ) =>
              total +
              Number(
                request.calculated_price ??
                  0,
              ),
            0,
          );

        const activeRequestCount =
          clientRequests.filter(
            (
              request,
            ) =>
              ACTIVE_STATUSES.has(
                request.status,
              ),
          ).length;

        const whatsapp =
          `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`.trim();

        return {
          id:
            client.id,

          firstName:
            client.first_name,

          lastName:
            client.last_name,

          fullName:
            `${client.first_name} ${client.last_name}`.trim(),

          nationality:
            client.nationality ??
            "—",

          whatsapp,

          requestCount:
            clientRequests.length,

          totalAmount,

          latestRequest,

          activeRequestCount,
        };
      },
    );

  /*
   * ============================
   * FILTRES
   * ============================
   */

  if (
    nationalityFilter
  ) {
    clientViews =
      clientViews.filter(
        (
          client,
        ) =>
          client.nationality ===
          nationalityFilter,
      );
  }

  if (search) {
    const normalizedSearch =
      normalize(
        search,
      );

    const phoneSearch =
      normalizePhone(
        search,
      );

    clientViews =
      clientViews.filter(
        (
          client,
        ) => {
          const latestCode =
            client.latestRequest
              ?.request_code ??
            "";

          return (
            normalize(
              client.fullName,
            ).includes(
              normalizedSearch,
            ) ||
            normalize(
              client.firstName,
            ).includes(
              normalizedSearch,
            ) ||
            normalize(
              client.lastName,
            ).includes(
              normalizedSearch,
            ) ||
            normalize(
              client.nationality,
            ).includes(
              normalizedSearch,
            ) ||
            normalize(
              latestCode,
            ).includes(
              normalizedSearch,
            ) ||
            (
              Boolean(
                phoneSearch,
              ) &&
              normalizePhone(
                client.whatsapp,
              ).includes(
                phoneSearch,
              )
            )
          );
        },
      );
  }

  /*
   * ============================
   * KPI
   * ============================
   */

  const totalClients =
    clientViews.length;

  const clientsWithActiveRequests =
    clientViews.filter(
      (
        client,
      ) =>
        client.activeRequestCount >
        0,
    ).length;

  const totalRequests =
    clientViews.reduce(
      (
        total,
        client,
      ) =>
        total +
        client.requestCount,
      0,
    );

  const totalAmount =
    clientViews.reduce(
      (
        total,
        client,
      ) =>
        total +
        client.totalAmount,
      0,
    );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        {/* HEADER */}

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
                CRM
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Clients
              </h1>

              <p className="mt-2 max-w-3xl text-slate-600">
                Consultez les clients, leurs dossiers et accédez à leur fiche CRM complète.
              </p>
            </div>

            <Link
              href="/demande/etape-1"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2F2963] px-5 text-sm font-semibold text-white transition hover:bg-[#24204F]"
            >
              Nouvelle demande
            </Link>
          </div>
        </header>

        {/* KPI */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Clients"
            value={
              totalClients.toLocaleString(
                "fr-FR",
              )
            }
            description="Clients visibles"
            className="bg-[#2F2963]/10 text-[#2F2963]"
          />

          <StatCard
            label="Clients actifs"
            value={
              clientsWithActiveRequests.toLocaleString(
                "fr-FR",
              )
            }
            description="Au moins un dossier actif"
            className="bg-blue-50 text-blue-700"
          />

          <StatCard
            label="Dossiers"
            value={
              totalRequests.toLocaleString(
                "fr-FR",
              )
            }
            description="Dossiers associés"
            className="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            label="Valeur totale"
            value={
              formatMoney(
                totalAmount,
              )
            }
            description="Montant cumulé"
            className="bg-violet-50 text-violet-700"
          />
        </section>

        {/* FILTRES */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form
            method="GET"
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px_auto_auto]"
          >
            <input
              type="search"
              name="q"
              defaultValue={
                search
              }
              placeholder="Nom, WhatsApp, nationalité, matricule..."
              className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
            />

            <select
              name="nationality"
              defaultValue={
                nationalityFilter
              }
              className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
            >
              <option value="">
                Toutes les nationalités
              </option>

              {nationalities.map(
                (
                  nationality,
                ) => (
                  <option
                    key={
                      nationality
                    }
                    value={
                      nationality
                    }
                  >
                    {
                      nationality
                    }
                  </option>
                ),
              )}
            </select>

            <button
              type="submit"
              className="min-h-11 rounded-xl bg-[#2F2963] px-5 text-sm font-semibold text-white transition hover:bg-[#24204F]"
            >
              Filtrer
            </button>

            <Link
              href="/admin/clients"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Réinitialiser
            </Link>
          </form>
        </section>

        {/* TABLE */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Liste des clients
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {clientViews.length.toLocaleString(
                  "fr-FR",
                )}{" "}
                client
                {clientViews.length !==
                1
                  ? "s"
                  : ""}
              </p>
            </div>

            {role ===
              "agent" && (
              <span className="text-xs text-slate-400">
                Vos clients + clients liés aux dossiers non attribués
              </span>
            )}
          </div>

          {clientViews.length ===
          0 ? (
            <div className="p-12 text-center">
              <p className="font-semibold text-slate-700">
                Aucun client trouvé
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Modifiez les critères de recherche ou créez une nouvelle demande.
              </p>
            </div>
          ) : (
            <TableContainer className="rounded-none border-0 shadow-none">
              <Table className="min-w-[1350px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Client
                    </TableHead>

                    <TableHead>
                      Nationalité
                    </TableHead>

                    <TableHead>
                      WhatsApp
                    </TableHead>

                    <TableHead>
                      Dossiers
                    </TableHead>

                    <TableHead>
                      Actifs
                    </TableHead>

                    <TableHead>
                      Valeur totale
                    </TableHead>

                    <TableHead>
                      Dernier dossier
                    </TableHead>

                    <TableHead>
                      Dernier statut
                    </TableHead>

                    <TableHead>
                      Date
                    </TableHead>

                    <TableHead className="text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {clientViews.map(
                    (
                      client,
                    ) => {
                      const latestRequest =
                        client.latestRequest;

                      const statusInformation =
                        latestRequest
                          ? statusLabels[
                              latestRequest.status
                            ] ?? {
                              label:
                                latestRequest.status,

                              className:
                                "bg-slate-100 text-slate-700",
                            }
                          : null;

                      return (
                        <TableRow
                          key={
                            client.id
                          }
                        >
                          <TableCell>
                            <div className="min-w-[220px]">
                              <p className="font-semibold text-slate-900">
                                {
                                  client.fullName
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                ID client :{" "}
                                {
                                  client.id
                                }
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {
                              client.nationality
                            }
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {client.whatsapp ? (
                              <a
                                href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-green-700 hover:underline"
                              >
                                {
                                  client.whatsapp
                                }
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            <span className="font-bold text-slate-900">
                              {
                                client.requestCount
                              }
                            </span>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            <span
                              className={`inline-flex min-w-9 justify-center rounded-full px-3 py-1 text-xs font-bold ${
                                client.activeRequestCount >
                                0
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {
                                client.activeRequestCount
                              }
                            </span>
                          </TableCell>

                          <TableCell className="whitespace-nowrap font-semibold text-slate-900">
                            {formatMoney(
                              client.totalAmount,
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {latestRequest ? (
                              <Link
                                href={`/admin/dossiers/${latestRequest.id}`}
                                className="font-semibold text-[#2F2963] hover:underline"
                              >
                                {
                                  latestRequest.request_code
                                }
                              </Link>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {statusInformation ? (
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusInformation.className}`}
                              >
                                {
                                  statusInformation.label
                                }
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatDate(
                              latestRequest
                                ?.created_at ??
                                null,
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap text-right">
                            <Link
                              href={`/admin/clients/${client.id}`}
                              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-[#2F2963] transition hover:bg-[#2F2963]/5"
                            >
                              Voir le client
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    },
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </section>
      </div>
    </main>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  description: string;
  className: string;
};

function StatCard({
  label,
  value,
  description,
  className,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span
        className={`inline-flex rounded-xl px-3 py-1 text-xs font-semibold ${className}`}
      >
        {
          label
        }
      </span>

      <p className="mt-4 text-2xl font-bold text-slate-900">
        {
          value
        }
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {
          description
        }
      </p>
    </div>
  );
}