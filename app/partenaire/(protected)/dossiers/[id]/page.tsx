import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePartner } from "@/lib/auth/requirePartner";
import { createServiceClient } from "@/lib/supabase/service";

const BUCKET_NAME =
  "insurance-documents";

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

const documentLabels: Record<
  string,
  string
> = {
  passport: "Passeport",
  kimlik_front: "Kimlik recto",
  kimlik_back: "Kimlik verso",
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
    label: "Paiement en vérification",
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

export default async function PartnerDossierPage({
  params,
}: PageProps) {
  /*
   * IMPORTANT :
   * partner.id vient de la session
   * authentifiée côté serveur.
   */
  const { partner } =
    await requirePartner();

  const { id } =
    await params;

  const serviceClient =
    createServiceClient();

  /*
   * Le partner_id est appliqué
   * directement dans la requête.
   *
   * Un partenaire ne peut donc pas
   * charger le dossier d'un autre
   * partenaire en modifiant l'URL.
   */
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
          source,
          partner_id,
          status,
          has_kimlik,
          kimlik_number,
          kimlik_expiration_date,
          insurance_start_date,
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
          )
        `,
      )
      .eq(
        "id",
        id,
      )
      .eq(
        "source",
        "partner",
      )
      .eq(
        "partner_id",
        partner.id,
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
   * On charge uniquement les
   * documents du dossier qui vient
   * d'être autorisé ci-dessus.
   */
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
        insuranceRequest.id,
      )
      .in(
        "document_type",
        [
          "passport",
          "kimlik_front",
          "kimlik_back",
        ],
      )
      .order(
        "uploaded_at",
        {
          ascending: true,
        },
      );

  if (documentsError) {
    throw new Error(
      documentsError.message,
    );
  }

  const documents =
    (documentsData ??
      []) as DocumentRow[];

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
          .filter(Boolean)
          .join(", ")
      : "—";

  const status =
    statusLabels[
      insuranceRequest.status
    ] ?? {
      label:
        insuranceRequest.status,

      className:
        "bg-slate-100 text-slate-700",
    };

  const duration =
    insuranceRequest
      .insurance_duration_years ===
    2
      ? 2
      : 1;

  const hasKimlik =
    insuranceRequest.has_kimlik !==
    false;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-5 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/partenaire/dossiers"
          className="text-sm font-semibold text-[#0B5D3B] transition hover:text-[#084A2F]"
        >
          ← Retour à mes dossiers
        </Link>

        <Link
          href="/partenaire/tableau-de-bord"
          className="text-sm font-semibold text-[#0B5D3B] transition hover:text-[#084A2F]"
        >
          Tableau de bord
        </Link>
      </div>

      <header className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
              Dossier partenaire
            </p>

            <h1 className="mt-3 break-all text-3xl font-black tracking-[-0.04em] text-[#102B20] sm:text-4xl">
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
            {status.label}
          </span>
        </div>
      </header>

      {insuranceRequest.status ===
        "waiting_payment" && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-black text-amber-900">
            Dossier créé avec succès
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-800">
            Le dossier est maintenant
            enregistré. Le paiement de
            ce dossier sera effectué
            individuellement dans
            l’étape suivante du
            processus partenaire.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black tracking-[-0.02em] text-[#102B20]">
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
                value={formatSimpleDate(
                  client?.birth_date ??
                    null,
                )}
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
                    ? `${client.whatsapp_country_code} ${client.whatsapp_number}`
                    : "—"
                }
              />
            </dl>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-sm text-slate-500">
                Adresse
              </p>

              <p className="mt-1 font-semibold leading-7 text-[#102B20]">
                {address || "—"}
              </p>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black tracking-[-0.02em] text-[#102B20]">
              Identité et assurance
            </h2>

            <div
              className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${
                hasKimlik
                  ? "border border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]"
                  : "border border-blue-200 bg-blue-50 text-blue-700"
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
                value={`${duration} ${
                  duration === 1
                    ? "an"
                    : "ans"
                }`}
              />
            </dl>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black tracking-[-0.02em] text-[#102B20]">
              Documents du client
            </h2>

            <div className="mt-6 space-y-3">
              {documentsWithUrls.length ===
              0 ? (
                <p className="text-sm text-slate-500">
                  Aucun document disponible.
                </p>
              ) : (
                documentsWithUrls.map(
                  (document) => (
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
              Les liens vers les
              documents sont temporaires
              et expirent après dix
              minutes.
            </p>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[1.5rem] border border-[#DCE9DD] bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
              Tarif partenaire
            </p>

            <p className="mt-3 text-4xl font-black tracking-tight text-[#0B5D3B]">
              {Number(
                insuranceRequest.calculated_price,
              ).toLocaleString(
                "fr-FR",
              )}{" "}
              <span className="text-2xl">
                TL
              </span>
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Tarif enregistré lors de
              la création du dossier.
            </p>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-[#102B20]">
              État du dossier
            </h2>

            <div className="mt-4">
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${status.className}`}
              >
                {status.label}
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Les prochaines actions
              disponibles dépendront de
              l’avancement du dossier.
            </p>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-[#102B20]">
              Référence
            </h2>

            <dl className="mt-5 space-y-5">
              <Information
                label="Matricule"
                value={
                  insuranceRequest.request_code
                }
              />

              <Information
                label="Durée"
                value={`${duration} ${
                  duration === 1
                    ? "an"
                    : "ans"
                }`}
              />

              <Information
                label="Créé le"
                value={formatDate(
                  insuranceRequest.created_at,
                )}
              />

              <Information
                label="Dernière mise à jour"
                value={formatDate(
                  insuranceRequest.updated_at,
                )}
              />
            </dl>
          </section>
        </aside>
      </div>
    </div>
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