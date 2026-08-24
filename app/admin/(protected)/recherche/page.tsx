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

import {
  requireRole,
} from "@/lib/auth/requireRole";

import {
  createServiceClient,
} from "@/lib/supabase/service";

const ITEMS_PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  page?: string;
}>;

type RequestRow = {
  id: string;
  request_code: string;
  status: string;

  assigned_agent_id:
    | string
    | null;

  passport_number:
    | string
    | null;

  kimlik_number:
    | string
    | null;

  calculated_price:
    | number
    | string
    | null;

  insurance_duration_years:
    number;

  created_at: string;

  client:
    | {
        first_name: string;
        last_name: string;

        nationality:
          | string
          | null;

        whatsapp_country_code:
          | string
          | null;

        whatsapp_number:
          | string
          | null;
      }
    | Array<{
        first_name: string;
        last_name: string;

        nationality:
          | string
          | null;

        whatsapp_country_code:
          | string
          | null;

        whatsapp_number:
          | string
          | null;
      }>
    | null;
};

type AgentOption = {
  id: string;
  name: string;
};

const statusLabels: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  draft: {
    label:
      "Brouillon",
    className:
      "border border-slate-200 bg-slate-100 text-slate-700",
  },

  waiting_payment: {
    label:
      "Paiement attendu",
    className:
      "border border-amber-200 bg-amber-50 text-amber-700",
  },

  payment_review: {
    label:
      "Paiement à vérifier",
    className:
      "border border-orange-200 bg-orange-50 text-orange-700",
  },

  payment_confirmed: {
    label:
      "Paiement confirmé",
    className:
      "border border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]",
  },

  policy_preparation: {
    label:
      "Assurance en préparation",
    className:
      "border border-[#DDE7D8] bg-[#EEF6EC] text-[#31513B]",
  },

  policy_available: {
    label:
      "Assurance disponible",
    className:
      "border border-[#CFE3CF] bg-[#EEF6EC] text-[#0B5D3B]",
  },

  payment_rejected: {
    label:
      "Paiement refusé",
    className:
      "border border-red-200 bg-red-50 text-red-700",
  },

  cancelled: {
    label:
      "Dossier annulé",
    className:
      "border border-slate-200 bg-slate-100 text-slate-600",
  },
};

function unwrapClient(
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

function normalizeText(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase(
      "fr-FR",
    );
}

function normalizePhone(
  value: string,
) {
  return value.replace(
    /\D/g,
    "",
  );
}

function formatDate(
  value: string,
) {
  const date =
    new Date(
      value,
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
        "short",

      timeStyle:
        "short",

      timeZone:
        "Europe/Istanbul",
    },
  ).format(
    date,
  );
}

async function getAgents() {
  const supabase =
    createServiceClient();

  const {
    data,
    error,
  } =
    await supabase.auth.admin.listUsers({
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
        authUser,
      ) => {
        const role =
          authUser
            .app_metadata
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
        authUser,
      ): AgentOption => {
        const firstName =
          authUser
            .user_metadata
            ?.first_name
            ?.toString()
            .trim() ??
          "";

        const lastName =
          authUser
            .user_metadata
            ?.last_name
            ?.toString()
            .trim() ??
          "";

        const fullName =
          `${firstName} ${lastName}`.trim();

        return {
          id:
            authUser.id,

          name:
            fullName ||
            authUser.email ||
            "Agent",
        };
      },
    );
}

function createAgentNameMap(
  agents:
    AgentOption[],
) {
  return new Map(
    agents.map(
      (
        agent,
      ) => [
        agent.id,
        agent.name,
      ],
    ),
  );
}

