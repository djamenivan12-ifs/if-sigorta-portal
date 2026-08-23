import Link from "next/link";

import MonthlyPerformance from "@/components/admin/dashboard/MonthlyPerformance";
import MonthlyReportButton from "@/components/admin/dashboard/MonthlyReportButton";
import NationalityStats from "@/components/admin/dashboard/NationalityStats";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type PaymentRow = {
  expected_amount:
    | number
    | string
    | null;

  verified_at:
    | string
    | null;
};

type NationalityRow = {
  nationality:
    | string
    | null;
};

type TrendDirection =
  | "up"
  | "down"
  | "stable";

type TrendResult = {
  value: number;
  direction: TrendDirection;
};

function calculateTrend(
  current: number,
  previous: number,
): TrendResult {
  if (
    previous === 0
  ) {
    if (
      current === 0
    ) {
      return {
        value: 0,
        direction:
          "stable",
      };
    }

    return {
      value: 100,
      direction:
        "up",
    };
  }

  const difference =
    (
      (
        current -
        previous
      ) /
      previous
    ) *
    100;

  if (
    Math.abs(
      difference,
    ) <
    0.01
  ) {
    return {
      value: 0,
      direction:
        "stable",
    };
  }

  return {
    value:
      Math.abs(
        difference,
      ),

    direction:
      difference >
      0
        ? "up"
        : "down",
  };
}

function formatCurrency(
  amount: number,
) {
  return `${amount.toLocaleString(
    "fr-FR",
    {
      maximumFractionDigits:
        2,
    },
  )} TL`;
}

function formatPercentage(
  value: number,
) {
  return `${value.toLocaleString(
    "fr-FR",
    {
      maximumFractionDigits:
        1,
    },
  )} %`;
}

function getTrendText(
  trend: TrendResult,
) {
  if (
    trend.direction ===
    "stable"
  ) {
    return "Stable";
  }

  const arrow =
    trend.direction ===
    "up"
      ? "↑"
      : "↓";

  return `${arrow} ${formatPercentage(
    trend.value,
  )}`;
}

function getTrendClassName(
  trend: TrendResult,
) {
  if (
    trend.direction ===
    "up"
  ) {
    return "text-green-700";
  }

  if (
    trend.direction ===
    "down"
  ) {
    return "text-red-700";
  }

  return "text-slate-500";
}

