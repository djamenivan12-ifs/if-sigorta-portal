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
      "border border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]",
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
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-[1500px]">
        {/* HEADER */}

        <header className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.75rem] sm:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                CRM
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-3 sm:text-3xl lg:text-4xl">
                Clients
              </h1>

              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500 sm:mt-3 sm:text-sm sm:leading-7 lg:text-base">
                Consultez les clients, leurs dossiers et accédez à leur fiche CRM complète.
              </p>
            </div>

            <Link
              href="/demande/etape-1"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#0B5D3B] px-4 text-[13px] font-black text-white transition hover:bg-[#084A2F] sm:min-h-11 sm:w-auto sm:px-5 sm:text-sm"
            >
              Nouvelle demande
            </Link>
          </div>
        </header>

        {/* KPI */}

        <section className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:mt-6 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Clients"
            value={
              totalClients.toLocaleString(
                "fr-FR",
              )
            }
            description="Clients visibles"
            className="bg-[#F3F8F2] text-[#0B5D3B]"
          />

          <StatCard
            label="Clients actifs"
            value={
              clientsWithActiveRequests.toLocaleString(
                "fr-FR",
              )
            }
            description="Au moins un dossier actif"
            className="bg-[#EEF6EC] text-[#31513B]"
          />

          <StatCard
            label="Dossiers"
            value={
              totalRequests.toLocaleString(
                "fr-FR",
              )
            }
            description="Dossiers associés"
            className="bg-[#EAF4E8] text-[#0B5D3B]"
          />

          <StatCard
            label="Valeur totale"
            value={
              formatMoney(
                totalAmount,
              )
            }
            description="Montant cumulé"
            className="bg-[#F1F6EA] text-[#49613E]"
          />
        </section>

        {/* FILTRES */}

        <section className="mt-4 min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:mt-6 sm:rounded-[1.5rem] sm:p-5">
          <form
            method="GET"
            className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_260px_auto_auto]"
          >
            <input
              type="search"
              name="q"
              defaultValue={
                search
              }
              placeholder="Nom, WhatsApp, nationalité, matricule..."
              className="min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-[13px] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:px-4 sm:text-sm"
            />

            <select
              name="nationality"
              defaultValue={
                nationalityFilter
              }
              className="min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-[13px] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:px-4 sm:text-sm"
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
              className="min-h-11 w-full rounded-xl bg-[#0B5D3B] px-4 text-[13px] font-black text-white transition hover:bg-[#084A2F] sm:px-5 sm:text-sm"
            >
              Filtrer
            </button>

            <Link
              href="/admin/clients"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-5 sm:text-sm"
            >
              Réinitialiser
            </Link>
          </form>
        </section>

        {/* TABLE */}

        <section className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white sm:mt-6 sm:rounded-[1.5rem]">
          <div className="flex min-w-0 flex-col gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
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
            <div className="p-6 text-center sm:p-12">
              <p className="font-semibold text-slate-700">
                Aucun client trouvé
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Modifiez les critères de recherche ou créez une nouvelle demande.
              </p>
            </div>
          ) : (
            <>
              <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:hidden">
                {clientViews.map((client) => {
                  const latestRequest = client.latestRequest;

                  const statusInformation = latestRequest
                    ? statusLabels[latestRequest.status] ?? {
                        label: latestRequest.status,
                        className: "bg-slate-100 text-slate-700",
                      }
                    : null;

                  return (
                    <article
                      key={client.id}
                      className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-[15px] font-bold leading-5 text-slate-900 sm:text-base">
                            {client.fullName}
                          </p>
                          <p className="mt-1 break-words text-[11px] text-slate-500 sm:text-xs">
                            {client.nationality}
                          </p>
                        </div>

                        <span
                          className={`inline-flex min-w-9 shrink-0 justify-center rounded-full px-2.5 py-1 text-[10px] font-bold sm:text-xs ${
                            client.activeRequestCount > 0
                              ? "bg-[#EEF6EC] text-[#31513B]"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {client.activeRequestCount} actif
                          {client.activeRequestCount !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <dl className="mt-4 grid min-w-0 grid-cols-2 gap-3">
                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            WhatsApp
                          </dt>
                          <dd className="mt-1 min-w-0 break-words text-[12px] font-semibold text-slate-700 sm:text-sm">
                            {client.whatsapp ? (
                              <a
                                href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline"
                              >
                                {client.whatsapp}
                              </a>
                            ) : (
                              "—"
                            )}
                          </dd>
                        </div>

                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Dossiers
                          </dt>
                          <dd className="mt-1 text-[12px] font-bold text-slate-800 sm:text-sm">
                            {client.requestCount}
                          </dd>
                        </div>

                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Valeur totale
                          </dt>
                          <dd className="mt-1 break-words text-[12px] font-bold text-slate-800 sm:text-sm">
                            {formatMoney(client.totalAmount)}
                          </dd>
                        </div>

                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Dernier dossier
                          </dt>
                          <dd className="mt-1 min-w-0 break-all text-[12px] font-semibold sm:text-sm">
                            {latestRequest ? (
                              <Link
                                href={`/admin/dossiers/${latestRequest.id}`}
                                className="text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline"
                              >
                                {latestRequest.request_code}
                              </Link>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </dd>
                        </div>
                      </dl>

                      {statusInformation && (
                        <div className="mt-4 flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span
                            className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-[10px] font-semibold leading-4 sm:text-xs ${statusInformation.className}`}
                          >
                            {statusInformation.label}
                          </span>

                          <span className="text-[10px] text-slate-400 sm:text-xs">
                            {formatDate(latestRequest?.created_at ?? null)}
                          </span>
                        </div>
                      )}

                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#CFE3CF] bg-white px-4 text-[12px] font-bold text-[#0B5D3B] transition hover:bg-[#F3F8F2]"
                      >
                        Voir le client
                      </Link>
                    </article>
                  );
                })}
              </div>

              <div className="hidden lg:block">
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

                              <p className="mt-1 text-[10px] leading-4 text-slate-500 sm:text-xs">
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
                                className="font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline"
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
                                  ? "bg-[#EEF6EC] text-[#31513B]"
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
                                className="font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline"
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
                              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#CFE3CF] bg-white px-4 text-sm font-bold text-[#0B5D3B] transition hover:bg-[#F3F8F2]"
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
              </div>
            </>
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
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:rounded-[1.5rem] sm:p-5">
      <span
        className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${className}`}
      >
        {
          label
        }
      </span>

      <p className="mt-3 break-words text-xl font-semibold tracking-[-0.03em] text-[#102B20] sm:mt-4 sm:text-2xl">
        {
          value
        }
      </p>

      <p className="mt-1 text-[10px] leading-4 text-slate-500 sm:text-xs">
        {
          description
        }
      </p>
    </div>
  );
}