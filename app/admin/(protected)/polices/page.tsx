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

const BUCKET_NAME =
  "insurance-documents";

type SearchParams = Promise<{
  status?: string;
  q?: string;
}>;

type ClientRelation =
  | {
      first_name: string;
      last_name: string;
      whatsapp_country_code: string | null;
      whatsapp_number: string | null;
    }
  | Array<{
      first_name: string;
      last_name: string;
      whatsapp_country_code: string | null;
      whatsapp_number: string | null;
    }>
  | null;

type RequestRow = {
  id: string;
  request_code: string;

  status:
    | "policy_preparation"
    | "policy_available";

  assigned_agent_id:
    | string
    | null;

  insurance_duration_years:
    number;

  policy_start_date:
    | string
    | null;

  policy_end_date:
    | string
    | null;

  created_at: string;

  client:
    ClientRelation;
};

type PolicyRow = {
  request_id: string;
  policy_year: number;
  storage_path: string;
};

type AgentOption = {
  id: string;
  name: string;
};

type PolicyFile = {
  year: number;
  storagePath: string;
  signedUrl: string | null;
};

type PolicyView = {
  requestId: string;
  requestCode: string;

  status:
    | "policy_preparation"
    | "policy_available";

  clientName: string;
  whatsapp: string;

  durationYears: number;

  startDate:
    | string
    | null;

  endDate:
    | string
    | null;

  assignedAgentId:
    | string
    | null;

  assignedAgentName:
    | string
    | null;

  policies:
    PolicyFile[];
};

function unwrapClient(
  relation:
    ClientRelation,
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

function formatDate(
  value:
    string | null,
) {
  if (!value) {
    return "—";
  }

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
      dateStyle:
        "long",
    },
  ).format(
    date,
  );
}

async function getAgents() {
  const serviceClient =
    createServiceClient();

  const {
    data,
    error,
  } =
    await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data.users
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
      ): AgentOption => {
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

        const fullName =
          `${firstName} ${lastName}`.trim();

        return {
          id:
            user.id,

          name:
            fullName ||
            user.email ||
            "Agent",
        };
      },
    );
}

