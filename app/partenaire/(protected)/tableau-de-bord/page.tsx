import Link from "next/link";

import {
  CircleCheckBig,
  Clock3,
  CreditCard,
  FileText,
  FolderOpen,
  ArrowRight,
} from "lucide-react";

import {
  requirePartner,
} from "@/lib/auth/requirePartner";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type RecentRequestRow = {
  id: string;
  request_code: string;
  status: string;
  created_at: string;

  client:
    | {
        first_name: string | null;
        last_name: string | null;
      }
    | {
        first_name: string | null;
        last_name: string | null;
      }[]
    | null;
};

function normalizeRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined,
): T | null {
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

  return (
    relation ??
    null
  );
}

function getStatusLabel(
  status: string,
) {
  switch (
    status
  ) {
    case "waiting_payment":
      return "Paiement attendu";

    case "payment_review":
      return "Paiement en vérification";

    case "payment_rejected":
      return "Paiement à corriger";

    case "payment_confirmed":
      return "Paiement confirmé";

    case "policy_preparation":
      return "Assurance en préparation";

    case "policy_available":
      return "Assurance disponible";

    case "cancelled":
      return "Annulé";

    default:
      return status;
  }
}

function getStatusClassName(
  status: string,
) {
  switch (
    status
  ) {
    case "waiting_payment":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "payment_review":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "payment_rejected":
      return "bg-red-50 text-red-700 ring-red-200";

    case "payment_confirmed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "policy_preparation":
      return "bg-violet-50 text-violet-700 ring-violet-200";

    case "policy_available":
      return "bg-[#EEF6EC] text-[#0B5D3B] ring-[#CFE3CF]";

    case "cancelled":
      return "bg-slate-100 text-slate-500 ring-slate-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
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
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      timeZone:
        "Europe/Istanbul",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}

async function getPartnerDashboardData(
  partnerId: string,
) {
  const supabase =
    createServiceClient();

  /*
   * Toutes les requêtes du tableau de bord
   * sont obligatoirement limitées au partenaire
   * authentifié.
   */
  const baseQuery = () =>
    supabase
      .from(
        "insurance_requests",
      )
      .select(
        "id",
        {
          count:
            "exact",
          head:
            true,
        },
      )
      .eq(
        "source",
        "partner",
      )
      .eq(
        "partner_id",
        partnerId,
      );

  const [
    totalResult,
    waitingPaymentResult,
    paymentRejectedResult,
    paymentReviewResult,
    paymentConfirmedResult,
    policyPreparationResult,
    policyAvailableResult,
    recentRequestsResult,
  ] =
    await Promise.all([
      baseQuery(),

      baseQuery().eq(
        "status",
        "waiting_payment",
      ),

      baseQuery().eq(
        "status",
        "payment_rejected",
      ),

      baseQuery().eq(
        "status",
        "payment_review",
      ),

      baseQuery().eq(
        "status",
        "payment_confirmed",
      ),

      baseQuery().eq(
        "status",
        "policy_preparation",
      ),

      baseQuery().eq(
        "status",
        "policy_available",
      ),

      /*
       * Les 5 derniers dossiers.
       *
       * Même protection :
       * source = partner
       * partner_id = partenaire connecté
       */
      supabase
        .from(
          "insurance_requests",
        )
        .select(
          `
            id,
            request_code,
            status,
            created_at,

            client:clients (
              first_name,
              last_name
            )
          `,
        )
        .eq(
          "source",
          "partner",
        )
        .eq(
          "partner_id",
          partnerId,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          5,
        ),
    ]);

  const results = [
    totalResult,
    waitingPaymentResult,
    paymentRejectedResult,
    paymentReviewResult,
    paymentConfirmedResult,
    policyPreparationResult,
    policyAvailableResult,
    recentRequestsResult,
  ];

  const firstError =
    results.find(
      (result) =>
        result.error,
    )?.error;

  if (
    firstError
  ) {
    throw new Error(
      firstError.message,
    );
  }

  return {
    counts: {
      total:
        totalResult.count ??
        0,

      waitingPayment:
        (
          waitingPaymentResult.count ??
          0
        ) +
        (
          paymentRejectedResult.count ??
          0
        ),

      paymentReview:
        paymentReviewResult.count ??
        0,

      processing:
        (
          paymentConfirmedResult.count ??
          0
        ) +
        (
          policyPreparationResult.count ??
          0
        ),

      policyAvailable:
        policyAvailableResult.count ??
        0,
    },

    recentRequests:
      (
        recentRequestsResult.data ??
        []
      ) as RecentRequestRow[],
  };
}

export default async function PartnerDashboardPage() {
  /*
   * requirePartner() vérifie :
   * - session Supabase
   * - rôle partner
   * - liaison auth_user_id
   * - partenaire actif
   */
  const {
    partner,
  } =
    await requirePartner();

  let counts = {
    total: 0,
    waitingPayment: 0,
    paymentReview: 0,
    processing: 0,
    policyAvailable: 0,
  };

  let recentRequests:
    RecentRequestRow[] =
      [];

  let dashboardError =
    false;

  try {
    const data =
      await getPartnerDashboardData(
        partner.id,
      );

    counts =
      data.counts;

    recentRequests =
      data.recentRequests;
  } catch (error) {
    dashboardError =
      true;

    console.error(
      "Erreur tableau de bord partenaire :",
      error,
    );
  }

  const cards = [
    {
      label:
        "Mes dossiers",

      value:
        counts.total,

      icon:
        FolderOpen,

      href:
        "/partenaire/dossiers",
    },

    {
      label:
        "En attente de paiement",

      value:
        counts.waitingPayment,

      icon:
        CreditCard,

      href:
        "/partenaire/dossiers",
    },

    {
      label:
        "Paiements en vérification",

      value:
        counts.paymentReview,

      icon:
        Clock3,

      href:
        "/partenaire/dossiers",
    },

    {
      label:
        "En traitement",

      value:
        counts.processing,

      icon:
        FileText,

      href:
        "/partenaire/dossiers",
    },

    {
      label:
        "Assurances disponibles",

      value:
        counts.policyAvailable,

      icon:
        CircleCheckBig,

      href:
        "/partenaire/dossiers",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-5 lg:px-8 lg:py-8">
      {/* EN-TÊTE */}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0B5D3B]">
            Bonjour{" "}
            {
              partner.managerName
            }
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#102B20] sm:text-3xl">
            Tableau de bord
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Suivez les demandes
            d’assurance réalisées
            pour vos clients.
          </p>
        </div>

        <Link
          href="/partenaire/nouvelle-demande"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0B5D3B] px-5 text-sm font-bold text-white transition hover:bg-[#084A2F]"
        >
          Nouvelle demande
        </Link>
      </div>

      {/* ERREUR */}

      {
        dashboardError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-semibold text-red-700">
              Certaines informations du tableau de bord n’ont pas pu être chargées.
            </p>

            <p className="mt-1 text-xs leading-5 text-red-600">
              Actualisez la page. Si le problème persiste, contactez IF Sigorta.
            </p>
          </div>
        )
      }

      {/* COMPTEURS */}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {
          cards.map(
            (card) => {
              const Icon =
                card.icon;

              return (
                <Link
                  key={
                    card.label
                  }
                  href={
                    card.href
                  }
                  className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#CFE3CF] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F8F2] text-[#0B5D3B] transition group-hover:bg-[#EEF6EC]">
                      <Icon className="h-5 w-5" />
                    </div>

                    <span className="text-2xl font-black text-[#102B20]">
                      {
                        card.value
                      }
                    </span>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <p className="text-sm font-bold leading-5 text-slate-600">
                      {
                        card.label
                      }
                    </p>

                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0B5D3B]" />
                  </div>
                </Link>
              );
            },
          )
        }
      </div>

      {/* ACTIVITÉ RÉCENTE */}

      <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#102B20]">
              Activité récente
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Les derniers dossiers
              de{" "}
              <span className="font-semibold text-[#31513B]">
                {
                  partner.companyName
                }
              </span>
              .
            </p>
          </div>

          {
            counts.total >
              0 && (
              <Link
                href="/partenaire/dossiers"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#0B5D3B] transition hover:text-[#084A2F]"
              >
                Voir tous les dossiers

                <ArrowRight className="h-4 w-4" />
              </Link>
            )
          }
        </div>

        {
          recentRequests.length ===
          0 ? (
            <div className="mt-6 flex min-h-44 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[#FAFCF9] px-6 text-center">
              <div>
                <FolderOpen className="mx-auto h-7 w-7 text-slate-300" />

                <p className="mt-3 text-sm font-bold text-slate-500">
                  Aucun dossier partenaire pour le moment
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Vos dossiers apparaîtront ici après leur création.
                </p>

                <Link
                  href="/partenaire/nouvelle-demande"
                  className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0B5D3B] px-4 text-xs font-bold text-white transition hover:bg-[#084A2F]"
                >
                  Créer une demande
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              {/* DESKTOP */}

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full">
                  <thead className="bg-[#FAFCF9]">
                    <tr className="border-b border-slate-200">
                      <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                        Dossier
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                        Client
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                        Statut
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                        Date
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {
                      recentRequests.map(
                        (
                          request,
                        ) => {
                          const client =
                            normalizeRelation(
                              request.client,
                            );

                          const clientName =
                            [
                              client?.first_name,
                              client?.last_name,
                            ]
                              .filter(
                                Boolean,
                              )
                              .join(
                                " ",
                              ) ||
                            "Client";

                          return (
                            <tr
                              key={
                                request.id
                              }
                              className="border-b border-slate-100 last:border-b-0"
                            >
                              <td className="px-5 py-4">
                                <Link
                                  href={`/partenaire/dossiers/${request.id}`}
                                  className="text-sm font-black text-[#102B20] transition hover:text-[#0B5D3B]"
                                >
                                  {
                                    request.request_code
                                  }
                                </Link>
                              </td>

                              <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                                {
                                  clientName
                                }
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${getStatusClassName(
                                    request.status,
                                  )}`}
                                >
                                  {
                                    getStatusLabel(
                                      request.status,
                                    )
                                  }
                                </span>
                              </td>

                              <td className="px-5 py-4 text-sm font-medium text-slate-500">
                                {
                                  formatDate(
                                    request.created_at,
                                  )
                                }
                              </td>

                              <td className="px-5 py-4 text-right">
                                <Link
                                  href={`/partenaire/dossiers/${request.id}`}
                                  className="inline-flex items-center gap-1 text-sm font-bold text-[#0B5D3B] transition hover:text-[#084A2F]"
                                >
                                  Ouvrir

                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </td>
                            </tr>
                          );
                        },
                      )
                    }
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}

              <div className="divide-y divide-slate-100 md:hidden">
                {
                  recentRequests.map(
                    (
                      request,
                    ) => {
                      const client =
                        normalizeRelation(
                          request.client,
                        );

                      const clientName =
                        [
                          client?.first_name,
                          client?.last_name,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            " ",
                          ) ||
                        "Client";

                      return (
                        <Link
                          key={
                            request.id
                          }
                          href={`/partenaire/dossiers/${request.id}`}
                          className="block p-4 transition hover:bg-[#FAFCF9]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-[#102B20]">
                                {
                                  request.request_code
                                }
                              </p>

                              <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                                {
                                  clientName
                                }
                              </p>
                            </div>

                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#0B5D3B]" />
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${getStatusClassName(
                                request.status,
                              )}`}
                            >
                              {
                                getStatusLabel(
                                  request.status,
                                )
                              }
                            </span>

                            <span className="text-xs font-medium text-slate-400">
                              {
                                formatDate(
                                  request.created_at,
                                )
                              }
                            </span>
                          </div>
                        </Link>
                      );
                    },
                  )
                }
              </div>
            </div>
          )
        }
      </div>
    </div>
  );
}