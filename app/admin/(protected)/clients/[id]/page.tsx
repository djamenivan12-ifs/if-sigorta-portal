import Link from "next/link";
import { notFound } from "next/navigation";

import ClientNotes from "@/components/admin/clients/ClientNotes";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type NamedRelation =
  | {
      name: string;
    }
  | Array<{
      name: string;
    }>
  | null;

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  father_name: string | null;
  birth_date: string | null;
  gender: string | null;
  nationality: string | null;
  whatsapp_country_code: string | null;
  whatsapp_number: string | null;
  street: string | null;
  building_number: string | null;
  apartment_number: string | null;

  province: NamedRelation;
  district: NamedRelation;
  neighborhood: NamedRelation;
};

type PaymentRelation =
  | {
      status: string | null;
      expected_amount: number | string | null;
      submitted_at: string | null;
      verified_at: string | null;
      rejection_reason: string | null;
    }
  | Array<{
      status: string | null;
      expected_amount: number | string | null;
      submitted_at: string | null;
      verified_at: string | null;
      rejection_reason: string | null;
    }>
  | null;

type RequestRow = {
  id: string;
  request_code: string;
  status: string;
  passport_number: string | null;
  kimlik_number: string | null;
  insurance_duration_years: number | null;
  calculated_price: number | string | null;
  assigned_agent_id: string | null;
  assigned_at: string | null;
  created_at: string;
  updated_at: string | null;
  payment: PaymentRelation;
};

type PolicyRow = {
  request_id: string;
  policy_year: number;
  uploaded_at: string | null;
};

type DocumentRow = {
  request_id: string;
  document_type: string;
  uploaded_at: string;
};

type ActivityRow = {
  id: string;
  request_id: string;
  action: string;
  description: string | null;
  user_id: string | null;
  created_at: string;
};

type RequestNoteRow = {
  id: string;
  request_id: string;
  content: string;
  user_id: string | null;
  created_at: string;
};

type ClientNoteRow = {
  id: string;
  client_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

type AgentInfo = {
  id: string;
  name: string;
  email: string;
};

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

const paymentStatusLabels: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "En attente",
    className:
      "bg-amber-50 text-amber-700",
  },

  submitted: {
    label: "Envoyé",
    className:
      "border border-[#DDE7D8] bg-[#F3F8F2] text-[#31513B]",
  },

  verified: {
    label: "Validé",
    className:
      "border border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]",
  },

  confirmed: {
    label: "Validé",
    className:
      "border border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]",
  },

  rejected: {
    label: "Refusé",
    className:
      "bg-red-50 text-red-700",
  },
};

const activityLabels: Record<
  string,
  string
> = {
  request_created:
    "Dossier créé",

  request_assigned:
    "Dossier attribué",

  request_claimed:
    "Dossier pris en charge",

  request_unassigned:
    "Attribution supprimée",

  payment_uploaded:
    "Paiement envoyé",

  payment_confirmed:
    "Paiement confirmé",

  payment_rejected:
    "Paiement refusé",

  policy_preparation_started:
    "Préparation de l’assurance commencée",

  policy_uploaded_year_1:
    "Police année 1 déposée",

  policy_uploaded_year_2:
    "Police année 2 déposée",

  policy_replaced_year_1:
    "Police année 1 remplacée",

  policy_replaced_year_2:
    "Police année 2 remplacée",

  policy_downloaded:
    "Police téléchargée",

  whatsapp_sent:
    "Notification WhatsApp envoyée",

  whatsapp_failed:
    "Échec de la notification WhatsApp",

  client_updated:
    "Informations client modifiées",

  note_added:
    "Note interne ajoutée",

  request_cancelled:
    "Dossier annulé",
};

function unwrapName(
  relation: NamedRelation,
) {
  if (
    Array.isArray(
      relation,
    )
  ) {
    return (
      relation[0]
        ?.name ??
      null
    );
  }

  return (
    relation?.name ??
    null
  );
}

function unwrapPayment(
  relation: PaymentRelation,
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

function formatSimpleDate(
  value:
    | string
    | null,
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
  ).format(date);
}