export default async function PoliciesPage({
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

  const statusFilter =
    params.status?.trim() ??
    "";

  const search =
    params.q?.trim() ??
    "";

  const serviceClient =
    createServiceClient();

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
          request_code,
          status,
          assigned_agent_id,
          insurance_duration_years,
          policy_start_date,
          policy_end_date,
          created_at,

          client:clients (
            first_name,
            last_name,
            whatsapp_country_code,
            whatsapp_number
          )
        `,
      )
      .in(
        "status",
        [
          "policy_preparation",
          "policy_available",
        ],
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      );

  /*
   * Un agent ne voit que
   * les dossiers qui lui sont attribués.
   */
  if (
    role ===
    "agent"
  ) {
    requestsQuery =
      requestsQuery.eq(
        "assigned_agent_id",
        user.id,
      );
  }

  const {
    data: requestsData,
    error: requestsError,
  } =
    await requestsQuery;

  if (
    requestsError
  ) {
    throw new Error(
      requestsError.message,
    );
  }

  let requests =
    (
      requestsData ??
      []
    ) as unknown as RequestRow[];

  /*
   * ============================
   * FILTRE STATUT
   * ============================
   */

  if (
    statusFilter ===
    "preparation"
  ) {
    requests =
      requests.filter(
        (
          request,
        ) =>
          request.status ===
          "policy_preparation",
      );
  }

  if (
    statusFilter ===
    "available"
  ) {
    requests =
      requests.filter(
        (
          request,
        ) =>
          request.status ===
          "policy_available",
      );
  }

  /*
   * ============================
   * RECHERCHE
   * ============================
   */

  if (search) {
    const normalizedSearch =
      normalize(
        search,
      );

    requests =
      requests.filter(
        (
          request,
        ) => {
          const client =
            unwrapClient(
              request.client,
            );

          const clientName =
            client
              ? `${client.first_name} ${client.last_name}`.trim()
              : "";

          const whatsapp =
            client
              ? `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`
              : "";

          return (
            normalize(
              request.request_code,
            ).includes(
              normalizedSearch,
            ) ||
            normalize(
              clientName,
            ).includes(
              normalizedSearch,
            ) ||
            normalize(
              whatsapp,
            ).includes(
              normalizedSearch,
            )
          );
        },
      );
  }

  const requestIds =
    requests.map(
      (
        request,
      ) =>
        request.id,
    );

  /*
   * ============================
   * POLICES
   * ============================
   */

  let policyRows:
    PolicyRow[] =
    [];

  if (
    requestIds.length >
    0
  ) {
    const {
      data: policiesData,
      error: policiesError,
    } =
      await serviceClient
        .from(
          "insurance_policies",
        )
        .select(
          `
            request_id,
            policy_year,
            storage_path
          `,
        )
        .in(
          "request_id",
          requestIds,
        )
        .order(
          "policy_year",
          {
            ascending:
              true,
          },
        );

    if (
      policiesError
    ) {
      throw new Error(
        policiesError.message,
      );
    }

    policyRows =
      (
        policiesData ??
        []
      ) as PolicyRow[];
  }

  /*
   * ============================
   * LIENS PDF TEMPORAIRES
   * ============================
   */

  const policiesWithUrls =
    await Promise.all(
      policyRows.map(
        async (
          policy,
        ) => {
          const {
            data,
            error,
          } =
            await serviceClient.storage
              .from(
                BUCKET_NAME,
              )
              .createSignedUrl(
                policy.storage_path,
                60 * 10,
              );

          return {
            ...policy,

            signedUrl:
              error ||
              !data
                ? null
                : data.signedUrl,
          };
        },
      ),
    );

  /*
   * ============================
   * AGENTS
   * ============================
   */

  const agents =
    await getAgents();

  const agentNames =
    new Map(
      agents.map(
        (
          agent,
        ) => [
          agent.id,
          agent.name,
        ],
      ),
    );

  /*
   * ============================
   * VUE
   * ============================
   */

  const policies:
    PolicyView[] =
    requests.map(
      (
        request,
      ) => {
        const client =
          unwrapClient(
            request.client,
          );

        const clientName =
          client
            ? `${client.first_name} ${client.last_name}`.trim()
            : "Client inconnu";

        const whatsapp =
          client
            ? `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`.trim()
            : "";

        const requestPolicies =
          policiesWithUrls
            .filter(
              (
                policy,
              ) =>
                policy.request_id ===
                request.id,
            )
            .map(
              (
                policy,
              ) => ({
                year:
                  Number(
                    policy.policy_year,
                  ),

                storagePath:
                  policy.storage_path,

                signedUrl:
                  policy.signedUrl,
              }),
            );

        return {
          requestId:
            request.id,

          requestCode:
            request.request_code,

          status:
            request.status,

          clientName,

          whatsapp,

          durationYears:
            request.insurance_duration_years,

          startDate:
            request.policy_start_date,

          endDate:
            request.policy_end_date,

          assignedAgentId:
            request.assigned_agent_id,

          assignedAgentName:
            request.assigned_agent_id
              ? agentNames.get(
                  request.assigned_agent_id,
                ) ??
                "Agent"
              : null,

          policies:
            requestPolicies,
        };
      },
    );

  /*
   * ============================
   * KPI
   * ============================
   */

  const preparationCount =
    policies.filter(
      (
        item,
      ) =>
        item.status ===
        "policy_preparation",
    ).length;

  const availableCount =
    policies.filter(
      (
        item,
      ) =>
        item.status ===
        "policy_available",
    ).length;

  const oneYearCount =
    policies.filter(
      (
        item,
      ) =>
        item.durationYears ===
        1,
    ).length;

  const twoYearCount =
    policies.filter(
      (
        item,
      ) =>
        item.durationYears ===
        2,
    ).length;

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-[1500px]">
        {/* HEADER */}

        <header className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.75rem] sm:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
                Assurances
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-3 sm:text-3xl lg:text-4xl">
                Polices
              </h1>

              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500 sm:mt-3 sm:text-sm sm:leading-7 lg:text-base">
                Suivez les polices en préparation et les assurances déjà disponibles.
              </p>
            </div>

            <Link
              href="/admin/dashboard"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-11 sm:w-auto sm:px-5 sm:text-sm"
            >
              ← Tableau de bord
            </Link>
          </div>
        </header>

        {/* KPI */}

        <section className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:mt-6 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="À préparer"
            value={
              preparationCount
            }
            description="Polices en cours"
            className="bg-amber-50 text-amber-700"
          />

          <StatCard
            label="Disponibles"
            value={
              availableCount
            }
            description="Assurances terminées"
            className="bg-[#EEF6EC] text-[#0B5D3B]"
          />

          <StatCard
            label="1 an"
            value={
              oneYearCount
            }
            description="Demandes d’un an"
            className="bg-[#F3F8F2] text-[#31513B]"
          />

          <StatCard
            label="2 ans"
            value={
              twoYearCount
            }
            description="Demandes de deux ans"
            className="bg-amber-50 text-amber-700"
          />
        </section>

        {/* FILTRES */}

        <section className="mt-4 min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:mt-6 sm:rounded-[1.5rem] sm:p-5">
          <form
            method="GET"
            className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_240px_auto_auto]"
          >
            <input
              type="search"
              name="q"
              defaultValue={
                search
              }
              placeholder="Client, code dossier ou WhatsApp..."
              className="min-h-11 min-w-0 w-full rounded-xl border border-slate-300 px-3 text-[13px] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:px-4 sm:text-sm"
            />

            <select
              name="status"
              defaultValue={
                statusFilter
              }
              className="min-h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:px-4 sm:text-sm"
            >
              <option value="">
                Toutes les polices
              </option>

              <option value="preparation">
                À préparer
              </option>

              <option value="available">
                Disponibles
              </option>
            </select>

            <button
              type="submit"
              className="min-h-11 w-full rounded-xl bg-[#0B5D3B] px-4 text-[13px] font-black text-white transition hover:bg-[#084A2F] sm:px-5 sm:text-sm"
            >
              Filtrer
            </button>

            <Link
              href="/admin/polices"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-11 sm:w-auto sm:px-5 sm:text-sm"
            >
              Réinitialiser
            </Link>
          </form>
        </section>

        {/* TABLEAU */}

        <section className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white sm:mt-6 sm:rounded-[1.5rem]">
          <div className="border-b border-slate-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
              Liste des polices
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {policies.length.toLocaleString(
                "fr-FR",
              )}{" "}
              dossier
              {policies.length !==
              1
                ? "s"
                : ""}
            </p>
          </div>

          {policies.length ===
          0 ? (
            <div className="p-8 text-center sm:p-12">
              <p className="font-semibold text-slate-700">
                Aucune police trouvée
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 lg:hidden">
                {policies.map((item) => {
                  const year1 = item.policies.find(
                    (policy) => policy.year === 1,
                  );

                  const year2 = item.policies.find(
                    (policy) => policy.year === 2,
                  );

                  return (
                    <article
                      key={item.requestId}
                      className="min-w-0 p-4 sm:p-5"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-[15px] font-bold leading-5 text-slate-900 sm:text-base">
                            {item.clientName}
                          </p>

                          <Link
                            href={`/admin/dossiers/${item.requestId}`}
                            className="mt-1.5 inline-block break-all font-mono text-[11px] font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline sm:text-xs"
                          >
                            {item.requestCode}
                          </Link>
                        </div>

                        {item.status === "policy_available" ? (
                          <span className="inline-flex shrink-0 rounded-full border border-[#CFE3CF] bg-[#F3F8F2] px-2.5 py-1 text-[10px] font-bold text-[#0B5D3B] sm:px-3 sm:text-xs">
                            Disponible
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 sm:px-3 sm:text-xs">
                            En préparation
                          </span>
                        )}
                      </div>

                      {item.whatsapp && (
                        <a
                          href={`https://wa.me/${item.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block break-all text-[12px] font-medium text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline sm:text-sm"
                        >
                          {item.whatsapp}
                        </a>
                      )}

                      <dl className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:gap-4">
                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Responsable
                          </dt>
                          <dd className="mt-1 break-words text-[12px] font-semibold text-slate-700 sm:text-sm">
                            {item.assignedAgentName ?? "Non attribué"}
                          </dd>
                        </div>

                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Durée
                          </dt>
                          <dd className="mt-1 text-[12px] font-semibold text-slate-700 sm:text-sm">
                            {item.durationYears} an
                            {item.durationYears === 2 ? "s" : ""}
                          </dd>
                        </div>

                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Début
                          </dt>
                          <dd className="mt-1 break-words text-[12px] font-semibold text-slate-700 sm:text-sm">
                            {formatDate(item.startDate)}
                          </dd>
                        </div>

                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Fin
                          </dt>
                          <dd className="mt-1 break-words text-[12px] font-semibold text-slate-700 sm:text-sm">
                            {formatDate(item.endDate)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Police année 1
                          </p>

                          <div className="mt-2">
                            {year1 ? (
                              year1.signedUrl ? (
                                <a
                                  href={year1.signedUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-[#CFE3CF] bg-[#F3F8F2] px-3 text-[11px] font-semibold text-[#0B5D3B] transition hover:bg-[#EAF4E8] sm:text-xs"
                                >
                                  Ouvrir PDF
                                </a>
                              ) : (
                                <span className="text-[11px] font-semibold text-[#0B5D3B] sm:text-xs">
                                  Enregistrée
                                </span>
                              )
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-400 sm:text-xs">
                                Manquante
                              </span>
                            )}
                          </div>
                        </div>

                        {item.durationYears === 2 && (
                          <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Police année 2
                            </p>

                            <div className="mt-2">
                              {year2 ? (
                                year2.signedUrl ? (
                                  <a
                                    href={year2.signedUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-[#CFE3CF] bg-[#F3F8F2] px-3 text-[11px] font-semibold text-[#0B5D3B] transition hover:bg-[#EAF4E8] sm:text-xs"
                                  >
                                    Ouvrir PDF
                                  </a>
                                ) : (
                                  <span className="text-[11px] font-semibold text-[#0B5D3B] sm:text-xs">
                                    Enregistrée
                                  </span>
                                )
                              ) : (
                                <span className="text-[11px] font-semibold text-slate-400 sm:text-xs">
                                  Manquante
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/admin/dossiers/${item.requestId}`}
                        className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#B8E83D] px-4 text-[12px] font-black text-[#15311F] transition hover:bg-[#C7F34E] sm:min-h-11 sm:text-sm"
                      >
                        {item.status === "policy_preparation"
                          ? "Préparer"
                          : "Ouvrir"}
                      </Link>
                    </article>
                  );
                })}
              </div>

              <div className="hidden lg:block">
            <TableContainer className="rounded-none border-0 shadow-none">
              <Table className="min-w-[1500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Client
                    </TableHead>

                    <TableHead>
                      Dossier
                    </TableHead>

                    <TableHead>
                      Responsable
                    </TableHead>

                    <TableHead>
                      Durée
                    </TableHead>

                    <TableHead>
                      Début
                    </TableHead>

                    <TableHead>
                      Fin
                    </TableHead>

                    <TableHead>
                      Année 1
                    </TableHead>

                    <TableHead>
                      Année 2
                    </TableHead>

                    <TableHead>
                      Statut
                    </TableHead>

                    <TableHead className="text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {policies.map(
                    (
                      item,
                    ) => {
                      const year1 =
                        item.policies.find(
                          (
                            policy,
                          ) =>
                            policy.year ===
                            1,
                        );

                      const year2 =
                        item.policies.find(
                          (
                            policy,
                          ) =>
                            policy.year ===
                            2,
                        );

                      return (
                        <TableRow
                          key={
                            item.requestId
                          }
                        >
                          <TableCell>
                            <div className="min-w-[190px]">
                              <p className="font-semibold text-slate-900">
                                {
                                  item.clientName
                                }
                              </p>

                              {item.whatsapp && (
                                <a
                                  href={`https://wa.me/${item.whatsapp.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 block text-xs font-medium text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline"
                                >
                                  {
                                    item.whatsapp
                                  }
                                </a>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            <Link
                              href={`/admin/dossiers/${item.requestId}`}
                              className="font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline"
                            >
                              {
                                item.requestCode
                              }
                            </Link>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {item.assignedAgentName ??
                              "Non attribué"}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {
                              item.durationYears
                            }{" "}
                            an
                            {item.durationYears ===
                            2
                              ? "s"
                              : ""}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatDate(
                              item.startDate,
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatDate(
                              item.endDate,
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {year1 ? (
                              year1.signedUrl ? (
                                <a
                                  href={
                                    year1.signedUrl
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-3 py-2 text-xs font-semibold text-[#0B5D3B] transition hover:bg-[#EAF4E8]"
                                >
                                  Ouvrir PDF
                                </a>
                              ) : (
                                <span className="text-xs font-semibold text-[#0B5D3B]">
                                  Enregistrée
                                </span>
                              )
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">
                                Manquante
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {item.durationYears ===
                            1 ? (
                              <span className="text-slate-400">
                                —
                              </span>
                            ) : year2 ? (
                              year2.signedUrl ? (
                                <a
                                  href={
                                    year2.signedUrl
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-3 py-2 text-xs font-semibold text-[#0B5D3B] transition hover:bg-[#EAF4E8]"
                                >
                                  Ouvrir PDF
                                </a>
                              ) : (
                                <span className="text-xs font-semibold text-[#0B5D3B]">
                                  Enregistrée
                                </span>
                              )
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">
                                Manquante
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {item.status ===
                            "policy_available" ? (
                              <span className="inline-flex rounded-full border border-[#CFE3CF] bg-[#F3F8F2] px-3 py-1 text-xs font-bold text-[#0B5D3B]">
                                Disponible
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                En préparation
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap text-right">
                            <Link
                              href={`/admin/dossiers/${item.requestId}`}
                              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#B8E83D] px-4 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E]"
                            >
                              {item.status ===
                              "policy_preparation"
                                ? "Préparer"
                                : "Ouvrir"}
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
  value: number;
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
    <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 sm:rounded-[1.5rem] sm:p-5">
      <span
        className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${className}`}
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

      <p className="mt-1 text-xs text-slate-500">
        {
          description
        }
      </p>
    </div>
  );
}