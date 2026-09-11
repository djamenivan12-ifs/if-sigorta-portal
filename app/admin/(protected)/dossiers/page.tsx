import Link from "next/link";

import ClaimRequestButton from "@/components/admin/requests/ClaimRequestButton";

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

const ITEMS_PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  nationality?: string;
  duration?: string;
  dateFrom?: string;
  dateTo?: string;
  agent?: string;
  source?: string;
  page?: string;
}>;

type RequestRow = {
  id: string;
  request_code: string;
  status: string;
  source: "direct" | "partner";
  partner_id: string | null;

  partner:
    | { code: string; company_name: string }
    | Array<{ code: string; company_name: string }>
    | null;

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

type ClientNationalityRow = {
  nationality:
    | string
    | null;
};

type AgentOption = {
  id: string;
  name: string;

  role:
    | "admin"
    | "agent";
};

const statusOptions = [
  {
    value: "",
    label:
      "Tous les statuts",
  },
  {
    value:
      "draft",
    label:
      "Brouillon",
  },
  {
    value:
      "waiting_payment",
    label:
      "Paiement attendu",
  },
  {
    value:
      "payment_review",
    label:
      "Paiement à vérifier",
  },
  {
    value:
      "payment_confirmed",
    label:
      "Paiement confirmé",
  },
  {
    value:
      "policy_preparation",
    label:
      "Assurance en préparation",
  },
  {
    value:
      "policy_available",
    label:
      "Assurance disponible",
  },
  {
    value:
      "payment_rejected",
    label:
      "Paiement refusé",
  },
  {
    value:
      "cancelled",
    label:
      "Dossier annulé",
  },
];

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
      "bg-slate-100 text-slate-700",
  },

  waiting_payment: {
    label:
      "Paiement attendu",

    className:
      "bg-amber-100 text-amber-800",
  },

  payment_review: {
    label:
      "Paiement à vérifier",

    className:
      "bg-orange-100 text-orange-800",
  },

  payment_confirmed: {
    label:
      "Paiement confirmé",

    className:
      "bg-green-100 text-green-800",
  },

  policy_preparation: {
    label:
      "Assurance en préparation",

    className:
      "bg-blue-100 text-blue-800",
  },

  policy_available: {
    label:
      "Assurance disponible",

    className:
      "bg-emerald-100 text-emerald-800",
  },

  payment_rejected: {
    label:
      "Paiement refusé",

    className:
      "bg-red-100 text-red-800",
  },

  cancelled: {
    label:
      "Dossier annulé",

    className:
      "bg-slate-200 text-slate-800",
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

function unwrapPartner(
  relation: RequestRow["partner"],
) {
  return Array.isArray(relation)
    ? relation[0] ?? null
    : relation;
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

function createStartDate(
  value: string,
) {
  return new Date(
    `${value}T00:00:00+03:00`,
  );
}

function createEndDate(
  value: string,
) {
  return new Date(
    `${value}T23:59:59.999+03:00`,
  );
}

async function getNationalities() {
  const supabase =
    createServiceClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "clients",
      )
      .select(
        "nationality",
      );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const rows =
    (data ??
      []) as ClientNationalityRow[];

  return Array.from(
    new Set(
      rows
        .map(
          (
            row,
          ) =>
            row.nationality
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

          role:
            authUser
              .app_metadata
              ?.role ===
            "admin"
              ? "admin"
              : "agent",
        };
      },
    )
    .sort(
      (
        first,
        second,
      ) =>
        first.name.localeCompare(
          second.name,
          "fr-FR",
        ),
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

async function getRequests({
  search,
  status,
  nationality,
  duration,
  dateFrom,
  dateTo,
  agent,
  source,
  currentUserId,
  role,
}: {
  search: string;
  status: string;
  nationality: string;
  duration: string;
  dateFrom: string;
  dateTo: string;
  agent: string;
  source: string;
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
          source,
          partner_id,
          assigned_agent_id,
          passport_number,
          kimlik_number,
          calculated_price,
          insurance_duration_years,
          created_at,

          partner:partners (
            code,
            company_name
          ),

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

  if (status) {
    query =
      query.eq(
        "status",
        status,
      );
  }

  if (source === "direct" || source === "partner") {
    query = query.eq("source", source);
  }

  if (
    duration ===
      "1" ||
    duration ===
      "2"
  ) {
    query =
      query.eq(
        "insurance_duration_years",
        Number(
          duration,
        ),
      );
  }

  if (
    agent ===
    "me"
  ) {
    query =
      query.eq(
        "assigned_agent_id",
        currentUserId,
      );
  } else if (
    agent ===
    "unassigned"
  ) {
    query =
      query.is(
        "assigned_agent_id",
        null,
      );
  } else if (
    agent &&
    role ===
      "admin"
  ) {
    query =
      query.eq(
        "assigned_agent_id",
        agent,
      );
  }

  if (dateFrom) {
    const startDate =
      createStartDate(
        dateFrom,
      );

    if (
      !Number.isNaN(
        startDate.getTime(),
      )
    ) {
      query =
        query.gte(
          "created_at",
          startDate.toISOString(),
        );
    }
  }

  if (dateTo) {
    const endDate =
      createEndDate(
        dateTo,
      );

    if (
      !Number.isNaN(
        endDate.getTime(),
      )
    ) {
      query =
        query.lte(
          "created_at",
          endDate.toISOString(),
        );
    }
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

  let rows =
    (data ??
      []) as unknown as RequestRow[];

  if (nationality) {
    const normalizedNationality =
      nationality
        .trim()
        .toLocaleLowerCase(
          "fr-FR",
        );

    rows =
      rows.filter(
        (
          request,
        ) => {
          const client =
            unwrapClient(
              request.client,
            );

          return (
            client
              ?.nationality ??
            ""
          )
            .trim()
            .toLocaleLowerCase(
              "fr-FR",
            ) ===
            normalizedNationality;
        },
      );
  }

  if (!search) {
    return rows;
  }

  const normalizedSearch =
    search
      .trim()
      .toLocaleLowerCase(
        "fr-FR",
      );

  const normalizedPhoneSearch =
    search.replace(
      /\D/g,
      "",
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

      const whatsapp =
        client
          ? `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`
          : "";

      const normalizedWhatsapp =
        whatsapp.replace(
          /\D/g,
          "",
        );

      const passport =
        request.passport_number ??
        "";

      const kimlik =
        request.kimlik_number ??
        "";

      return (
        request.request_code
          .toLocaleLowerCase(
            "fr-FR",
          )
          .includes(
            normalizedSearch,
          ) ||

        firstName
          .toLocaleLowerCase(
            "fr-FR",
          )
          .includes(
            normalizedSearch,
          ) ||

        lastName
          .toLocaleLowerCase(
            "fr-FR",
          )
          .includes(
            normalizedSearch,
          ) ||

        fullName
          .toLocaleLowerCase(
            "fr-FR",
          )
          .includes(
            normalizedSearch,
          ) ||

        reverseFullName
          .toLocaleLowerCase(
            "fr-FR",
          )
          .includes(
            normalizedSearch,
          ) ||

        passport
          .toLocaleLowerCase(
            "fr-FR",
          )
          .includes(
            normalizedSearch,
          ) ||

        kimlik
          .toLocaleLowerCase(
            "fr-FR",
          )
          .includes(
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
  page,
  search,
  status,
  nationality,
  duration,
  dateFrom,
  dateTo,
  agent,
  source,
}: {
  page: number;
  search: string;
  status: string;
  nationality: string;
  duration: string;
  dateFrom: string;
  dateTo: string;
  agent: string;
  source: string;
}) {
  const params =
    new URLSearchParams();

  if (search) {
    params.set(
      "q",
      search,
    );
  }

  if (status) {
    params.set(
      "status",
      status,
    );
  }

  if (nationality) {
    params.set(
      "nationality",
      nationality,
    );
  }

  if (duration) {
    params.set(
      "duration",
      duration,
    );
  }

  if (dateFrom) {
    params.set(
      "dateFrom",
      dateFrom,
    );
  }

  if (dateTo) {
    params.set(
      "dateTo",
      dateTo,
    );
  }

  if (agent) {
    params.set(
      "agent",
      agent,
    );
  }

  if (source) {
    params.set("source", source);
  }

  if (
    page >
    1
  ) {
    params.set(
      "page",
      page.toString(),
    );
  }

  const query =
    params.toString();

  return query
    ? `/admin/dossiers?${query}`
    : "/admin/dossiers";
}

export default async function DossiersPage({
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

  const status =
    params.status
      ?.trim() ??
    "";

  const nationality =
    params.nationality
      ?.trim() ??
    "";

  const duration =
    params.duration
      ?.trim() ??
    "";

  const dateFrom =
    params.dateFrom
      ?.trim() ??
    "";

  const dateTo =
    params.dateTo
      ?.trim() ??
    "";

  const agent =
    params.agent
      ?.trim() ??
    "";

  const source =
    params.source
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

  let nationalities:
    string[] =
    [];

  let agents:
    AgentOption[] =
    [];

  let agentNames =
    new Map<
      string,
      string
    >();

  let errorMessage =
    "";

  try {
    const [
      requestsResult,
      nationalitiesResult,
      agentsResult,
    ] =
      await Promise.all([
        getRequests({
          search,
          status,
          nationality,
          duration,
          dateFrom,
          dateTo,
          agent,
          source,

          currentUserId:
            user.id,

          role,
        }),

        getNationalities(),

        getAgents(),
      ]);

    requests =
      requestsResult;

    nationalities =
      nationalitiesResult;

    agents =
      agentsResult;

    agentNames =
      createAgentNameMap(
        agents,
      );
  } catch (
    error
  ) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Les dossiers n’ont pas pu être chargés.";
  }

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
    (currentPage -
      1) *
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
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-[1500px]">
        <header className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.75rem] sm:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                IF Sigorta
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-3 sm:text-3xl lg:text-4xl">
                Tous les dossiers
              </h1>

              <p className="mt-2 text-[13px] leading-6 text-slate-500 sm:mt-3 sm:text-sm sm:leading-7 lg:text-base">
                Consultez, recherchez et prenez en charge les demandes clients.
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
              <a
                href={`/api/admin/exports/dossiers?${new URLSearchParams({
                  ...(search
                    ? {
                        q: search,
                      }
                    : {}),

                  ...(status
                    ? {
                        status,
                      }
                    : {}),

                  ...(nationality
                    ? {
                        nationality,
                      }
                    : {}),

                  ...(duration
                    ? {
                        duration,
                      }
                    : {}),

                  ...(dateFrom
                    ? {
                        dateFrom,
                      }
                    : {}),

                  ...(dateTo
                    ? {
                        dateTo,
                      }
                    : {}),
                }).toString()}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0B5D3B] px-4 text-[13px] font-black text-white transition hover:bg-[#084A2F] sm:w-auto sm:px-5 sm:text-sm"
              >
                📊 Export Excel
              </a>

              <Link
                href="/admin/dashboard"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:px-5 sm:text-sm"
              >
                ← Tableau de bord
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-4 min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:mt-6 sm:rounded-[1.5rem] sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-[#102B20]">
              Recherche et filtres
            </h2>

            <p className="mt-1 text-[12px] leading-5 text-slate-500 sm:text-sm">
              Retrouvez rapidement un dossier.
            </p>
          </div>

          <form
            method="GET"
            className="min-w-0 space-y-4 sm:space-y-5"
          >
            <div>
              <label
                htmlFor="q"
                className="mb-1.5 block text-[12px] font-medium text-slate-700 sm:mb-2 sm:text-sm"
              >
                Recherche générale
              </label>

              <input
                id="q"
                name="q"
                type="search"
                defaultValue={
                  search
                }
                placeholder="Matricule, nom, prénom, WhatsApp, passeport, Kimlik, partenaire ou code partenaire"
                className="min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[13px] outline-none transition placeholder:text-slate-400 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:px-4 sm:py-3 sm:text-sm"
              />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-6">
              <div>
                <label
                  htmlFor="status"
                  className="mb-1.5 block text-[12px] font-medium text-slate-700 sm:mb-2 sm:text-sm"
                >
                  Statut
                </label>

                <select
                  id="status"
                  name="status"
                  defaultValue={
                    status
                  }
                  className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:px-4 sm:py-3 sm:text-sm"
                >
                  {statusOptions.map(
                    (
                      option,
                    ) => (
                      <option
                        key={
                          option.value ||
                          "all"
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="nationality"
                  className="mb-1.5 block text-[12px] font-medium text-slate-700 sm:mb-2 sm:text-sm"
                >
                  Nationalité
                </label>

                <select
                  id="nationality"
                  name="nationality"
                  defaultValue={
                    nationality
                  }
                  className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:px-4 sm:py-3 sm:text-sm"
                >
                  <option value="">
                    Toutes les nationalités
                  </option>

                  {nationalities.map(
                    (
                      nationalityOption,
                    ) => (
                      <option
                        key={
                          nationalityOption
                        }
                        value={
                          nationalityOption
                        }
                      >
                        {
                          nationalityOption
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="duration"
                  className="mb-1.5 block text-[12px] font-medium text-slate-700 sm:mb-2 sm:text-sm"
                >
                  Durée
                </label>

                <select
                  id="duration"
                  name="duration"
                  defaultValue={
                    duration
                  }
                  className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:px-4 sm:py-3 sm:text-sm"
                >
                  <option value="">
                    Toutes les durées
                  </option>

                  <option value="1">
                    1 an
                  </option>

                  <option value="2">
                    2 ans
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="agent"
                  className="mb-1.5 block text-[12px] font-medium text-slate-700 sm:mb-2 sm:text-sm"
                >
                  Responsable
                </label>

                <select
                  id="agent"
                  name="agent"
                  defaultValue={
                    agent
                  }
                  className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:px-4 sm:py-3 sm:text-sm"
                >
                  <option value="">
                    Tous les responsables
                  </option>

                  <option value="me">
                    Mes dossiers
                  </option>

                  <option value="unassigned">
                    Non attribués
                  </option>

                  {role ===
                    "admin" &&
                    agents.map(
                      (
                        agentOption,
                      ) => (
                        <option
                          key={
                            agentOption.id
                          }
                          value={
                            agentOption.id
                          }
                        >
                          {
                            agentOption.name
                          }

                          {agentOption.role ===
                          "admin"
                            ? " — Admin"
                            : ""}
                        </option>
                      ),
                    )}
                </select>
              </div>

              <div>
                <label htmlFor="source" className="mb-1.5 block text-[12px] font-medium text-slate-700 sm:mb-2 sm:text-sm">
                  Source
                </label>
                <select
                  id="source"
                  name="source"
                  defaultValue={source}
                  className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:px-4 sm:py-3 sm:text-sm"
                >
                  <option value="">Toutes les sources</option>
                  <option value="direct">Client direct</option>
                  <option value="partner">Partenaire</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="dateFrom"
                  className="mb-1.5 block text-[12px] font-medium text-slate-700 sm:mb-2 sm:text-sm"
                >
                  À partir du
                </label>

                <input
                  id="dateFrom"
                  name="dateFrom"
                  type="date"
                  defaultValue={
                    dateFrom
                  }
                  className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:px-4 sm:py-3 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <label
                  htmlFor="dateTo"
                  className="mb-1.5 block text-[12px] font-medium text-slate-700 sm:mb-2 sm:text-sm"
                >
                  Jusqu’au
                </label>

                <input
                  id="dateTo"
                  name="dateTo"
                  type="date"
                  defaultValue={
                    dateTo
                  }
                  className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:px-4 sm:py-3 sm:text-sm"
                />
              </div>

              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                <button
                  type="submit"
                  className="min-h-11 w-full rounded-xl bg-[#0B5D3B] px-4 text-[13px] font-black text-white transition hover:bg-[#084A2F] sm:min-h-12 sm:w-auto sm:px-6 sm:text-sm"
                >
                  Appliquer les filtres
                </button>

                <Link
                  href="/admin/dossiers"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 sm:min-h-12 sm:w-auto sm:px-6 sm:text-sm"
                >
                  Réinitialiser
                </Link>
              </div>
            </div>
          </form>
        </section>

        {errorMessage && (
          <div className="mt-4 min-w-0 rounded-xl bg-red-50 px-3 py-3 text-[13px] text-red-700 sm:mt-6 sm:px-4 sm:text-sm">
            {
              errorMessage
            }
          </div>
        )}

        <section className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white sm:mt-6 sm:rounded-[1.5rem]">
          <div className="flex min-w-0 flex-col gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                Résultats
              </h2>

              <p className="mt-1 text-[12px] leading-5 text-slate-500 sm:text-sm">
                {totalRequests.toLocaleString(
                  "fr-FR",
                )}{" "}
                dossier
                {totalRequests !==
                1
                  ? "s"
                  : ""}
              </p>
            </div>

            {totalRequests >
              0 && (
              <p className="text-sm text-slate-500">
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
              </p>
            )}
          </div>

          {paginatedRequests.length ===
          0 ? (
            <div className="p-6 text-center sm:p-12">
              <p className="font-semibold text-slate-700">
                Aucun dossier trouvé
              </p>
            </div>
          ) : (
            <>
              <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:hidden">
                {paginatedRequests.map((request) => {
                  const client =
                    unwrapClient(request.client);

                  const partner =
                    unwrapPartner(request.partner);

                  const clientName =
                    client
                      ? `${client.first_name} ${client.last_name}`.trim()
                      : "Client inconnu";

                  const whatsapp =
                    client
                      ? `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`
                      : "";

                  const statusInformation =
                    statusLabels[request.status] ?? {
                      label: request.status,
                      className:
                        "bg-slate-100 text-slate-700",
                    };

                  const assignedAgentName =
                    request.assigned_agent_id
                      ? agentNames.get(
                          request.assigned_agent_id,
                        ) ?? "Agent"
                      : null;

                  const isMine =
                    request.assigned_agent_id ===
                    user.id;

                  const sourceLabel =
                    request.source === "partner"
                      ? partner
                        ? `${partner.company_name} (${partner.code})`
                        : "Partenaire"
                      : "Client direct";

                  return (
                    <article
                      key={request.id}
                      className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/admin/dossiers/${request.id}`}
                            className="break-all text-[13px] font-black text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline"
                          >
                            {request.request_code}
                          </Link>

                          <p className="mt-1 break-words text-[14px] font-semibold text-slate-900">
                            {clientName}
                          </p>
                        </div>

                        <span
                          className={`inline-flex max-w-[52%] shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold leading-4 ${statusInformation.className}`}
                        >
                          {statusInformation.label}
                        </span>
                      </div>

                      <dl className="mt-4 grid min-w-0 grid-cols-2 gap-3">
                        <div className="min-w-0 rounded-xl bg-[#FAFCFA] p-3">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Source
                          </dt>
                          <dd className="mt-1 break-words text-[12px] font-semibold text-slate-700">
                            {sourceLabel}
                          </dd>
                        </div>

                        <div className="min-w-0 rounded-xl bg-[#FAFCFA] p-3">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Responsable
                          </dt>
                          <dd className="mt-1 break-words text-[12px] font-semibold text-slate-700">
                            {!request.assigned_agent_id
                              ? "Non attribué"
                              : role === "admin"
                                ? assignedAgentName
                                : isMine
                                  ? "Vous"
                                  : "Déjà pris en charge"}
                          </dd>
                        </div>

                        <div className="min-w-0 rounded-xl bg-[#FAFCFA] p-3">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Nationalité
                          </dt>
                          <dd className="mt-1 break-words text-[12px] font-semibold text-slate-700">
                            {client?.nationality ?? "—"}
                          </dd>
                        </div>

                        <div className="min-w-0 rounded-xl bg-[#FAFCFA] p-3">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            WhatsApp
                          </dt>
                          <dd className="mt-1 break-words text-[12px] font-semibold text-slate-700">
                            {whatsapp || "—"}
                          </dd>
                        </div>

                        <div className="min-w-0 rounded-xl bg-[#FAFCFA] p-3">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Passeport
                          </dt>
                          <dd className="mt-1 break-all text-[12px] font-semibold text-slate-700">
                            {request.passport_number ?? "—"}
                          </dd>
                        </div>

                        <div className="min-w-0 rounded-xl bg-[#FAFCFA] p-3">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Kimlik
                          </dt>
                          <dd className="mt-1 break-all text-[12px] font-semibold text-slate-700">
                            {request.kimlik_number ?? "—"}
                          </dd>
                        </div>

                        <div className="min-w-0 rounded-xl bg-[#FAFCFA] p-3">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Durée
                          </dt>
                          <dd className="mt-1 text-[12px] font-semibold text-slate-700">
                            {request.insurance_duration_years} an
                            {request.insurance_duration_years === 2
                              ? "s"
                              : ""}
                          </dd>
                        </div>

                        <div className="min-w-0 rounded-xl bg-[#FAFCFA] p-3">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Montant
                          </dt>
                          <dd className="mt-1 break-words text-[12px] font-bold text-slate-800">
                            {Number(
                              request.calculated_price ?? 0,
                            ).toLocaleString("fr-FR")}{" "}
                            TL
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-3 rounded-xl border border-slate-100 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Date
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-600">
                          {formatDate(request.created_at)}
                        </p>
                      </div>

                      <div className="mt-4 min-w-0">
                        <ClaimRequestButton
                          requestId={request.id}
                          assignedAgentId={
                            request.assigned_agent_id
                          }
                          assignedAgentName={
                            assignedAgentName
                          }
                          currentUserId={user.id}
                          currentUserRole={role}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden lg:block">
<TableContainer className="rounded-none border-0 shadow-none">
              <Table className="min-w-[1880px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">
                      Matricule
                    </TableHead>

                    <TableHead className="w-[290px]">
                      Client
                    </TableHead>

                    <TableHead className="w-[190px]">
                      Source
                    </TableHead>

                    <TableHead className="w-[150px]">
                      Nationalité
                    </TableHead>

                    <TableHead className="w-[170px]">
                      WhatsApp
                    </TableHead>

                    <TableHead className="w-[150px]">
                      Passeport
                    </TableHead>

                    <TableHead className="w-[150px]">
                      Kimlik
                    </TableHead>

                    <TableHead className="w-[110px]">
                      Durée
                    </TableHead>

                    <TableHead className="w-[120px]">
                      Montant
                    </TableHead>

                    <TableHead className="w-[240px]">
                      Responsable
                    </TableHead>

                    <TableHead className="w-[190px]">
                      Statut
                    </TableHead>

                    <TableHead className="w-[170px]">
                      Date
                    </TableHead>

                    <TableHead className="w-[220px]">
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
                          ? `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`
                          : "";

                      const statusInformation =
                        statusLabels[
                          request.status
                        ] ?? {
                          label:
                            request.status,

                          className:
                            "bg-slate-100 text-slate-700",
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
                            <span className="font-semibold text-slate-900">
                              {
                                request.request_code
                              }
                            </span>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {
                              clientName
                            }
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {request.source === "partner"
                              ? (() => {
                                  const partner =
                                    unwrapPartner(
                                      request.partner,
                                    );

                                  return partner
                                    ? `${partner.company_name} (${partner.code})`
                                    : "Partenaire";
                                })()
                              : "Client direct"}
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

                          <TableCell className="whitespace-nowrap">
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
                              <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                Non attribué
                              </span>
                            ) : role ===
                              "admin" ? (
                              <span className="inline-flex rounded-full bg-[#EEF6EC] px-3 py-1 text-xs font-semibold text-[#0B5D3B]">
                                Pris en charge par{" "}
                                {
                                  assignedAgentName
                                }
                              </span>
                            ) : isMine ? (
                              <span className="inline-flex rounded-full bg-[#EEF6EC] px-3 py-1 text-xs font-semibold text-[#0B5D3B]">
                                Vous
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                Déjà pris en charge
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            <span
                              className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusInformation.className}`}
                            >
                              {
                                statusInformation.label
                              }
                            </span>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatDate(
                              request.created_at,
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            <div className="min-w-40">
                              <ClaimRequestButton
                                requestId={
                                  request.id
                                }
                                assignedAgentId={
                                  request.assigned_agent_id
                                }
                                assignedAgentName={
                                  assignedAgentName
                                }
                                currentUserId={
                                  user.id
                                }
                                currentUserRole={
                                  role
                                }
                              />
                            </div>
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

          {totalPages >
            1 && (
            <div className="flex min-w-0 flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
              <p className="text-sm text-slate-500">
                Page{" "}
                <strong>
                  {
                    currentPage
                  }
                </strong>{" "}
                sur{" "}
                <strong>
                  {
                    totalPages
                  }
                </strong>
              </p>

              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {currentPage >
                  1 && (
                  <Link
                    href={buildPageUrl({
                      page:
                        currentPage -
                        1,

                      search,
                      status,
                      nationality,
                      duration,
                      dateFrom,
                      dateTo,
                      agent,
                      source,
                    })}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#CFE3CF] hover:bg-[#F3F8F2] hover:text-[#0B5D3B]"
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
                        page:
                          pageNumber,

                        search,
                        status,
                        nationality,
                        duration,
                        dateFrom,
                        dateTo,
                        agent,
                        source,
                      })}
                      className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold ${
                        pageNumber ===
                        currentPage
                          ? "bg-[#0B5D3B] text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-[#CFE3CF] hover:bg-[#F3F8F2] hover:text-[#0B5D3B]"
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
                      page:
                        currentPage +
                        1,

                      search,
                      status,
                      nationality,
                      duration,
                      dateFrom,
                      dateTo,
                      agent,
                      source,
                    })}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#CFE3CF] hover:bg-[#F3F8F2] hover:text-[#0B5D3B]"
                  >
                    Suivant →
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}