export default async function StatisticsPage() {
  await requireRole([
    "admin",
  ]);

  const serviceClient =
    createServiceClient();

  /*
   * ============================
   * DATES
   * ============================
   */

  const now =
    new Date();

  /*
   * On détermine l'année et le mois
   * courants selon le fuseau horaire
   * de la Turquie.
   */
  const istanbulDate =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Istanbul",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    ).format(
      now,
    );

  const currentYear =
    Number(
      istanbulDate.slice(
        0,
        4,
      ),
    );

  const currentMonth =
    Number(
      istanbulDate.slice(
        5,
        7,
      ),
    );

  /*
   * Début du mois courant,
   * à minuit en Turquie.
   */
  const monthStart =
    new Date(
      `${currentYear}-${String(
        currentMonth,
      ).padStart(
        2,
        "0",
      )}-01T00:00:00+03:00`,
    );

  /*
   * Début du mois suivant.
   */
  const nextMonthYear =
    currentMonth === 12
      ? currentYear + 1
      : currentYear;

  const nextMonthNumber =
    currentMonth === 12
      ? 1
      : currentMonth + 1;

  const nextMonthStart =
    new Date(
      `${nextMonthYear}-${String(
        nextMonthNumber,
      ).padStart(
        2,
        "0",
      )}-01T00:00:00+03:00`,
    );

  /*
   * Début du mois précédent.
   */
  const previousMonthYear =
    currentMonth === 1
      ? currentYear - 1
      : currentYear;

  const previousMonthNumber =
    currentMonth === 1
      ? 12
      : currentMonth - 1;

  const previousMonthStart =
    new Date(
      `${previousMonthYear}-${String(
        previousMonthNumber,
      ).padStart(
        2,
        "0",
      )}-01T00:00:00+03:00`,
    );

  /*
   * ============================
   * REQUÊTES
   * ============================
   */

  const [
    totalRequestsResult,
    totalPoliciesAvailableResult,
    totalPaymentsConfirmedResult,

    currentMonthRequestsResult,
    previousMonthRequestsResult,

    oneYearRequestsResult,
    twoYearRequestsResult,

    currentMonthRejectedResult,
    currentMonthAvailableResult,

    currentMonthPaymentsResult,
    previousMonthPaymentsResult,

    nationalityClientsResult,

    paymentsToReviewResult,
    policiesToPrepareResult,
  ] =
    await Promise.all([
      /*
       * Tous les dossiers.
       */
      serviceClient
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
        ),

      /*
       * Toutes les assurances
       * disponibles.
       */
      serviceClient
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
          "status",
          "policy_available",
        ),

      /*
       * Tous les paiements
       * confirmés.
       */
      serviceClient
        .from(
          "payments",
        )
        .select(
          `
            expected_amount,
            verified_at
          `,
        )
        .eq(
          "status",
          "confirmed",
        ),

      /*
       * Dossiers créés
       * ce mois.
       */
      serviceClient
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
        .gte(
          "created_at",
          monthStart.toISOString(),
        )
        .lt(
          "created_at",
          nextMonthStart.toISOString(),
        ),

      /*
       * Dossiers créés
       * le mois précédent.
       */
      serviceClient
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
        .gte(
          "created_at",
          previousMonthStart.toISOString(),
        )
        .lt(
          "created_at",
          monthStart.toISOString(),
        ),

      /*
       * Dossiers 1 an
       * créés ce mois.
       */
      serviceClient
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
          "insurance_duration_years",
          1,
        )
        .gte(
          "created_at",
          monthStart.toISOString(),
        )
        .lt(
          "created_at",
          nextMonthStart.toISOString(),
        ),

      /*
       * Dossiers 2 ans
       * créés ce mois.
       */
      serviceClient
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
          "insurance_duration_years",
          2,
        )
        .gte(
          "created_at",
          monthStart.toISOString(),
        )
        .lt(
          "created_at",
          nextMonthStart.toISOString(),
        ),

      /*
       * Paiements refusés parmi
       * les dossiers créés ce mois.
       */
      serviceClient
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
          "status",
          "payment_rejected",
        )
        .gte(
          "created_at",
          monthStart.toISOString(),
        )
        .lt(
          "created_at",
          nextMonthStart.toISOString(),
        ),

      /*
       * Assurances disponibles
       * parmi les dossiers créés
       * ce mois.
       */
      serviceClient
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
          "status",
          "policy_available",
        )
        .gte(
          "created_at",
          monthStart.toISOString(),
        )
        .lt(
          "created_at",
          nextMonthStart.toISOString(),
        ),

      /*
       * Paiements confirmés
       * ce mois.
       */
      serviceClient
        .from(
          "payments",
        )
        .select(
          `
            expected_amount,
            verified_at
          `,
        )
        .eq(
          "status",
          "confirmed",
        )
        .gte(
          "verified_at",
          monthStart.toISOString(),
        )
        .lt(
          "verified_at",
          nextMonthStart.toISOString(),
        ),

      /*
       * Paiements confirmés
       * le mois précédent.
       */
      serviceClient
        .from(
          "payments",
        )
        .select(
          `
            expected_amount,
            verified_at
          `,
        )
        .eq(
          "status",
          "confirmed",
        )
        .gte(
          "verified_at",
          previousMonthStart.toISOString(),
        )
        .lt(
          "verified_at",
          monthStart.toISOString(),
        ),

      /*
       * Nationalités.
       */
      serviceClient
        .from(
          "clients",
        )
        .select(
          "nationality",
        ),

      /*
       * Paiements à vérifier.
       */
      serviceClient
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
          "status",
          "payment_review",
        ),

      /*
       * Polices à préparer.
       */
      serviceClient
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
          "status",
          "policy_preparation",
        ),
    ]);

  /*
   * ============================
   * ERREURS
   * ============================
   */

  const errors = [
    totalRequestsResult.error,
    totalPoliciesAvailableResult.error,
    totalPaymentsConfirmedResult.error,
    currentMonthRequestsResult.error,
    previousMonthRequestsResult.error,
    oneYearRequestsResult.error,
    twoYearRequestsResult.error,
    currentMonthRejectedResult.error,
    currentMonthAvailableResult.error,
    currentMonthPaymentsResult.error,
    previousMonthPaymentsResult.error,
    nationalityClientsResult.error,
    paymentsToReviewResult.error,
    policiesToPrepareResult.error,
  ].filter(Boolean);

  if (
    errors.length >
    0
  ) {
    throw new Error(
      errors
        .map(
          (
            error,
          ) =>
            error?.message ??
            "Erreur Supabase",
        )
        .join(
          " | ",
        ),
    );
  }

  /*
   * ============================
   * KPI GLOBAUX
   * ============================
   */

  const totalRequests =
    totalRequestsResult.count ??
    0;

  const totalPoliciesAvailable =
    totalPoliciesAvailableResult.count ??
    0;

  const totalConfirmedPayments =
    (
      totalPaymentsConfirmedResult.data ??
      []
    ) as PaymentRow[];

  const totalRevenue =
    totalConfirmedPayments.reduce(
      (
        total,
        payment,
      ) =>
        total +
        Number(
          payment.expected_amount ??
            0,
        ),
      0,
    );

  const paymentsToReview =
    paymentsToReviewResult.count ??
    0;

  const policiesToPrepare =
    policiesToPrepareResult.count ??
    0;

  /*
   * ============================
   * KPI DU MOIS
   * ============================
   */

  const currentMonthRequests =
    currentMonthRequestsResult.count ??
    0;

  const previousMonthRequests =
    previousMonthRequestsResult.count ??
    0;

  const oneYearRequests =
    oneYearRequestsResult.count ??
    0;

  const twoYearRequests =
    twoYearRequestsResult.count ??
    0;

  const currentMonthRejected =
    currentMonthRejectedResult.count ??
    0;

  const currentMonthAvailable =
    currentMonthAvailableResult.count ??
    0;

  const currentMonthPayments =
    (
      currentMonthPaymentsResult.data ??
      []
    ) as PaymentRow[];

  const previousMonthPayments =
    (
      previousMonthPaymentsResult.data ??
      []
    ) as PaymentRow[];

  const confirmedPaymentsThisMonth =
    currentMonthPayments.length;

  const currentMonthRevenue =
    currentMonthPayments.reduce(
      (
        total,
        payment,
      ) =>
        total +
        Number(
          payment.expected_amount ??
            0,
        ),
      0,
    );

  const previousMonthRevenue =
    previousMonthPayments.reduce(
      (
        total,
        payment,
      ) =>
        total +
        Number(
          payment.expected_amount ??
            0,
        ),
      0,
    );

  /*
   * ============================
   * TENDANCES
   * ============================
   */

  const requestsTrend =
    calculateTrend(
      currentMonthRequests,
      previousMonthRequests,
    );

  const revenueTrend =
    calculateTrend(
      currentMonthRevenue,
      previousMonthRevenue,
    );

  /*
   * ============================
   * NATIONALITÉS
   * ============================
   */

  const nationalityRows =
    (
      nationalityClientsResult.data ??
      []
    ) as NationalityRow[];

  const nationalityCounts =
    new Map<
      string,
      number
    >();

  nationalityRows.forEach(
    (
      row,
    ) => {
      const nationality =
        row.nationality
          ?.trim();

      if (
        !nationality
      ) {
        return;
      }

      nationalityCounts.set(
        nationality,
        (
          nationalityCounts.get(
            nationality,
          ) ??
          0
        ) +
          1,
      );
    },
  );

  const totalClientsWithNationality =
    Array.from(
      nationalityCounts.values(),
    ).reduce(
      (
        total,
        count,
      ) =>
        total +
        count,
      0,
    );

  const nationalityData =
    Array.from(
      nationalityCounts.entries(),
    )
      .map(
        (
          [
            nationality,
            count,
          ],
        ) => ({
          nationality,

          count,

          percentage:
            totalClientsWithNationality >
            0
              ? (
                  count /
                  totalClientsWithNationality
                ) *
                100
              : 0,
        }),
      )
      .sort(
        (
          first,
          second,
        ) =>
          second.count -
          first.count,
      );

  const monthLabel =
    new Intl.DateTimeFormat(
      "fr-FR",
      {
        month:
          "long",
        year:
          "numeric",
      },
    ).format(
      now,
    );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        {/* HEADER */}

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
                Administration
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Statistiques
              </h1>

              <p className="mt-2 max-w-3xl text-slate-600">
                Analyse globale de l’activité IF Sigorta et des performances du mois.
              </p>

              <p className="mt-2 text-sm font-semibold capitalize text-[#2F2963]">
                {monthLabel}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/agents/performance"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2F2963] px-5 text-sm font-semibold text-white transition hover:bg-[#24204F]"
              >
                Performance agents
              </Link>

              <Link
                href="/admin/tableau-de-bord"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                ← Tableau de bord
              </Link>
            </div>
          </div>
        </header>

        {/* KPI GLOBAUX */}

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Vue globale
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Activité depuis le lancement du portail.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Dossiers"
              value={
                totalRequests.toLocaleString(
                  "fr-FR",
                )
              }
              description="Total des demandes enregistrées"
              className="bg-blue-50 text-blue-700"
            />

            <StatCard
              label="Assurances disponibles"
              value={
                totalPoliciesAvailable.toLocaleString(
                  "fr-FR",
                )
              }
              description="Polices finalisées"
              className="bg-emerald-50 text-emerald-700"
            />

            <StatCard
              label="Paiements confirmés"
              value={
                totalConfirmedPayments.length.toLocaleString(
                  "fr-FR",
                )
              }
              description="Paiements validés"
              className="bg-green-50 text-green-700"
            />

            <StatCard
              label="Chiffre d’affaires"
              value={
                formatCurrency(
                  totalRevenue,
                )
              }
              description="Somme des paiements confirmés"
              className="bg-violet-50 text-violet-700"
            />
          </div>
        </section>

        {/* ACTIONS EN ATTENTE */}

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/paiements?status=review"
            className="rounded-2xl border border-orange-200 bg-orange-50 p-6 transition hover:shadow-sm"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">
              Paiements
            </p>

            <p className="mt-3 text-3xl font-bold text-orange-900">
              {paymentsToReview.toLocaleString(
                "fr-FR",
              )}
            </p>

            <p className="mt-2 text-sm text-orange-700">
              paiement
              {paymentsToReview !==
              1
                ? "s"
                : ""}{" "}
              à vérifier
            </p>
          </Link>

          <Link
            href="/admin/polices?status=preparation"
            className="rounded-2xl border border-blue-200 bg-blue-50 p-6 transition hover:shadow-sm"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Polices
            </p>

            <p className="mt-3 text-3xl font-bold text-blue-900">
              {policiesToPrepare.toLocaleString(
                "fr-FR",
              )}
            </p>

            <p className="mt-2 text-sm text-blue-700">
              police
              {policiesToPrepare !==
              1
                ? "s"
                : ""}{" "}
              à préparer
            </p>
          </Link>
        </section>

        {/* ÉVOLUTION DU MOIS */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
              Évolution
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Comparaison mensuelle
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Comparaison avec le mois précédent.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">
                Nouvelles demandes
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {currentMonthRequests.toLocaleString(
                  "fr-FR",
                )}
              </p>

              <div className="mt-3 flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Mois précédent :{" "}
                  {previousMonthRequests.toLocaleString(
                    "fr-FR",
                  )}
                </span>

                <span
                  className={`text-sm font-bold ${getTrendClassName(
                    requestsTrend,
                  )}`}
                >
                  {getTrendText(
                    requestsTrend,
                  )}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">
                Chiffre d’affaires du mois
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatCurrency(
                  currentMonthRevenue,
                )}
              </p>

              <div className="mt-3 flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Mois précédent :{" "}
                  {formatCurrency(
                    previousMonthRevenue,
                  )}
                </span>

                <span
                  className={`text-sm font-bold ${getTrendClassName(
                    revenueTrend,
                  )}`}
                >
                  {getTrendText(
                    revenueTrend,
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* PERFORMANCE DU MOIS */}

        <div className="mt-6">
          <MonthlyPerformance
            totalRequests={
              currentMonthRequests
            }
            availablePolicies={
              currentMonthAvailable
            }
            rejectedPayments={
              currentMonthRejected
            }
            confirmedPayments={
              confirmedPaymentsThisMonth
            }
            revenue={
              currentMonthRevenue
            }
            oneYearRequests={
              oneYearRequests
            }
            twoYearRequests={
              twoYearRequests
            }
          />
        </div>

        {/* NATIONALITÉS + RAPPORT */}

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <NationalityStats
            data={
              nationalityData
            }
            total={
              totalClientsWithNationality
            }
          />

          <MonthlyReportButton />
        </div>

        {/* ÉQUIPE */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
                Équipe
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Performance des agents
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Consultez la charge de travail, les délais et le taux de finalisation de chaque agent.
              </p>
            </div>

            <Link
              href="/admin/agents/performance"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2F2963] px-5 text-sm font-semibold text-white transition hover:bg-[#24204F]"
            >
              Voir les performances →
            </Link>
          </div>
        </section>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span
        className={`inline-flex rounded-xl px-3 py-1 text-xs font-semibold ${className}`}
      >
        {
          label
        }
      </span>

      <p className="mt-4 text-2xl font-bold text-slate-900">
        {
          value
        }
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {
          description
        }
      </p>
    </div>
  );
}