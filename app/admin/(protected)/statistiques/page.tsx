import Link from "next/link";

import MonthlyPerformance from "@/components/admin/dashboard/MonthlyPerformance";
import MonthlyReportButton from "@/components/admin/dashboard/MonthlyReportButton";
import NationalityStats from "@/components/admin/dashboard/NationalityStats";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type PaymentRow = {
  expected_amount: number | string | null;
  verified_at: string | null;
};

type PaymentWithRequestRow = PaymentRow & {
  request:
    | {
        source: string | null;
        partner_id: string | null;
      }
    | {
        source: string | null;
        partner_id: string | null;
      }[]
    | null;
};

type NationalityRow = {
  nationality: string | null;
};

type PartnerRow = {
  id: string;
  code: string;
  company_name: string;
  is_active: boolean;
};

type PartnerRequestRow = {
  id: string;
  partner_id: string | null;
  status: string;
};

type TrendDirection = "up" | "down" | "stable";

type TrendResult = {
  value: number;
  direction: TrendDirection;
};

type PartnerPerformance = {
  id: string;
  code: string;
  companyName: string;
  isActive: boolean;
  requests: number;
  availablePolicies: number;
  confirmedPayments: number;
  revenue: number;
};

function calculateTrend(
  current: number,
  previous: number,
): TrendResult {
  if (previous === 0) {
    if (current === 0) {
      return {
        value: 0,
        direction: "stable",
      };
    }

    return {
      value: 100,
      direction: "up",
    };
  }

  const difference =
    ((current - previous) /
      previous) *
    100;

  if (
    Math.abs(difference) <
    0.01
  ) {
    return {
      value: 0,
      direction: "stable",
    };
  }

  return {
    value:
      Math.abs(difference),

    direction:
      difference > 0
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

  const monthStart =
    new Date(
      `${currentYear}-${String(
        currentMonth,
      ).padStart(
        2,
        "0",
      )}-01T00:00:00+03:00`,
    );

  const nextMonthYear =
    currentMonth ===
    12
      ? currentYear + 1
      : currentYear;

  const nextMonthNumber =
    currentMonth ===
    12
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

  const previousMonthYear =
    currentMonth ===
    1
      ? currentYear - 1
      : currentYear;

  const previousMonthNumber =
    currentMonth ===
    1
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

    directRequestsResult,
    partnerRequestsCountResult,
    directMonthRequestsResult,
    partnerMonthRequestsResult,
    directAvailableResult,
    partnerAvailableResult,
    confirmedPaymentsBySourceResult,
    partnersResult,
    partnerRequestsResult,
  ] =
    await Promise.all([
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

      serviceClient
        .from(
          "clients",
        )
        .select(
          "nationality",
        ),

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

      /*
       * Total dossiers directs.
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
          "source",
          "direct",
        ),

      /*
       * Total dossiers partenaires.
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
          "source",
          "partner",
        ),

      /*
       * Dossiers directs créés ce mois.
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
          "source",
          "direct",
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
       * Dossiers partenaires créés ce mois.
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
          "source",
          "partner",
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
       * Assurances disponibles directes.
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
          "source",
          "direct",
        )
        .eq(
          "status",
          "policy_available",
        ),

      /*
       * Assurances disponibles partenaires.
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
          "source",
          "partner",
        )
        .eq(
          "status",
          "policy_available",
        ),

      /*
       * Paiements confirmés avec source
       * du dossier et partenaire.
       */
      serviceClient
        .from(
          "payments",
        )
        .select(
          `
            expected_amount,
            verified_at,

            request:insurance_requests!inner (
              source,
              partner_id
            )
          `,
        )
        .eq(
          "status",
          "confirmed",
        ),

      /*
       * Liste des partenaires.
       */
      serviceClient
        .from(
          "partners",
        )
        .select(
          `
            id,
            code,
            company_name,
            is_active
          `,
        )
        .order(
          "company_name",
          {
            ascending:
              true,
          },
        ),

      /*
       * Tous les dossiers partenaires
       * pour construire leur performance.
       */
      serviceClient
        .from(
          "insurance_requests",
        )
        .select(
          `
            id,
            partner_id,
            status
          `,
        )
        .eq(
          "source",
          "partner",
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
    directRequestsResult.error,
    partnerRequestsCountResult.error,
    directMonthRequestsResult.error,
    partnerMonthRequestsResult.error,
    directAvailableResult.error,
    partnerAvailableResult.error,
    confirmedPaymentsBySourceResult.error,
    partnersResult.error,
    partnerRequestsResult.error,
  ].filter(
    Boolean,
  );

  if (
    errors.length >
    0
  ) {
    throw new Error(
      errors
        .map(
          (error) =>
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
    (row) => {
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
        ([
          nationality,
          count,
        ]) => ({
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

  /*
   * ============================
   * DIRECT VS PARTENAIRE
   * ============================
   */

  const directRequests =
    directRequestsResult.count ??
    0;

  const partnerRequests =
    partnerRequestsCountResult.count ??
    0;

  const directMonthRequests =
    directMonthRequestsResult.count ??
    0;

  const partnerMonthRequests =
    partnerMonthRequestsResult.count ??
    0;

  const directAvailable =
    directAvailableResult.count ??
    0;

  const partnerAvailable =
    partnerAvailableResult.count ??
    0;

  const confirmedPaymentsBySource =
    (
      confirmedPaymentsBySourceResult.data ??
      []
    ) as PaymentWithRequestRow[];

  let directRevenue =
    0;

  let partnerRevenue =
    0;

  const partnerRevenueMap =
    new Map<
      string,
      {
        revenue: number;
        confirmedPayments: number;
      }
    >();

  confirmedPaymentsBySource.forEach(
    (payment) => {
      const requestRelation =
        normalizeRelation(
          payment.request,
        );

      const amount =
        Number(
          payment.expected_amount ??
            0,
        );

      if (
        requestRelation?.source ===
        "partner"
      ) {
        partnerRevenue +=
          amount;

        if (
          requestRelation.partner_id
        ) {
          const previous =
            partnerRevenueMap.get(
              requestRelation.partner_id,
            ) ??
            {
              revenue: 0,
              confirmedPayments: 0,
            };

          partnerRevenueMap.set(
            requestRelation.partner_id,
            {
              revenue:
                previous.revenue +
                amount,

              confirmedPayments:
                previous.confirmedPayments +
                1,
            },
          );
        }

        return;
      }

      if (
        requestRelation?.source ===
        "direct"
      ) {
        directRevenue +=
          amount;
      }
    },
  );

  const partnerRequestRows =
    (
      partnerRequestsResult.data ??
      []
    ) as PartnerRequestRow[];

  const partnerRequestMap =
    new Map<
      string,
      {
        requests: number;
        availablePolicies: number;
      }
    >();

  partnerRequestRows.forEach(
    (requestRow) => {
      if (
        !requestRow.partner_id
      ) {
        return;
      }

      const previous =
        partnerRequestMap.get(
          requestRow.partner_id,
        ) ??
        {
          requests: 0,
          availablePolicies: 0,
        };

      partnerRequestMap.set(
        requestRow.partner_id,
        {
          requests:
            previous.requests +
            1,

          availablePolicies:
            previous.availablePolicies +
            (
              requestRow.status ===
              "policy_available"
                ? 1
                : 0
            ),
        },
      );
    },
  );

  const partners =
    (
      partnersResult.data ??
      []
    ) as PartnerRow[];

  const partnerPerformance:
    PartnerPerformance[] =
      partners
        .map(
          (partner) => {
            const requestStats =
              partnerRequestMap.get(
                partner.id,
              ) ??
              {
                requests: 0,
                availablePolicies: 0,
              };

            const paymentStats =
              partnerRevenueMap.get(
                partner.id,
              ) ??
              {
                revenue: 0,
                confirmedPayments: 0,
              };

            return {
              id:
                partner.id,

              code:
                partner.code,

              companyName:
                partner.company_name,

              isActive:
                partner.is_active,

              requests:
                requestStats.requests,

              availablePolicies:
                requestStats.availablePolicies,

              confirmedPayments:
                paymentStats.confirmedPayments,

              revenue:
                paymentStats.revenue,
            };
          },
        )
        .sort(
          (
            first,
            second,
          ) => {
            if (
              second.revenue !==
              first.revenue
            ) {
              return (
                second.revenue -
                first.revenue
              );
            }

            return (
              second.requests -
              first.requests
            );
          },
        );

  const partnerShare =
    totalRequests >
    0
      ? (
          partnerRequests /
          totalRequests
        ) *
        100
      : 0;

  const monthLabel =
    new Intl.DateTimeFormat(
      "fr-FR",
      {
        month:
          "long",

        year:
          "numeric",

        timeZone:
          "Europe/Istanbul",
      },
    ).format(
      now,
    );

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        {/* HEADER */}

        <header className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                Administration
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#102B20]">
                Statistiques
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">
                Analyse globale de l’activité IF Sigorta, des clients directs et des partenaires.
              </p>

              <p className="mt-3 text-sm font-semibold capitalize text-[#0B5D3B]">
                {
                  monthLabel
                }
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/agents/performance"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#B8E83D] px-5 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E]"
              >
                Performance agents
              </Link>

              <Link
                href="/admin/tableau-de-bord"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                ← Tableau de bord
              </Link>
            </div>
          </div>
        </header>

        {/* KPI GLOBAUX */}

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
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
              className="bg-[#EEF6EC] text-[#31513B]"
            />

            <StatCard
              label="Assurances disponibles"
              value={
                totalPoliciesAvailable.toLocaleString(
                  "fr-FR",
                )
              }
              description="Polices finalisées"
              className="bg-[#EAF4E8] text-[#0B5D3B]"
            />

            <StatCard
              label="Paiements confirmés"
              value={
                totalConfirmedPayments.length.toLocaleString(
                  "fr-FR",
                )
              }
              description="Paiements validés"
              className="bg-[#F3F8F2] text-[#0B5D3B]"
            />

            <StatCard
              label="Chiffre d’affaires"
              value={
                formatCurrency(
                  totalRevenue,
                )
              }
              description="Somme des paiements confirmés"
              className="bg-[#F1F6EA] text-[#49613E]"
            />
          </div>
        </section>

        {/* ACTIONS EN ATTENTE */}

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/paiements?status=review"
            className="rounded-[1.5rem] border border-orange-200 bg-orange-50 p-6 transition hover:-translate-y-0.5"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">
              Paiements
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-orange-900">
              {
                paymentsToReview.toLocaleString(
                  "fr-FR",
                )
              }
            </p>

            <p className="mt-2 text-sm text-orange-700">
              paiement
              {
                paymentsToReview !==
                1
                  ? "s"
                  : ""
              }{" "}
              à vérifier
            </p>
          </Link>

          <Link
            href="/admin/polices?status=preparation"
            className="rounded-[1.5rem] border border-[#CFE3CF] bg-[#F3F8F2] p-6 transition hover:-translate-y-0.5"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
              Polices
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#102B20]">
              {
                policiesToPrepare.toLocaleString(
                  "fr-FR",
                )
              }
            </p>

            <p className="mt-2 text-sm text-[#31513B]">
              police
              {
                policiesToPrepare !==
                1
                  ? "s"
                  : ""
              }{" "}
              à préparer
            </p>
          </Link>
        </section>

        {/* ORIGINE DES DOSSIERS */}

        <section className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                Acquisition
              </p>

              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                Origine des dossiers
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Comparaison de l’activité générée directement et par les partenaires.
              </p>
            </div>

            <div className="rounded-xl bg-[#EEF6EC] px-4 py-3">
              <p className="text-xs font-semibold text-[#31513B]">
                Part des partenaires
              </p>

              <p className="mt-1 text-xl font-black text-[#0B5D3B]">
                {
                  formatPercentage(
                    partnerShare,
                  )
                }
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-3 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Indicateur
                  </th>

                  <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Direct
                  </th>

                  <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Partenaire
                  </th>

                  <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                <SourceRow
                  label="Dossiers"
                  direct={
                    directRequests.toLocaleString(
                      "fr-FR",
                    )
                  }
                  partner={
                    partnerRequests.toLocaleString(
                      "fr-FR",
                    )
                  }
                  total={
                    totalRequests.toLocaleString(
                      "fr-FR",
                    )
                  }
                />

                <SourceRow
                  label="Dossiers ce mois"
                  direct={
                    directMonthRequests.toLocaleString(
                      "fr-FR",
                    )
                  }
                  partner={
                    partnerMonthRequests.toLocaleString(
                      "fr-FR",
                    )
                  }
                  total={
                    currentMonthRequests.toLocaleString(
                      "fr-FR",
                    )
                  }
                />

                <SourceRow
                  label="Assurances disponibles"
                  direct={
                    directAvailable.toLocaleString(
                      "fr-FR",
                    )
                  }
                  partner={
                    partnerAvailable.toLocaleString(
                      "fr-FR",
                    )
                  }
                  total={
                    totalPoliciesAvailable.toLocaleString(
                      "fr-FR",
                    )
                  }
                />

                <SourceRow
                  label="CA confirmé"
                  direct={
                    formatCurrency(
                      directRevenue,
                    )
                  }
                  partner={
                    formatCurrency(
                      partnerRevenue,
                    )
                  }
                  total={
                    formatCurrency(
                      totalRevenue,
                    )
                  }
                  last
                />
              </tbody>
            </table>
          </div>
        </section>

        {/* PERFORMANCE DES PARTENAIRES */}

        <section className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                Partenaires
              </p>

              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                Performance des partenaires
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Classement par chiffre d’affaires confirmé puis par nombre de dossiers.
              </p>
            </div>

            <Link
              href="/admin/partenaires"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Gérer les partenaires →
            </Link>
          </div>

          {
            partnerPerformance.length ===
            0
              ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-[#FAFCFA] p-8 text-center">
                    <p className="text-sm font-semibold text-[#102B20]">
                      Aucun partenaire enregistré
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Les performances apparaîtront ici après la création des partenaires.
                    </p>
                  </div>
                )
              : (
                  <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="px-3 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                            Partenaire
                          </th>

                          <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                            Dossiers
                          </th>

                          <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                            Disponibles
                          </th>

                          <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                            Paiements confirmés
                          </th>

                          <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                            CA confirmé
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {
                          partnerPerformance.map(
                            (partner) => (
                              <tr
                                key={
                                  partner.id
                                }
                                className="border-b border-slate-100 last:border-b-0"
                              >
                                <td className="px-3 py-4">
                                  <Link
                                    href={`/admin/partenaires/${partner.id}`}
                                    className="font-semibold text-[#102B20] hover:text-[#0B5D3B]"
                                  >
                                    {
                                      partner.companyName
                                    }
                                  </Link>

                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium text-slate-400">
                                      {
                                        partner.code
                                      }
                                    </span>

                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                        partner.isActive
                                          ? "bg-[#EEF6EC] text-[#0B5D3B]"
                                          : "bg-slate-100 text-slate-500"
                                      }`}
                                    >
                                      {
                                        partner.isActive
                                          ? "Actif"
                                          : "Inactif"
                                      }
                                    </span>
                                  </div>
                                </td>

                                <td className="px-3 py-4 text-right font-semibold text-slate-700">
                                  {
                                    partner.requests.toLocaleString(
                                      "fr-FR",
                                    )
                                  }
                                </td>

                                <td className="px-3 py-4 text-right font-semibold text-slate-700">
                                  {
                                    partner.availablePolicies.toLocaleString(
                                      "fr-FR",
                                    )
                                  }
                                </td>

                                <td className="px-3 py-4 text-right font-semibold text-slate-700">
                                  {
                                    partner.confirmedPayments.toLocaleString(
                                      "fr-FR",
                                    )
                                  }
                                </td>

                                <td className="px-3 py-4 text-right font-black text-[#0B5D3B]">
                                  {
                                    formatCurrency(
                                      partner.revenue,
                                    )
                                  }
                                </td>
                              </tr>
                            ),
                          )
                        }
                      </tbody>
                    </table>
                  </div>
                )
          }
        </section>

        {/* ÉVOLUTION DU MOIS */}

        <section className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
              Évolution
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
              Comparaison mensuelle
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Comparaison avec le mois précédent.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-[#FAFCFA] p-5">
              <p className="text-sm font-medium text-slate-500">
                Nouvelles demandes
              </p>

              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#102B20]">
                {
                  currentMonthRequests.toLocaleString(
                    "fr-FR",
                  )
                }
              </p>

              <div className="mt-3 flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Mois précédent :{" "}
                  {
                    previousMonthRequests.toLocaleString(
                      "fr-FR",
                    )
                  }
                </span>

                <span
                  className={`text-sm font-bold ${getTrendClassName(
                    requestsTrend,
                  )}`}
                >
                  {
                    getTrendText(
                      requestsTrend,
                    )
                  }
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-[#FAFCFA] p-5">
              <p className="text-sm font-medium text-slate-500">
                Chiffre d’affaires du mois
              </p>

              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#102B20]">
                {
                  formatCurrency(
                    currentMonthRevenue,
                  )
                }
              </p>

              <div className="mt-3 flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Mois précédent :{" "}
                  {
                    formatCurrency(
                      previousMonthRevenue,
                    )
                  }
                </span>

                <span
                  className={`text-sm font-bold ${getTrendClassName(
                    revenueTrend,
                  )}`}
                >
                  {
                    getTrendText(
                      revenueTrend,
                    )
                  }
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

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
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

        <section className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                Équipe
              </p>

              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                Performance des agents
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Consultez la charge de travail, les délais et le taux de finalisation de chaque agent.
              </p>
            </div>

            <Link
              href="/admin/agents/performance"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#B8E83D] px-5 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E]"
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

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {
          description
        }
      </p>
    </div>
  );
}

function SourceRow({
  label,
  direct,
  partner,
  total,
  last = false,
}: {
  label: string;
  direct: string;
  partner: string;
  total: string;
  last?: boolean;
}) {
  return (
    <tr
      className={
        last
          ? ""
          : "border-b border-slate-100"
      }
    >
      <td className="px-3 py-4 text-sm font-semibold text-[#102B20]">
        {
          label
        }
      </td>

      <td className="px-3 py-4 text-right text-sm font-semibold text-slate-600">
        {
          direct
        }
      </td>

      <td className="px-3 py-4 text-right text-sm font-black text-[#0B5D3B]">
        {
          partner
        }
      </td>

      <td className="px-3 py-4 text-right text-sm font-semibold text-[#102B20]">
        {
          total
        }
      </td>
    </tr>
  );
}
