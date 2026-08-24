import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

import AssignAgent from "@/components/admin/requests/AssignAgent";

import NotesSection from "./NotesSection";
import PolicyUploader from "./PolicyUploader";
import RequestActions from "./RequestActions";

const BUCKET_NAME = "insurance-documents";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type DocumentRow = {
  id: string;
  document_type: string;
  original_file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number | null;
  uploaded_at: string;
};

type PolicyRow = {
  policy_year: number;
};

type ActivityLogRow = {
  id: string;
  action: string;
  description: string | null;
  user_id: string | null;
  created_at: string;
};

type ActivityLogWithAuthor =
  ActivityLogRow & {
    author: string;
  };

type RequestNoteRow = {
  id: string;
  content: string;
  user_id: string | null;
  created_at: string;
};

type NoteWithAuthor = {
  id: string;
  content: string;
  created_at: string;
  author: string;
};

const documentLabels: Record<
  string,
  string
> = {
  passport: "Passeport",
  kimlik_front: "Kimlik recto",
  kimlik_back: "Kimlik verso",
  payment_receipt: "Dekont",
  insurance_policy: "Police d’assurance",
  insurance_policy_year_1:
    "Police d’assurance — Année 1",
  insurance_policy_year_2:
    "Police d’assurance — Année 2",
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

function formatDate(
  value: string | null,
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
      dateStyle: "long",
      timeStyle: "short",
    },
  ).format(date);
}

function formatSimpleDate(
  value: string | null,
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
      dateStyle: "long",
    },
  ).format(date);
}

function formatFileSize(
  value: number | null,
) {
  if (!value) {
    return "—";
  }

  if (
    value <
    1024 * 1024
  ) {
    return `${Math.round(
      value / 1024,
    )} Ko`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(2)} Mo`;
}

function getActivityLabel(
  action: string,
) {
  const labels: Record<
    string,
    string
  > = {
    request_created:
      "Dossier créé",

    payment_uploaded:
      "Paiement envoyé",

    payment_confirmed:
      "Paiement confirmé",

    payment_rejected:
      "Paiement refusé",

    policy_preparation_started:
      "Préparation de l’assurance commencée",

    request_cancelled:
      "Dossier annulé",

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
      "Informations du client modifiées",

    note_added:
      "Note interne ajoutée",

    request_assigned:
      "Dossier attribué",

    request_unassigned:
      "Attribution supprimée",
  };

  return (
    labels[action] ??
    action.replaceAll(
      "_",
      " ",
    )
  );
}

function getActivityDotClassName(
  action: string,
) {
  if (
    action === "payment_rejected" ||
    action === "request_cancelled" ||
    action === "whatsapp_failed"
  ) {
    return "bg-red-500";
  }

  if (
    action === "payment_confirmed" ||
    action === "whatsapp_sent" ||
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
    "policy_preparation_started"
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
    "note_added"
  ) {
    return "bg-[#31513B]";
  }

  if (
    action ===
      "request_assigned" ||
    action ===
      "request_unassigned"
  ) {
    return "bg-[#7AA88A]";
  }

  return "bg-slate-500";
}

async function getUserDisplayName(
  serviceClient: ReturnType<
    typeof createServiceClient
  >,
  userId: string,
): Promise<string> {
  const {
    data,
    error,
  } =
    await serviceClient.auth.admin.getUserById(
      userId,
    );

  if (
    error ||
    !data?.user
  ) {
    return "Utilisateur";
  }

  const user =
    data.user;

  const firstName =
    user.user_metadata
      ?.first_name
      ?.toString()
      .trim() ?? "";

  const lastName =
    user.user_metadata
      ?.last_name
      ?.toString()
      .trim() ?? "";

  const fullName =
    `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  const name =
    user.user_metadata
      ?.name
      ?.toString()
      .trim();

  if (name) {
    return name;
  }

  return (
    user.email ??
    "Utilisateur"
  );
}

