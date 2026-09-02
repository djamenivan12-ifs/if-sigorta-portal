import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePartner } from "@/lib/auth/requirePartner";
import { createServiceClient } from "@/lib/supabase/service";

import PartnerPaymentForm from "./PartnerPaymentForm";

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
   * Le partenaire provient exclusivement
   * de la session authentifiée.
   */
  const { partner } =
    await requirePartner();

  const { id } =
    await params;

  const serviceClient =
    createServiceClient();

  /*
   * ==================================================
   * DOSSIER
   * ==================================================
   *
   * Un partenaire ne peut charger que
   * ses propres dossiers.
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
   * ==================================================
   * DOCUMENTS CLIENT
   * ==================================================
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

  /*
   * URL temporaires des documents.
   */
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

  /*
   * ==================================================
   * PAIEMENT
   * ==================================================
   *
   * Le motif du refus est lu uniquement pour
   * le dossier partenaire actuellement affiché.
   */

  const {
    data: paymentData,
    error: paymentError,
  } =
    await serviceClient
      .from(
        "payments",
      )
      .select(
        `
          id,
          status,
          rejection_reason
        `,
      )
      .eq(
        "request_id",
        insuranceRequest.id,
      )
      .maybeSingle();

  if (paymentError) {
    throw new Error(
      paymentError.message,
    );
  }

  const rejectionReason =
    paymentData?.rejection_reason ??
    null;

  /*
   * ==================================================
   * NORMALISATION CLIENT
   * ==================================================
   */

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

  /*
   * ==================================================
   * DONNÉES D'AFFICHAGE
   * ==================================================
   */

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

  const calculatedPrice =
    Number(
      insuranceRequest.calculated_price,
    );

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-5 lg:px-8 lg:py-8">
      {/* Navigation */}

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

      {/* En-tête */}

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

      {/* Messages selon statut */}

      {insuranceRequest.status ===
        "waiting_payment" && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-black text-amber-900">
            Paiement du dossier requis
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-800">
            Effectuez le virement correspondant
            au montant de ce dossier puis
            transmettez votre justificatif de
            paiement.
          </p>
        </div>
      )}

      {insuranceRequest.status ===
        "payment_review" && (
        <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg">
              ✓
            </div>

            <div>
              <p className="font-black text-orange-900">
                Justificatif reçu
              </p>

              <p className="mt-1 text-sm leading-6 text-orange-800">
                Votre justificatif de paiement
                a bien été transmis. IF Sigorta
                vérifie actuellement le paiement.
                Aucune autre action n'est
                nécessaire pour le moment.
              </p>
            </div>
          </div>
        </div>
      )}

      {insuranceRequest.status ===
        "payment_confirmed" && (
        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="font-black text-green-900">
            Paiement confirmé
          </p>

          <p className="mt-1 text-sm leading-6 text-green-800">
            Le paiement a été validé par
            IF Sigorta. Le dossier peut maintenant
            être traité.
          </p>
        </div>
      )}

      {insuranceRequest.status ===
        "policy_preparation" && (
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="font-black text-blue-900">
            Assurance en préparation
          </p>

          <p className="mt-1 text-sm leading-6 text-blue-800">
            Le paiement est validé et l'assurance
            du client est actuellement en cours de
            préparation.
          </p>
        </div>
      )}

      {insuranceRequest.status ===
        "policy_available" && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-black text-emerald-900">
            Assurance disponible
          </p>

          <p className="mt-1 text-sm leading-6 text-emerald-800">
            L'assurance est prête. Le téléchargement
            sera disponible depuis cet espace.
          </p>
        </div>
      )}

      {insuranceRequest.status ===
        "payment_rejected" && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="font-black text-red-900">
            Paiement refusé
          </p>

          <p className="mt-1 text-sm leading-6 text-red-800">
            Le justificatif transmis n'a pas été
            validé. Consultez le motif du refus puis
            envoyez un nouveau justificatif depuis
            ce dossier.
          </p>

          {rejectionReason && (
            <div className="mt-4 rounded-xl border border-red-200 bg-white/70 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-red-700">
                Motif du refus
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-red-950">
                {rejectionReason}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Contenu */}

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {/* Informations client */}

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

          {/* Identité */}

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

          {/* Paiement */}

          {insuranceRequest.status ===
            "waiting_payment" && (
            <PartnerPaymentForm
              requestId={
                insuranceRequest.id
              }
              requestCode={
                insuranceRequest.request_code
              }
              amount={
                calculatedPrice
              }
            />
          )}

          {/* Paiement en vérification */}

          {insuranceRequest.status ===
            "payment_review" && (
            <section className="rounded-[1.5rem] border border-orange-200 bg-orange-50 p-5 shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700">
                Paiement
              </p>

              <h2 className="mt-2 text-lg font-black text-orange-950">
                Vérification en cours
              </h2>

              <p className="mt-3 text-sm leading-6 text-orange-800">
                Le justificatif a été reçu.
                IF Sigorta doit maintenant confirmer
                le paiement.
              </p>

              <div className="mt-5 rounded-xl border border-orange-200 bg-white/70 p-4">
                <p className="text-xs font-semibold text-orange-700">
                  Montant transmis
                </p>

                <p className="mt-1 text-2xl font-black text-orange-950">
                  {calculatedPrice.toLocaleString(
                    "fr-FR",
                  )}{" "}
                  TL
                </p>
              </div>
            </section>
          )}

          {/* Paiement confirmé */}

          {[
            "payment_confirmed",
            "policy_preparation",
            "policy_available",
          ].includes(
            insuranceRequest.status,
          ) && (
            <section className="rounded-[1.5rem] border border-green-200 bg-green-50 p-5 shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">
                Paiement
              </p>

              <h2 className="mt-2 text-lg font-black text-green-950">
                Paiement confirmé
              </h2>

              <p className="mt-3 text-sm leading-6 text-green-800">
                Le paiement de ce dossier a été
                vérifié et validé par IF Sigorta.
              </p>

              <div className="mt-5 rounded-xl border border-green-200 bg-white/70 p-4">
                <p className="text-xs font-semibold text-green-700">
                  Montant
                </p>

                <p className="mt-1 text-2xl font-black text-green-950">
                  {calculatedPrice.toLocaleString(
                    "fr-FR",
                  )}{" "}
                  TL
                </p>
              </div>
            </section>
          )}

          {/* Paiement rejeté : nouvel envoi */}

          {insuranceRequest.status ===
            "payment_rejected" && (
            <PartnerPaymentForm
              requestId={
                insuranceRequest.id
              }
              requestCode={
                insuranceRequest.request_code
              }
              amount={
                calculatedPrice
              }
              isResubmission
              rejectionReason={
                rejectionReason
              }
            />
          )}

          {/* Documents */}

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
              Les liens vers les documents
              sont temporaires et expirent
              après dix minutes.
            </p>
          </section>
        </div>

        {/* Colonne droite */}

        <aside className="space-y-5">
          {/* Tarif */}

          <section className="rounded-[1.5rem] border border-[#DCE9DD] bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
              Tarif partenaire
            </p>

            <p className="mt-3 text-4xl font-black tracking-tight text-[#0B5D3B]">
              {calculatedPrice.toLocaleString(
                "fr-FR",
              )}{" "}
              <span className="text-2xl">
                TL
              </span>
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Tarif enregistré lors de la création
              du dossier. Une modification
              ultérieure des tarifs partenaire
              n'affectera pas ce montant.
            </p>
          </section>

          {/* État */}

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
              L'état de cette demande est mis
              à jour au fur et à mesure de son
              traitement par IF Sigorta.
            </p>
          </section>

          {/* Référence */}

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