async function searchRequests({
  search,
  currentUserId,
  role,
}: {
  search: string;
  currentUserId: string;

  role:
    | "admin"
    | "agent";
}) {
  const supabase =
    createServiceClient();

  let query =
    supabase
      .from(
        "insurance_requests",
      )
      .select(
        `
          id,
          request_code,
          status,
          assigned_agent_id,
          passport_number,
          kimlik_number,
          calculated_price,
          insurance_duration_years,
          created_at,

          client:clients (
            first_name,
            last_name,
            nationality,
            whatsapp_country_code,
            whatsapp_number
          )
        `,
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      );

  /*
   * Agent :
   * - ses propres dossiers
   * - dossiers encore non attribués
   *
   * Admin :
   * - tous les dossiers
   */
  if (
    role ===
    "agent"
  ) {
    query =
      query.or(
        `assigned_agent_id.eq.${currentUserId},assigned_agent_id.is.null`,
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const rows =
    (data ??
      []) as unknown as RequestRow[];

  if (!search) {
    return [];
  }

  const normalizedSearch =
    normalizeText(
      search,
    );

  const normalizedPhoneSearch =
    normalizePhone(
      search,
    );

  return rows.filter(
    (
      request,
    ) => {
      const client =
        unwrapClient(
          request.client,
        );

      const firstName =
        client
          ?.first_name ??
        "";

      const lastName =
        client
          ?.last_name ??
        "";

      const fullName =
        `${firstName} ${lastName}`;

      const reverseFullName =
        `${lastName} ${firstName}`;

      const nationality =
        client
          ?.nationality ??
        "";

      const whatsapp =
        client
          ? `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`
          : "";

      const normalizedWhatsapp =
        normalizePhone(
          whatsapp,
        );

      const passport =
        request.passport_number ??
        "";

      const kimlik =
        request.kimlik_number ??
        "";

      return (
        normalizeText(
          request.request_code,
        ).includes(
          normalizedSearch,
        ) ||
        normalizeText(
          firstName,
        ).includes(
          normalizedSearch,
        ) ||
        normalizeText(
          lastName,
        ).includes(
          normalizedSearch,
        ) ||
        normalizeText(
          fullName,
        ).includes(
          normalizedSearch,
        ) ||
        normalizeText(
          reverseFullName,
        ).includes(
          normalizedSearch,
        ) ||
        normalizeText(
          nationality,
        ).includes(
          normalizedSearch,
        ) ||
        normalizeText(
          passport,
        ).includes(
          normalizedSearch,
        ) ||
        normalizeText(
          kimlik,
        ).includes(
          normalizedSearch,
        ) ||
        Boolean(
          normalizedPhoneSearch &&
            normalizedWhatsapp.includes(
              normalizedPhoneSearch,
            ),
        )
      );
    },
  );
}

function buildPageUrl({
  search,
  page,
}: {
  search: string;
  page: number;
}) {
  const params =
    new URLSearchParams();

  if (search) {
    params.set(
      "q",
      search,
    );
  }

  if (
    page >
    1
  ) {
    params.set(
      "page",
      String(
        page,
      ),
    );
  }

  const query =
    params.toString();

  return query
    ? `/admin/recherche?${query}`
    : "/admin/recherche";
}

export default async function RecherchePage({
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
      "agent",
      "admin",
    ]);

  const params =
    await searchParams;

  const search =
    params.q
      ?.trim() ??
    "";

  const requestedPage =
    Number(
      params.page ??
      "1",
    );

  let currentPage =
    Number.isFinite(
      requestedPage,
    ) &&
    requestedPage >
      0
      ? Math.floor(
          requestedPage,
        )
      : 1;

  let requests:
    RequestRow[] =
    [];

  let agents:
    AgentOption[] =
    [];

  let errorMessage =
    "";

  try {
    const [
      requestResult,
      agentsResult,
    ] =
      await Promise.all([
        searchRequests({
          search,

          currentUserId:
            user.id,

          role,
        }),

        getAgents(),
      ]);

    requests =
      requestResult;

    agents =
      agentsResult;
  } catch (
    error
  ) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "La recherche n’a pas pu être effectuée.";
  }

  const agentNames =
    createAgentNameMap(
      agents,
    );

  const totalRequests =
    requests.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalRequests /
          ITEMS_PER_PAGE,
      ),
    );

  if (
    currentPage >
    totalPages
  ) {
    currentPage =
      totalPages;
  }

  const startIndex =
    (
      currentPage -
      1
    ) *
    ITEMS_PER_PAGE;

  const endIndex =
    startIndex +
    ITEMS_PER_PAGE;

  const paginatedRequests =
    requests.slice(
      startIndex,
      endIndex,
    );

  const firstVisibleItem =
    totalRequests ===
    0
      ? 0
      : startIndex +
        1;

  const lastVisibleItem =
    Math.min(
      endIndex,
      totalRequests,
    );

  const visiblePages =
    Array.from(
      {
        length:
          totalPages,
      },
      (
        _,
        index,
      ) =>
        index + 1,
    ).filter(
      (
        pageNumber,
      ) =>
        pageNumber ===
          1 ||
        pageNumber ===
          totalPages ||
        Math.abs(
          pageNumber -
            currentPage,
        ) <= 2,
    );

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                Recherche globale
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-4xl">
                Rechercher dans les dossiers
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">
                Retrouvez un dossier avec son matricule, le nom du client,
                WhatsApp, le numéro de passeport, le Kimlik ou la nationalité.
              </p>
            </div>

            <Link
              href="/admin/tableau-de-bord"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              ← Tableau de bord
            </Link>
          </div>
        </header>

        <section className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
          <form
            method="GET"
            className="flex flex-col gap-3 lg:flex-row"
          >
            <div className="min-w-0 flex-1">
              <label
                htmlFor="q"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Recherche
              </label>

              <input
                id="q"
                name="q"
                type="search"
                defaultValue={
                  search
                }
                autoFocus
                placeholder="Ex. IFS-260824-AB12, WANDJI, +90..., passeport, Kimlik..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#102B20] outline-none transition placeholder:text-slate-400 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
              />
            </div>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#B8E83D] px-6 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E]"
              >
                Rechercher
              </button>

              {search && (
                <Link
                  href="/admin/recherche"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Effacer
                </Link>
              )}
            </div>
          </form>

          <div className="mt-4 rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-4 py-3 text-xs leading-5 text-[#31513B]">
            La recherche accepte également une partie du nom, du matricule,
            du passeport, du Kimlik ou du numéro WhatsApp.
          </div>
        </section>

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {
              errorMessage
            }
          </div>
        )}

        {!search ? (
          <section className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F8F2] text-xl text-[#0B5D3B]">
              ⌕
            </div>

            <h2 className="mt-4 text-lg font-semibold text-[#102B20]">
              Lancez une recherche
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Saisissez une information du client ou du dossier dans le champ
              ci-dessus.
            </p>
          </section>
        ) : (
          <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                  Résultats
                </p>

                <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                  Résultats pour « {search} »
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {totalRequests.toLocaleString(
                    "fr-FR",
                  )}{" "}
                  dossier
                  {totalRequests !==
                  1
                    ? "s"
                    : ""}{" "}
                  trouvé
                  {totalRequests !==
                  1
                    ? "s"
                    : ""}
                </p>
              </div>

              {totalRequests >
                0 && (
                <span className="rounded-full border border-slate-200 bg-[#FAFCFA] px-3 py-1 text-sm font-semibold text-slate-600">
                  {
                    firstVisibleItem
                  }
                  –
                  {
                    lastVisibleItem
                  }{" "}
                  sur{" "}
                  {
                    totalRequests
                  }
                </span>
              )}
            </div>

            {paginatedRequests.length ===
            0 ? (
              <div className="px-6 py-14 text-center">
                <p className="font-semibold text-[#102B20]">
                  Aucun résultat
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Vérifiez l’orthographe ou essayez avec une autre information.
                </p>
              </div>
            ) : (
              <TableContainer className="rounded-none border-0 shadow-none">
                <Table className="min-w-[1550px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Matricule
                      </TableHead>

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
                        Passeport
                      </TableHead>

                      <TableHead>
                        Kimlik
                      </TableHead>

                      <TableHead>
                        Durée
                      </TableHead>

                      <TableHead>
                        Montant
                      </TableHead>

                      <TableHead>
                        Responsable
                      </TableHead>

                      <TableHead>
                        Statut
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
                    {paginatedRequests.map(
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

                        const statusInformation =
                          statusLabels[
                            request.status
                          ] ?? {
                            label:
                              request.status,

                            className:
                              "border border-slate-200 bg-slate-100 text-slate-600",
                          };

                        const assignedAgentName =
                          request.assigned_agent_id
                            ? agentNames.get(
                                request.assigned_agent_id,
                              ) ??
                              "Agent"
                            : null;

                        const isMine =
                          request.assigned_agent_id ===
                          user.id;

                        return (
                          <TableRow
                            key={
                              request.id
                            }
                          >
                            <TableCell className="whitespace-nowrap">
                              <span className="font-black text-[#0B5D3B]">
                                {
                                  request.request_code
                                }
                              </span>
                            </TableCell>

                            <TableCell className="whitespace-nowrap font-semibold text-[#102B20]">
                              {
                                clientName
                              }
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                              {client
                                ?.nationality ??
                                "—"}
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                              {whatsapp ||
                                "—"}
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                              {request.passport_number ??
                                "—"}
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                              {request.kimlik_number ??
                                "—"}
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                              {
                                request.insurance_duration_years
                              }{" "}
                              an
                              {request.insurance_duration_years ===
                              2
                                ? "s"
                                : ""}
                            </TableCell>

                            <TableCell className="whitespace-nowrap font-semibold text-[#102B20]">
                              {Number(
                                request.calculated_price ??
                                  0,
                              ).toLocaleString(
                                "fr-FR",
                              )}{" "}
                              TL
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                              {!request.assigned_agent_id ? (
                                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                  Non attribué
                                </span>
                              ) : role ===
                                "admin" ? (
                                <span className="inline-flex rounded-full border border-[#DDE7D8] bg-[#F3F8F2] px-3 py-1 text-xs font-semibold text-[#31513B]">
                                  {
                                    assignedAgentName
                                  }
                                </span>
                              ) : isMine ? (
                                <span className="inline-flex rounded-full border border-[#CFE3CF] bg-[#F3F8F2] px-3 py-1 text-xs font-semibold text-[#0B5D3B]">
                                  Vous
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                  Déjà attribué
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusInformation.className}`}
                              >
                                {
                                  statusInformation.label
                                }
                              </span>
                            </TableCell>

                            <TableCell className="whitespace-nowrap text-slate-500">
                              {formatDate(
                                request.created_at,
                              )}
                            </TableCell>

                            <TableCell className="whitespace-nowrap text-right">
                              <Link
                                href={`/admin/dossiers/${request.id}`}
                                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#CFE3CF] bg-white px-4 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#F3F8F2]"
                              >
                                Ouvrir
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

            {totalPages >
              1 && (
              <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Page{" "}
                  <strong className="text-[#102B20]">
                    {
                      currentPage
                    }
                  </strong>{" "}
                  sur{" "}
                  <strong className="text-[#102B20]">
                    {
                      totalPages
                    }
                  </strong>
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {currentPage >
                    1 && (
                    <Link
                      href={buildPageUrl({
                        search,

                        page:
                          currentPage -
                          1,
                      })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      ← Précédent
                    </Link>
                  )}

                  {visiblePages.map(
                    (
                      pageNumber,
                    ) => (
                      <Link
                        key={
                          pageNumber
                        }
                        href={buildPageUrl({
                          search,

                          page:
                            pageNumber,
                        })}
                        className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                          pageNumber ===
                          currentPage
                            ? "bg-[#0B5D3B] text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {
                          pageNumber
                        }
                      </Link>
                    ),
                  )}

                  {currentPage <
                    totalPages && (
                    <Link
                      href={buildPageUrl({
                        search,

                        page:
                          currentPage +
                          1,
                      })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Suivant →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}