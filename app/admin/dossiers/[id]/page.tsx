import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

const documentLabels: Record<string, string> = {
  passport: "Passeport",
  kimlik_front: "Kimlik recto",
  kimlik_back: "Kimlik verso",
  payment_receipt: "Dekont",
  insurance_policy: "Police d’assurance",
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
    className: "bg-slate-100 text-slate-700",
  },

  waiting_payment: {
    label: "Paiement attendu",
    className: "bg-amber-100 text-amber-800",
  },

  payment_review: {
    label: "Paiement à vérifier",
    className: "bg-orange-100 text-orange-800",
  },

  payment_confirmed: {
    label: "Paiement confirmé",
    className: "bg-green-100 text-green-800",
  },

  policy_preparation: {
    label: "Assurance en préparation",
    className: "bg-blue-100 text-blue-800",
  },

  policy_available: {
    label: "Assurance disponible",
    className: "bg-emerald-100 text-emerald-800",
  },

  payment_rejected: {
    label: "Paiement refusé",
    className: "bg-red-100 text-red-800",
  },

  cancelled: {
    label: "Dossier annulé",
    className: "bg-slate-200 text-slate-800",
  },
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileSize(value: number | null) {
  if (!value) {
    return "—";
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} Ko`;
  }

  return `${(value / (1024 * 1024)).toFixed(2)} Mo`;
}

export default async function DossierPage({
  params,
}: PageProps) {
  const sessionClient =
    await createServerSupabaseClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    redirect("/admin/connexion");
  }

  const { id } = await params;

  const adminClient = createAdminClient();

  const {
    data: insuranceRequest,
    error: requestError,
  } = await adminClient
    .from("insurance_requests")
    .select(
      `
        id,
        request_code,
        status,
        kimlik_number,
        kimlik_expiration_date,
        passport_number,
        insurance_duration_years,
        calculated_age,
        calculated_price,
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
    .eq("id", id)
    .maybeSingle();

  if (requestError) {
    throw new Error(requestError.message);
  }

  if (!insuranceRequest) {
    notFound();
  }

  const {
    data: documentsData,
    error: documentsError,
  } = await adminClient
    .from("uploaded_documents")
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
    .eq("request_id", id)
    .order("uploaded_at", {
      ascending: true,
    });

  if (documentsError) {
    throw new Error(documentsError.message);
  }

  const documents =
    (documentsData ?? []) as DocumentRow[];

  const documentsWithUrls = await Promise.all(
    documents.map(async (document) => {
      const { data, error } =
        await adminClient.storage
          .from(BUCKET_NAME)
          .createSignedUrl(
            document.storage_path,
            60 * 10,
          );

      return {
        ...document,
        signedUrl:
          error || !data
            ? null
            : data.signedUrl,
      };
    }),
  );

  const client = Array.isArray(
    insuranceRequest.client,
  )
    ? insuranceRequest.client[0]
    : insuranceRequest.client;

  const payment = Array.isArray(
    insuranceRequest.payment,
  )
    ? insuranceRequest.payment[0]
    : insuranceRequest.payment;

  const status =
    statusLabels[insuranceRequest.status] ?? {
      label: insuranceRequest.status,
      className:
        "bg-slate-100 text-slate-700",
    };

  const province = Array.isArray(
    client?.province,
  )
    ? client?.province[0]
    : client?.province;

  const district = Array.isArray(
    client?.district,
  )
    ? client?.district[0]
    : client?.district;

  const neighborhood = Array.isArray(
    client?.neighborhood,
  )
    ? client?.neighborhood[0]
    : client?.neighborhood;

  const address = client
    ? [
        neighborhood?.name,
        client.street,
        client.building_number
          ? `Bina No: ${client.building_number}`
          : null,
        client.apartment_number
          ? `Daire No: ${client.apartment_number}`
          : null,
        district?.name,
        province?.name,
      ]
        .filter(Boolean)
        .join(", ")
    : "—";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/dossiers"
            className="font-medium text-blue-700 hover:underline"
          >
            ← Retour aux dossiers
          </Link>

          <Link
            href="/admin/tableau-de-bord"
            className="font-medium text-blue-700 hover:underline"
          >
            Tableau de bord
          </Link>
        </div>

        <header className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                Dossier d’assurance
              </p>

              <h1 className="mt-2 break-all text-3xl font-bold text-slate-900">
                {insuranceRequest.request_code}
              </h1>

              <p className="mt-2 text-slate-600">
                Créé le{" "}
                {formatDate(
                  insuranceRequest.created_at,
                )}
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${status.className}`}
            >
              {status.label}
            </span>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Informations du client
              </h2>

              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <Information
                  label="Nom"
                  value={client?.last_name}
                />

                <Information
                  label="Prénom"
                  value={client?.first_name}
                />

                <Information
                  label="Nom du père"
                  value={client?.father_name}
                />

                <Information
                  label="Date de naissance"
                  value={client?.birth_date}
                />

                <Information
                  label="Sexe"
                  value={
                    client?.gender === "male"
                      ? "Homme"
                      : client?.gender ===
                          "female"
                        ? "Femme"
                        : client?.gender
                  }
                />

                <Information
                  label="Nationalité"
                  value={client?.nationality}
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

                <p className="mt-1 font-semibold leading-7 text-slate-900">
                  {address || "—"}
                </p>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Identité et assurance
              </h2>

              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <Information
                  label="Numéro de Kimlik"
                  value={
                    insuranceRequest.kimlik_number
                  }
                />

                <Information
                  label="Expiration du Kimlik"
                  value={
                    insuranceRequest.kimlik_expiration_date
                  }
                />

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
                  value={`${insuranceRequest.insurance_duration_years} an${
                    insuranceRequest.insurance_duration_years ===
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

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
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
                    (document) => (
                      <article
                        key={document.id}
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
                            className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-center text-sm font-semibold text-blue-700 hover:bg-blue-100"
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
                Les liens sont temporaires et
                expirent après dix minutes.
              </p>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Paiement
              </h2>

              <dl className="mt-6 space-y-5">
                <Information
                  label="Statut"
                  value={payment?.status}
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
                  {payment.rejection_reason}
                </div>
              )}
            </section>

            <RequestActions
              requestId={insuranceRequest.id}
              currentStatus={
                insuranceRequest.status
              }
            />

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
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
  value?: string | number | null;
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

      <dd className="mt-1 break-words font-semibold text-slate-900">
        {value === null ||
        value === undefined ||
        value === ""
          ? "—"
          : value}
      </dd>
    </div>
  );
}