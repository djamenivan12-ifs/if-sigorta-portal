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
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                IF Sigorta
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-4xl">
                Tous les dossiers
              </h1>

              <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                Consultez, recherchez et prenez en charge les demandes clients.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
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
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0B5D3B] px-5 text-sm font-black text-white transition hover:bg-[#084A2F]"
              >
                📊 Export Excel
              </a>

              <Link
                href="/admin/tableau-de-bord"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                ← Tableau de bord
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-[#102B20]">
              Recherche et filtres
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Retrouvez rapidement un dossier.
            </p>
          </div>

          <form
            method="GET"
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="q"
                className="mb-2 block text-sm font-medium text-slate-700"
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Statut
                </label>

                <select
                  id="status"
                  name="status"
                  defaultValue={
                    status
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
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
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Nationalité
                </label>

                <select
                  id="nationality"
                  name="nationality"
                  defaultValue={
                    nationality
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
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
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Durée
                </label>

                <select
                  id="duration"
                  name="duration"
                  defaultValue={
                    duration
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
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
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Responsable
                </label>

                <select
                  id="agent"
                  name="agent"
                  defaultValue={
                    agent
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
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
                <label htmlFor="source" className="mb-2 block text-sm font-medium text-slate-700">
                  Source
                </label>
                <select
                  id="source"
                  name="source"
                  defaultValue={source}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
                >
                  <option value="">Toutes les sources</option>
                  <option value="direct">Client direct</option>
                  <option value="partner">Partenaire</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="dateFrom"
                  className="mb-2 block text-sm font-medium text-slate-700"
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="dateTo"
                  className="mb-2 block text-sm font-medium text-slate-700"
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
                />
              </div>

              <div className="flex items-end gap-3">
                <button
                  type="submit"
                  className="min-h-12 rounded-xl bg-[#0B5D3B] px-6 font-black text-white transition hover:bg-[#084A2F]"
                >
                  Appliquer les filtres
                </button>

                <Link
                  href="/admin/dossiers"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-6 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Réinitialiser
                </Link>
              </div>
            </div>
          </form>
        </section>

        {errorMessage && (
          <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {
              errorMessage
            }
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 p-6">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                Résultats
              </h2>

              <p className="mt-1 text-sm text-slate-500">
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
            <div className="p-12 text-center">
              <p className="font-semibold text-slate-700">
                Aucun dossier trouvé
              </p>
            </div>
          ) : (
            <TableContainer className="rounded-none border-0 shadow-none">
              <Table className="min-w-[1880px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Matricule
                    </TableHead>

                    <TableHead>
                      Client
                    </TableHead>

                    <TableHead>
                      Source
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

                    <TableHead>
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
          )}

          {totalPages >
            1 && (
            <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
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

              <div className="flex flex-wrap items-center gap-2">
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