function formatMoney(
  value:
    | string
    | number
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

function getInitials({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const first =
    firstName
      .trim()
      .charAt(0);

  const last =
    lastName
      .trim()
      .charAt(0);

  return (
    `${first}${last}`
      .toUpperCase() ||
    "CL"
  );
}

function getActivityLabel(
  action: string,
) {
  return (
    activityLabels[
      action
    ] ??
    action.replaceAll(
      "_",
      " ",
    )
  );
}

function getActivityDot(
  action: string,
) {
  if (
    action ===
      "payment_rejected" ||
    action ===
      "request_cancelled" ||
    action ===
      "whatsapp_failed"
  ) {
    return "bg-red-500";
  }

  if (
    action ===
      "payment_confirmed" ||
    action ===
      "whatsapp_sent" ||
    action.startsWith(
      "policy_uploaded",
    ) ||
    action.startsWith(
      "policy_replaced",
    )
  ) {
    return "bg-[#0B5D3B]";
  }

  if (
    action ===
      "payment_uploaded"
  ) {
    return "bg-amber-500";
  }

  if (
    action ===
      "request_assigned" ||
    action ===
      "request_claimed" ||
    action ===
      "request_unassigned"
  ) {
    return "bg-[#7AA88A]";
  }

  if (
    action ===
      "policy_preparation_started"
  ) {
    return "bg-[#31513B]";
  }

  return "bg-slate-400";
}

async function getAuthUserName(
  serviceClient: ReturnType<
    typeof createServiceClient
  >,
  userId: string,
) {
  const {
    data,
    error,
  } =
    await serviceClient.auth.admin.getUserById(
      userId,
    );

  if (
    error ||
    !data.user
  ) {
    return "Utilisateur";
  }

  const user =
    data.user;

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

  return (
    `${firstName} ${lastName}`.trim() ||
    user.user_metadata
      ?.name
      ?.toString()
      .trim() ||
    user.email ||
    "Utilisateur"
  );
}

export default async function ClientDetailsPage({
  params,
}: PageProps) {
  const {
    user,
    role,
  } =
    await requireRole([
      "admin",
      "agent",
    ]);

  const {
    id,
  } =
    await params;

  const serviceClient =
    createServiceClient();

  /*
   * ============================
   * CLIENT
   * ============================
   */

  const {
    data: clientData,
    error: clientError,
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
          father_name,
          birth_date,
          gender,
          nationality,
          whatsapp_country_code,
          whatsapp_number,
          street,
          building_number,
          apartment_number,

          province:provinces (
            name
          ),

          district:districts (
            name
          ),

          neighborhood:neighborhoods (
            name
          )
        `,
      )
      .eq(
        "id",
        id,
      )
      .maybeSingle();

  if (
    clientError
  ) {
    throw new Error(
      clientError.message,
    );
  }

  if (!clientData) {
    notFound();
  }

  const client =
    clientData as unknown as ClientRow;

  /*
   * ============================
   * NOTES CLIENT
   * ============================
   */

  const {
    data: clientNotesData,
    error: clientNotesError,
  } =
    await serviceClient
      .from(
        "client_notes",
      )
      .select(
        `
          id,
          client_id,
          user_id,
          content,
          created_at,
          updated_at
        `,
      )
      .eq(
        "client_id",
        id,
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      );

  if (
    clientNotesError
  ) {
    throw new Error(
      clientNotesError.message,
    );
  }

  const clientNotes =
    (clientNotesData ??
      []) as ClientNoteRow[];

  /*
   * ============================
   * DOSSIERS DU CLIENT
   * ============================
   */

  const {
    data: requestsData,
    error: requestsError,
  } =
    await serviceClient
      .from(
        "insurance_requests",
      )
      .select(
        `
          id,
          request_code,
          status,
          passport_number,
          kimlik_number,
          insurance_duration_years,
          calculated_price,
          assigned_agent_id,
          assigned_at,
          created_at,
          updated_at,

          payment:payments (
            status,
            expected_amount,
            submitted_at,
            verified_at,
            rejection_reason
          )
        `,
      )
      .eq(
        "client_id",
        id,
      )
      .order(
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

  const allRequests =
    (requestsData ??
      []) as unknown as RequestRow[];

  /*
   * Agent :
   * - ses dossiers ;
   * - dossiers non attribués.
   *
   * Admin :
   * - tous les dossiers du client.
   */
  const requests =
    role === "admin"
      ? allRequests
      : allRequests.filter(
          (request) =>
            request.assigned_agent_id ===
              user.id ||
            request.assigned_agent_id ===
              null,
        );

  /*
   * Un agent ne peut pas ouvrir une fiche client
   * s'il n'a accès à aucun dossier de ce client.
   */
  if (
    role === "agent" &&
    requests.length === 0
  ) {
    notFound();
  }

  const requestIds =
    requests.map(
      (request) =>
        request.id,
    );

  /*
   * ============================
   * POLICES / DOCUMENTS
   * ============================
   */

  let policies:
    PolicyRow[] = [];

  let documents:
    DocumentRow[] = [];

  let activities:
    ActivityRow[] = [];

  let notes:
    RequestNoteRow[] = [];

  if (
    requestIds.length >
    0
  ) {
    const [
      policiesResult,
      documentsResult,
      activitiesResult,
      notesResult,
    ] =
      await Promise.all([
        serviceClient
          .from(
            "insurance_policies",
          )
          .select(
            `
              request_id,
              policy_year,
              uploaded_at
            `,
          )
          .in(
            "request_id",
            requestIds,
          )
          .order(
            "uploaded_at",
            {
              ascending:
                false,
            },
          ),

        serviceClient
          .from(
            "uploaded_documents",
          )
          .select(
            `
              request_id,
              document_type,
              uploaded_at
            `,
          )
          .in(
            "request_id",
            requestIds,
          )
          .order(
            "uploaded_at",
            {
              ascending:
                false,
            },
          ),

        serviceClient
          .from(
            "activity_logs",
          )
          .select(
            `
              id,
              request_id,
              action,
              description,
              user_id,
              created_at
            `,
          )
          .in(
            "request_id",
            requestIds,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          )
          .limit(
            100,
          ),

        serviceClient
          .from(
            "request_notes",
          )
          .select(
            `
              id,
              request_id,
              content,
              user_id,
              created_at
            `,
          )
          .in(
            "request_id",
            requestIds,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          )
          .limit(
            50,
          ),
      ]);

    if (
      policiesResult.error
    ) {
      throw new Error(
        policiesResult.error.message,
      );
    }

    if (
      documentsResult.error
    ) {
      throw new Error(
        documentsResult.error.message,
      );
    }

    if (
      activitiesResult.error
    ) {
      throw new Error(
        activitiesResult.error.message,
      );
    }

    if (
      notesResult.error
    ) {
      throw new Error(
        notesResult.error.message,
      );
    }

    policies =
      (policiesResult.data ??
        []) as PolicyRow[];

    documents =
      (documentsResult.data ??
        []) as DocumentRow[];

    activities =
      (activitiesResult.data ??
        []) as ActivityRow[];

    notes =
      (notesResult.data ??
        []) as RequestNoteRow[];
  }

  /*
   * ============================
   * AGENTS / AUTEURS
   * ============================
   */

  const userIds =
    Array.from(
      new Set(
        [
          ...requests.map(
            (request) =>
              request.assigned_agent_id,
          ),

          ...activities.map(
            (activity) =>
              activity.user_id,
          ),

          ...notes.map(
            (note) =>
              note.user_id,
          ),

          ...clientNotes.map(
            (note) =>
              note.user_id,
          ),
        ].filter(
          (
            value,
          ): value is string =>
            Boolean(
              value,
            ),
        ),
      ),
    );

  const userNames =
    new Map<
      string,
      string
    >();

  await Promise.all(
    userIds.map(
      async (
        userId,
      ) => {
        const name =
          await getAuthUserName(
            serviceClient,
            userId,
          );

        userNames.set(
          userId,
          name,
        );
      },
    ),
  );

  const agents:
    AgentInfo[] =
    Array.from(
      new Set(
        requests
          .map(
            (request) =>
              request.assigned_agent_id,
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
    ).map(
      (agentId) => ({
        id:
          agentId,

        name:
          userNames.get(
            agentId,
          ) ??
          "Agent",

        email:
          "",
      }),
    );

  /*
   * ============================
   * KPI
   * ============================
   */

  const totalRequests =
    requests.length;

  const activeStatuses =
    new Set([
      "waiting_payment",
      "payment_review",
      "payment_confirmed",
      "policy_preparation",
    ]);

  const activeCount =
    requests.filter(
      (request) =>
        activeStatuses.has(
          request.status,
        ),
    ).length;

  const availablePoliciesCount =
    requests.filter(
      (request) =>
        request.status ===
        "policy_available",
    ).length;

  const totalAmount =
    requests.reduce(
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

  const verifiedPayments =
    requests.filter(
      (request) => {
        const payment =
          unwrapPayment(
            request.payment,
          );

        return (
          payment?.status ===
            "verified" ||
          payment?.status ===
            "confirmed" ||
          Boolean(
            payment?.verified_at,
          )
        );
      },
    ).length;

  const policyYearsCount =
    policies.length;

  const latestRequest =
    requests[0] ??
    null;

  /*
   * ============================
   * IDENTITÉ / CONTACT
   * ============================
   */

  const clientName =
    `${client.first_name} ${client.last_name}`.trim();

  const whatsapp =
    `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`.trim();

  const province =
    unwrapName(
      client.province,
    );

  const district =
    unwrapName(
      client.district,
    );

  const neighborhood =
    unwrapName(
      client.neighborhood,
    );

  const address =
    [
      neighborhood,
      client.street,
      client.building_number
        ? `Bina No: ${client.building_number}`
        : null,
      client.apartment_number
        ? `Daire No: ${client.apartment_number}`
        : null,
      district,
      province,
    ]
      .filter(
        Boolean,
      )
      .join(
        ", ",
      ) ||
    "—";

  /*
   * ============================
   * HISTORIQUE / NOTES
   * ============================
   */

  const recentActivities =
    activities.slice(
      0,
      20,
    );

  const recentNotes =
    notes.slice(
      0,
      10,
    );

  const formattedClientNotes =
    clientNotes.map(
      (note) => ({
        id:
          note.id,

        content:
          note.content,

        createdAt:
          formatDate(
            note.created_at,
          ),

        authorName:
          note.user_id
            ? userNames.get(
                note.user_id,
              ) ??
              "Utilisateur"
            : "Système",

        userId:
          note.user_id,
      }),
    );

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        {/* Navigation */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/clients"
            className="font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline"
          >
            ← Retour aux clients
          </Link>

          {latestRequest && (
            <Link
              href={`/admin/dossiers/${latestRequest.id}`}
              className="font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline"
            >
              Dernier dossier →
            </Link>
          )}
        </div>

        {/* En-tête client */}

        <header className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0B5D3B] text-xl font-black text-white">
                  {getInitials({
                    firstName:
                      client.first_name,
                    lastName:
                      client.last_name,
                  })}
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                    Fiche client
                  </p>

                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-4xl">
                    {clientName}
                  </h1>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span>
                      {client.nationality ??
                        "Nationalité non renseignée"}
                    </span>

                    {whatsapp && (
                      <span>
                        WhatsApp :{" "}
                        <strong className="text-slate-700">
                          {whatsapp}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-5 text-sm font-bold text-[#0B5D3B] transition hover:bg-[#EAF4E8]"
                  >
                    Ouvrir WhatsApp
                  </a>
                )}

                <Link
                  href="/demande/etape-1"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#B8E83D] px-5 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E]"
                >
                  Nouvelle demande
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* KPI */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Dossiers"
            value={
              totalRequests.toLocaleString(
                "fr-FR",
              )
            }
            description="Dossiers visibles"
            className="bg-[#F3F8F2] text-[#0B5D3B]"
          />

          <StatCard
            label="En cours"
            value={
              activeCount.toLocaleString(
                "fr-FR",
              )
            }
            description="Dossiers actifs"
            className="border border-[#DDE7D8] bg-[#F3F8F2] text-[#31513B]"
          />

          <StatCard
            label="Assurances disponibles"
            value={
              availablePoliciesCount.toLocaleString(
                "fr-FR",
              )
            }
            description={`${policyYearsCount} police(s) déposée(s)`}
            className="border border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]"
          />

          <StatCard
            label="Paiements validés"
            value={
              verifiedPayments.toLocaleString(
                "fr-FR",
              )
            }
            description="Paiements confirmés"
            className="border border-[#CFE3CF] bg-[#EEF6EC] text-[#0B5D3B]"
          />

          <StatCard
            label="Valeur dossiers"
            value={
              formatMoney(
                totalAmount,
              )
            }
            description="Montant cumulé"
            className="bg-[#F1F6EA] text-[#49613E]"
          />
        </section>

        <div className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          {/* Colonne gauche */}

          <aside className="space-y-5">
            {/* Identité */}

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[#102B20]">
                Identité
              </h2>

              <div className="mt-5 space-y-4">
                <InfoRow
                  label="Nom"
                  value={
                    client.last_name
                  }
                />

                <InfoRow
                  label="Prénom"
                  value={
                    client.first_name
                  }
                />

                <InfoRow
                  label="Nom du père"
                  value={
                    client.father_name ??
                    "—"
                  }
                />

                <InfoRow
                  label="Naissance"
                  value={
                    formatSimpleDate(
                      client.birth_date,
                    )
                  }
                />

                <InfoRow
                  label="Sexe"
                  value={
                    client.gender ===
                    "male"
                      ? "Homme"
                      : client.gender ===
                          "female"
                        ? "Femme"
                        : client.gender ??
                          "—"
                  }
                />

                <InfoRow
                  label="Nationalité"
                  value={
                    client.nationality ??
                    "—"
                  }
                />
              </div>
            </section>

            {/* Contact */}

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[#102B20]">
                Contact & adresse
              </h2>

              <div className="mt-5 space-y-4">
                <InfoRow
                  label="WhatsApp"
                  value={
                    whatsapp ||
                    "—"
                  }
                />

                <InfoRow
                  label="Adresse"
                  value={
                    address
                  }
                />
              </div>
            </section>

            {/* Responsables */}

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[#102B20]">
                Agents associés
              </h2>

              {agents.length ===
              0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  Aucun agent n’est actuellement associé aux dossiers visibles.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {agents.map(
                    (agent) => (
                      <div
                        key={
                          agent.id
                        }
                        className="rounded-xl border border-slate-100 bg-[#FAFCFA] px-4 py-3"
                      >
                        <p className="font-semibold text-slate-800">
                          {agent.name}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>
          </aside>

          {/* Colonne principale */}

          <div className="space-y-5">
            {/* Dossiers */}

            <section className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                    Dossiers du client
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Historique des demandes accessibles avec votre rôle.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {requests.length} dossier
                  {requests.length !==
                  1
                    ? "s"
                    : ""}
                </span>
              </div>

              {requests.length ===
              0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  Aucun dossier visible.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <TableHeader>
                          Dossier
                        </TableHeader>

                        <TableHeader>
                          Statut
                        </TableHeader>

                        <TableHeader>
                          Responsable
                        </TableHeader>

                        <TableHeader>
                          Montant
                        </TableHeader>

                        <TableHeader>
                          Paiement
                        </TableHeader>

                        <TableHeader>
                          Polices
                        </TableHeader>

                        <TableHeader>
                          Créé
                        </TableHeader>

                        <TableHeader>
                          Action
                        </TableHeader>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {requests.map(
                        (
                          request,
                        ) => {
                          const status =
                            statusLabels[
                              request.status
                            ] ?? {
                              label:
                                request.status,
                              className:
                                "bg-slate-100 text-slate-700",
                            };

                          const payment =
                            unwrapPayment(
                              request.payment,
                            );

                          const paymentInfo =
                            payment?.status
                              ? paymentStatusLabels[
                                  payment.status
                                ] ?? {
                                  label:
                                    payment.status,
                                  className:
                                    "bg-slate-100 text-slate-700",
                                }
                              : null;

                          const requestPolicies =
                            policies.filter(
                              (policy) =>
                                policy.request_id ===
                                request.id,
                            );

                          return (
                            <tr
                              key={
                                request.id
                              }
                              className="transition hover:bg-slate-50"
                            >
                              <TableCell>
                                <div>
                                  <p className="font-black text-[#0B5D3B]">
                                    {
                                      request.request_code
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {request.insurance_duration_years ??
                                      1}{" "}
                                    an
                                    {(request.insurance_duration_years ??
                                      1) >
                                    1
                                      ? "s"
                                      : ""}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell>
                                <span
                                  className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                                >
                                  {
                                    status.label
                                  }
                                </span>
                              </TableCell>

                              <TableCell>
                                {request.assigned_agent_id ? (
                                  <span className="text-sm font-medium text-slate-700">
                                    {userNames.get(
                                      request.assigned_agent_id,
                                    ) ??
                                      "Agent"}
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                    Non attribué
                                  </span>
                                )}
                              </TableCell>

                              <TableCell>
                                {formatMoney(
                                  request.calculated_price,
                                )}
                              </TableCell>

                              <TableCell>
                                {paymentInfo ? (
                                  <span
                                    className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${paymentInfo.className}`}
                                  >
                                    {
                                      paymentInfo.label
                                    }
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </TableCell>

                              <TableCell>
                                <span className="font-semibold text-slate-700">
                                  {
                                    requestPolicies.length
                                  }
                                </span>
                              </TableCell>

                              <TableCell>
                                {formatDate(
                                  request.created_at,
                                )}
                              </TableCell>

                              <TableCell>
                                <Link
                                  href={`/admin/dossiers/${request.id}`}
                                  className="font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline"
                                >
                                  Ouvrir
                                </Link>
                              </TableCell>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Paiements */}

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                Paiements
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Situation des paiements associés aux dossiers visibles.
              </p>

              <div className="mt-5 space-y-3">
                {requests.map(
                  (
                    request,
                  ) => {
                    const payment =
                      unwrapPayment(
                        request.payment,
                      );

                    if (!payment) {
                      return null;
                    }

                    const paymentInfo =
                      payment.status
                        ? paymentStatusLabels[
                            payment.status
                          ] ?? {
                            label:
                              payment.status,
                            className:
                              "bg-slate-100 text-slate-700",
                          }
                        : {
                            label:
                              "Inconnu",
                            className:
                              "bg-slate-100 text-slate-700",
                          };

                    return (
                      <div
                        key={
                          request.id
                        }
                        className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-[#FAFCFA] p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <Link
                            href={`/admin/dossiers/${request.id}`}
                            className="font-black text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline"
                          >
                            {
                              request.request_code
                            }
                          </Link>

                          <p className="mt-1 text-sm text-slate-500">
                            Montant attendu :{" "}
                            <strong className="text-slate-700">
                              {formatMoney(
                                payment.expected_amount,
                              )}
                            </strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentInfo.className}`}
                          >
                            {
                              paymentInfo.label
                            }
                          </span>

                          <span className="text-xs text-slate-400">
                            {formatDate(
                              payment.verified_at ??
                                payment.submitted_at,
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </section>

            {/* Documents */}

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                    Documents
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Vue globale des documents liés aux dossiers accessibles.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {
                    documents.length
                  }
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <DocumentCounter
                  label="Passeports"
                  value={
                    documents.filter(
                      (document) =>
                        document.document_type ===
                        "passport",
                    ).length
                  }
                />

                <DocumentCounter
                  label="Kimlik"
                  value={
                    documents.filter(
                      (document) =>
                        document.document_type ===
                          "kimlik_front" ||
                        document.document_type ===
                          "kimlik_back",
                    ).length
                  }
                />

                <DocumentCounter
                  label="Dekonts"
                  value={
                    documents.filter(
                      (document) =>
                        document.document_type ===
                        "payment_receipt",
                    ).length
                  }
                />

                <DocumentCounter
                  label="Polices"
                  value={
                    policies.length
                  }
                />
              </div>

              <p className="mt-4 text-xs text-slate-400">
                Ouvrez un dossier pour consulter ou télécharger ses documents.
              </p>
            </section>

            {/* Notes générales du client */}

            <ClientNotes
              clientId={
                client.id
              }
              notes={
                formattedClientNotes
              }
              currentUserId={
                user.id
              }
              role={
                role
              }
            />

            {/* Notes internes agrégées */}

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                Notes internes
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Dernières notes enregistrées dans les dossiers de ce client.
              </p>

              {recentNotes.length ===
              0 ? (
                <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                  Aucune note interne.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {recentNotes.map(
                    (
                      note,
                    ) => {
                      const request =
                        requests.find(
                          (
                            item,
                          ) =>
                            item.id ===
                            note.request_id,
                        );

                      return (
                        <div
                          key={
                            note.id
                          }
                          className="rounded-2xl border border-slate-100 bg-[#FAFCFA] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-black text-[#0B5D3B]">
                              {request?.request_code ??
                                "Dossier"}
                            </p>

                            <p className="text-xs text-slate-400">
                              {formatDate(
                                note.created_at,
                              )}
                            </p>
                          </div>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {
                              note.content
                            }
                          </p>

                          <p className="mt-2 text-xs text-slate-400">
                            Par{" "}
                            {note.user_id
                              ? userNames.get(
                                  note.user_id,
                                ) ??
                                "Utilisateur"
                              : "Système"}
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </section>

            {/* Historique global */}

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                Historique récent
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Dernières actions enregistrées sur les dossiers du client.
              </p>

              {recentActivities.length ===
              0 ? (
                <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                  Aucun historique disponible.
                </div>
              ) : (
                <div className="mt-6 space-y-0">
                  {recentActivities.map(
                    (
                      activity,
                      index,
                    ) => {
                      const request =
                        requests.find(
                          (
                            item,
                          ) =>
                            item.id ===
                            activity.request_id,
                        );

                      return (
                        <div
                          key={
                            activity.id
                          }
                          className="relative flex gap-4 pb-6"
                        >
                          {index <
                            recentActivities.length -
                              1 && (
                            <div className="absolute left-[7px] top-5 h-[calc(100%-4px)] w-px bg-slate-200" />
                          )}

                          <div
                            className={`relative z-10 mt-1.5 h-4 w-4 shrink-0 rounded-full ring-4 ring-white ${getActivityDot(
                              activity.action,
                            )}`}
                          />

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-800">
                                {getActivityLabel(
                                  activity.action,
                                )}
                              </p>

                              {request && (
                                <Link
                                  href={`/admin/dossiers/${request.id}`}
                                  className="text-xs font-black text-[#0B5D3B] transition hover:text-[#084A2F] hover:underline"
                                >
                                  {
                                    request.request_code
                                  }
                                </Link>
                              )}
                            </div>

                            {activity.description && (
                              <p className="mt-1 text-sm leading-6 text-slate-500">
                                {
                                  activity.description
                                }
                              </p>
                            )}

                            <p className="mt-2 text-xs text-slate-400">
                              {activity.user_id
                                ? userNames.get(
                                    activity.user_id,
                                  ) ??
                                  "Utilisateur"
                                : "Système"}
                              {" · "}
                              {formatDate(
                                activity.created_at,
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
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
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}
      >
        {
          label
        }
      </span>

      <p className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#102B20]">
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {
          label
        }
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {
          value
        }
      </p>
    </div>
  );
}

function DocumentCounter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-[#FAFCFA] p-4">
      <p className="text-2xl font-semibold tracking-[-0.03em] text-[#102B20]">
        {value.toLocaleString(
          "fr-FR",
        )}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {
          label
        }
      </p>
    </div>
  );
}

type TableContentProps = {
  children:
    React.ReactNode;
};

function TableHeader({
  children,
}: TableContentProps) {
  return (
    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {
        children
      }
    </th>
  );
}

function TableCell({
  children,
}: TableContentProps) {
  return (
    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
      {
        children
      }
    </td>
  );
}