export default async function DossierPage({
  params,
}: PageProps) {
  const { user } =
    await requireRole([
      "agent",
      "admin",
    ]);

  const { id } =
    await params;

  const serviceClient =
    createServiceClient();

  const {
    data: insuranceRequest,
    error: requestError,
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
          has_kimlik,
          kimlik_number,
          kimlik_expiration_date,
          insurance_start_date,
          passport_number,
          insurance_duration_years,
          policy_start_date,
          policy_end_date,
          calculated_age,
          calculated_price,
          assigned_agent_id,
          assigned_at,
          created_at,
          updated_at,

          client:clients (
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
          ),

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
        "id",
        id,
      )
      .maybeSingle();

  if (requestError) {
    throw new Error(
      requestError.message,
    );
  }

  if (!insuranceRequest) {
    notFound();
  }

  /*
   * Liste des agents disponibles
   * pour l’attribution du dossier.
   */
  const {
    data: usersData,
    error: usersError,
  } =
    await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });

  if (usersError) {
    throw new Error(
      usersError.message,
    );
  }

  const agents =
    usersData.users
      .filter((authUser) => {
        const role =
          authUser.app_metadata?.role;

        return (
          role === "agent" ||
          role === "admin"
        );
      })
      .map((authUser) => {
        const firstName =
          authUser.user_metadata
            ?.first_name
            ?.toString()
            .trim() ?? "";

        const lastName =
          authUser.user_metadata
            ?.last_name
            ?.toString()
            .trim() ?? "";

        const fullName =
          `${firstName} ${lastName}`.trim();

        const role =
          authUser.app_metadata?.role ===
          "admin"
            ? ("admin" as const)
            : ("agent" as const);

        return {
          id: authUser.id,
          name:
            fullName ||
            authUser.email ||
            "Agent",
          email:
            authUser.email ?? "",
          role,
        };
      })
      .sort((first, second) =>
        first.name.localeCompare(
          second.name,
          "fr-FR",
        ),
      );

  const canAssign =
    user.app_metadata?.role ===
    "admin";

  const {
    data: documentsData,
    error: documentsError,
  } =
    await serviceClient
      .from(
        "uploaded_documents",
      )
      .select(
        `
          id,
          document_type,
          original_file_name,
          storage_path,
          mime_type,
          file_size,
          uploaded_at
        `,
      )
      .eq(
        "request_id",
        id,
      )
      .order(
        "uploaded_at",
        {
          ascending: true,
        },
      );

  if (
    documentsError
  ) {
    throw new Error(
      documentsError.message,
    );
  }

  const documents =
    (documentsData ??
      []) as DocumentRow[];

  const {
    data: policiesData,
    error: policiesError,
  } =
    await serviceClient
      .from(
        "insurance_policies",
      )
      .select(
        "policy_year",
      )
      .eq(
        "request_id",
        id,
      )
      .order(
        "policy_year",
        {
          ascending: true,
        },
      );

  if (
    policiesError
  ) {
    throw new Error(
      policiesError.message,
    );
  }

  const existingPolicyYears =
    Array.from(
      new Set(
        (
          (policiesData ??
            []) as PolicyRow[]
        )
          .map(
            (policy) =>
              Number(
                policy.policy_year,
              ),
          )
          .filter(
            (
              policyYear,
            ) =>
              policyYear ===
                1 ||
              policyYear ===
                2,
          ),
      ),
    );

  const {
    data:
      activityLogsData,
    error:
      activityLogsError,
  } =
    await serviceClient
      .from(
        "activity_logs",
      )
      .select(
        `
          id,
          action,
          description,
          user_id,
          created_at
        `,
      )
      .eq(
        "request_id",
        id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (
    activityLogsError
  ) {
    throw new Error(
      activityLogsError.message,
    );
  }

  const activityLogs =
    (activityLogsData ??
      []) as ActivityLogRow[];

  const {
    data:
      requestNotesData,
    error:
      requestNotesError,
  } =
    await serviceClient
      .from(
        "request_notes",
      )
      .select(
        `
          id,
          content,
          user_id,
          created_at
        `,
      )
      .eq(
        "request_id",
        id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (
    requestNotesError
  ) {
    throw new Error(
      requestNotesError.message,
    );
  }

  const requestNotes =
    (requestNotesData ??
      []) as RequestNoteRow[];

  /*
   * Utilisateurs des notes + historique
   */
  const allUserIds =
    Array.from(
      new Set(
        [
          ...requestNotes.map(
            (note) =>
              note.user_id,
          ),

          ...activityLogs.map(
            (activity) =>
              activity.user_id,
          ),
        ].filter(
          (
            userId,
          ): userId is string =>
            Boolean(
              userId,
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
    allUserIds.map(
      async (
        userId,
      ) => {
        const displayName =
          await getUserDisplayName(
            serviceClient,
            userId,
          );

        userNames.set(
          userId,
          displayName,
        );
      },
    ),
  );

  const notesWithAuthors:
    NoteWithAuthor[] =
    requestNotes.map(
      (note) => ({
        id:
          note.id,

        content:
          note.content,

        created_at:
          note.created_at,

        author:
          note.user_id
            ? userNames.get(
                note.user_id,
              ) ??
              "Utilisateur"
            : "Système",
      }),
    );

 const activitiesWithAuthors:
  ActivityLogWithAuthor[] =
  activityLogs.map(
    (activity) => ({
      ...activity,

      author:
        activity.user_id
          ? userNames.get(
              activity.user_id,
            ) ??
            "Utilisateur"
          : activity.action ===
                "request_created" ||
              activity.action ===
                "payment_uploaded" ||
              activity.action ===
                "policy_downloaded"
            ? "Client"
            : "Système",
    }),
  );

  const documentsWithUrls =
    await Promise.all(
      documents.map(
        async (
          document,
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
                document.storage_path,
                60 * 10,
              );

          return {
            ...document,

            signedUrl:
              error ||
              !data
                ? null
                : data.signedUrl,
          };
        },
      ),
    );

  const client =
    Array.isArray(
      insuranceRequest.client,
    )
      ? insuranceRequest
          .client[0]
      : insuranceRequest.client;

  const payment =
    Array.isArray(
      insuranceRequest.payment,
    )
      ? insuranceRequest
          .payment[0]
      : insuranceRequest.payment;

  const status =
    statusLabels[
      insuranceRequest.status
    ] ?? {
      label:
        insuranceRequest.status,

      className:
        "bg-slate-100 text-slate-700",
    };

  const province =
    Array.isArray(
      client?.province,
    )
      ? client
          .province[0]
      : client?.province;

  const district =
    Array.isArray(
      client?.district,
    )
      ? client
          .district[0]
      : client?.district;

  const neighborhood =
    Array.isArray(
      client?.neighborhood,
    )
      ? client
          .neighborhood[0]
      : client?.neighborhood;

  const address =
    client
      ? [
          neighborhood?.name,

          client.street,

          client
            .building_number
            ? `Bina No: ${client.building_number}`
            : null,

          client
            .apartment_number
            ? `Daire No: ${client.apartment_number}`
            : null,

          district?.name,

          province?.name,
        ]
          .filter(
            Boolean,
          )
          .join(", ")
      : "—";

  const insuranceDurationYears:
    | 1
    | 2 =
    insuranceRequest
      .insurance_duration_years ===
    2
      ? 2
      : 1;

  const hasKimlik =
    insuranceRequest.has_kimlik !==
    false;

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/dossiers"
            className="text-sm font-semibold text-[#0B5D3B] transition hover:text-[#084A2F]"
          >
            ← Retour aux dossiers
          </Link>

          <Link
            href="/admin/tableau-de-bord"
            className="text-sm font-semibold text-[#0B5D3B] transition hover:text-[#084A2F]"
          >
            Tableau de bord
          </Link>
        </div>

        <header className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                Dossier d’assurance
              </p>

              <h1 className="mt-3 break-all text-3xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-4xl">
                {
                  insuranceRequest.request_code
                }
              </h1>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                Créé le{" "}
                {formatDate(
                  insuranceRequest.created_at,
                )}
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${status.className}`}
            >
              {
                status.label
              }
            </span>
          </div>
        </header>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                Informations du client
              </h2>

              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <Information
                  label="Nom"
                  value={
                    client?.last_name
                  }
                />

                <Information
                  label="Prénom"
                  value={
                    client?.first_name
                  }
                />

                <Information
                  label="Nom du père"
                  value={
                    client?.father_name
                  }
                />

                <Information
                  label="Date de naissance"
                  value={
                    client?.birth_date
                  }
                />

                <Information
                  label="Sexe"
                  value={
                    client?.gender ===
                    "male"
                      ? "Homme"
                      : client?.gender ===
                          "female"
                        ? "Femme"
                        : client?.gender
                  }
                />

                <Information
                  label="Nationalité"
                  value={
                    client?.nationality
                  }
                />

                <Information
                  label="WhatsApp"
                  value={
                    client
                      ? `${client.whatsapp_country_code}${client.whatsapp_number}`
                      : "—"
                  }
                />
              </dl>

              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="text-sm text-slate-500">
                  Adresse
                </p>

                <p className="mt-1 font-semibold leading-7 text-[#102B20]">
                  {address ||
                    "—"}
                </p>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                Identité et assurance
              </h2>

              <div
                className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${
                  hasKimlik
                    ? "border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]"
                    : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                {hasKimlik
                  ? "Le client possède déjà un Kimlik."
                  : "Le client effectue sa première demande de Kimlik."}
              </div>

              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                {hasKimlik ? (
                  <>
                    <Information
                      label="Numéro de Kimlik"
                      value={
                        insuranceRequest.kimlik_number
                      }
                    />

                    <Information
                      label="Expiration du Kimlik"
                      value={formatSimpleDate(
                        insuranceRequest.kimlik_expiration_date,
                      )}
                    />
                  </>
                ) : (
                  <Information
                    label="Date souhaitée de début"
                    value={formatSimpleDate(
                      insuranceRequest.insurance_start_date,
                    )}
                  />
                )}

                <Information
                  label="Numéro du passeport"
                  value={
                    insuranceRequest.passport_number
                  }
                />

                <Information
                  label="Âge retenu"
                  value={`${insuranceRequest.calculated_age} ans`}
                />

                <Information
                  label="Durée"
                  value={`${insuranceDurationYears} an${
                    insuranceDurationYears ===
                    2
                      ? "s"
                      : ""
                  }`}
                />

                <Information
                  label="Prix"
                  value={`${Number(
                    insuranceRequest.calculated_price,
                  ).toLocaleString(
                    "fr-FR",
                  )} TL`}
                />
              </dl>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                Documents
              </h2>

              <div className="mt-6 space-y-3">
                {documentsWithUrls.length ===
                0 ? (
                  <p className="text-slate-500">
                    Aucun document disponible.
                  </p>
                ) : (
                  documentsWithUrls.map(
                    (
                      document,
                    ) => (
                      <article
                        key={
                          document.id
                        }
                        className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {documentLabels[
                              document.document_type
                            ] ??
                              document.document_type}
                          </p>

                          <p className="mt-1 truncate text-sm text-slate-600">
                            {
                              document.original_file_name
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatFileSize(
                              document.file_size,
                            )}
                          </p>
                        </div>

                        {document.signedUrl ? (
                          <a
                            href={
                              document.signedUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-4 py-2 text-center text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#EAF4E8]"
                          >
                            Ouvrir
                          </a>
                        ) : (
                          <span className="text-sm text-red-600">
                            Lien indisponible
                          </span>
                        )}
                      </article>
                    ),
                  )
                )}
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Les liens sont temporaires et expirent après dix minutes.
              </p>
            </section>

            <NotesSection
              requestId={
                insuranceRequest.id
              }
              notes={
                notesWithAuthors
              }
            />
          </div>

          <aside className="space-y-5">
            <AssignAgent
              requestId={
                insuranceRequest.id
              }
              currentAgentId={
                insuranceRequest.assigned_agent_id ??
                null
              }
              agents={agents}
              canAssign={
                canAssign
              }
            />

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                Paiement
              </h2>

              <dl className="mt-6 space-y-5">
                <Information
                  label="Statut"
                  value={
                    payment?.status
                  }
                />

                <Information
                  label="Montant attendu"
                  value={
                    payment
                      ? `${Number(
                          payment.expected_amount,
                        ).toLocaleString(
                          "fr-FR",
                        )} TL`
                      : "—"
                  }
                />

                <Information
                  label="Soumis le"
                  value={formatDate(
                    payment?.submitted_at ??
                      null,
                  )}
                />

                <Information
                  label="Vérifié le"
                  value={formatDate(
                    payment?.verified_at ??
                      null,
                  )}
                />
              </dl>

              {payment?.rejection_reason && (
                <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  Motif du refus :{" "}
                  {
                    payment.rejection_reason
                  }
                </div>
              )}
            </section>

            <RequestActions
              requestId={
                insuranceRequest.id
              }
              currentStatus={
                insuranceRequest.status
              }
            />

            {(
              insuranceRequest.status ===
                "policy_preparation" ||
              insuranceRequest.status ===
                "policy_available"
            ) && (
              <PolicyUploader
                requestId={
                  insuranceRequest.id
                }
                insuranceDurationYears={
                  insuranceDurationYears
                }
                existingPolicyYears={
                  existingPolicyYears
                }
                hasKimlik={
                  hasKimlik
                }
                kimlikExpirationDate={
                  insuranceRequest.kimlik_expiration_date ??
                  null
                }
                requestedStartDate={
                  insuranceRequest.insurance_start_date ??
                  null
                }
                policyStartDate={
                  insuranceRequest.policy_start_date ??
                  null
                }
                policyEndDate={
                  insuranceRequest.policy_end_date ??
                  null
                }
              />
            )}

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[#102B20]">
                Polices enregistrées
              </h2>

              {existingPolicyYears.length >
              0 ? (
                <div className="mt-4 space-y-2">
                  {existingPolicyYears.map(
                    (
                      policyYear,
                    ) => (
                      <div
                        key={
                          policyYear
                        }
                        className="rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-4 py-3 text-sm font-semibold text-[#0B5D3B]"
                      >
                        ✓ Police année{" "}
                        {
                          policyYear
                        }
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Aucune police n’est encore enregistrée.
                </p>
              )}
            </section>

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#102B20]">
                  Historique
                </h2>

                {activitiesWithAuthors.length >
                  0 && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {
                      activitiesWithAuthors.length
                    }
                  </span>
                )}
              </div>

              {activitiesWithAuthors.length ===
              0 ? (
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Aucune activité n’est encore enregistrée pour ce dossier.
                </p>
              ) : (
                <div className="mt-6">
                  {activitiesWithAuthors.map(
                    (
                      activity,
                      index,
                    ) => {
                      const isLast =
                        index ===
                        activitiesWithAuthors.length -
                          1;

                      return (
                        <div
                          key={
                            activity.id
                          }
                          className="relative flex gap-4"
                        >
                          <div className="flex w-4 shrink-0 flex-col items-center">
                            <span
                              className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ring-4 ring-white ${getActivityDotClassName(
                                activity.action,
                              )}`}
                            />

                            {!isLast && (
                              <div className="min-h-16 w-px flex-1 bg-slate-200" />
                            )}
                          </div>

                          <div
                            className={`min-w-0 flex-1 ${
                              !isLast
                                ? "pb-6"
                                : ""
                            }`}
                          >
                            <p className="text-sm font-semibold text-slate-900">
                              {getActivityLabel(
                                activity.action,
                              )}
                            </p>

                            {activity.description && (
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {
                                  activity.description
                                }
                              </p>
                            )}

                            <p className="mt-2 text-xs font-semibold text-slate-500">
                              {
                                activity.author
                              }
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-400">
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

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[#102B20]">
                Dernière mise à jour
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {formatDate(
                  insuranceRequest.updated_at,
                )}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

type InformationProps = {
  label: string;
  value?:
    | string
    | number
    | null;
};

function Information({
  label,
  value,
}: InformationProps) {
  return (
    <div>
      <dt className="text-sm text-slate-500">
        {label}
      </dt>

      <dd className="mt-1 break-words font-semibold text-[#102B20]">
        {value === null ||
        value === undefined ||
        value === ""
          ? "—"
          : value}
      </dd>
    </div>
  );
}