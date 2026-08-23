import {
  BadgeDollarSign,
  Clock3,
  FileCheck2,
  FileText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import AgentDashboard from "@/components/admin/dashboard/AgentDashboard";
import DashboardHeader from "@/components/admin/dashboard/DashboardHeader";
import DashboardOverviewChart from "@/components/admin/dashboard/DashboardOverviewChart";
import DashboardQuickActions from "@/components/admin/dashboard/DashboardQuickActions";
import MonthlyPerformance from "@/components/admin/dashboard/MonthlyPerformance";
import MonthlyReportButton from "@/components/admin/dashboard/MonthlyReportButton";
import NationalityStats from "@/components/admin/dashboard/NationalityStats";
import RecentRequestsTable from "@/components/admin/dashboard/RecentRequestsTable";
import StatCard from "@/components/admin/dashboard/StatCard";
import DelaySummary from "@/components/admin/dashboard/DelaySummary";
import AdminNotifications from "@/components/admin/notifications/AdminNotifications";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type DelayRequestRow = {
  id: string;
  status: string;
  created_at: string;
  assigned_agent_id:
    | string
    | null;
};

type DelayActivityRow = {
  request_id: string;
  action: string;
  created_at: string;
};

const DELAY_ACTIVE_STATUSES = [
  "waiting_payment",
  "payment_review",
  "payment_confirmed",
  "policy_preparation",
  "policy_available",
  "payment_rejected",
];

const DELAY_PROGRESS_ACTIONS = [
  "request_created",
  "payment_uploaded",
  "payment_confirmed",
  "policy_preparation_started",
  "policy_uploaded_year_1",
  "policy_uploaded_year_2",
  "policy_replaced_year_1",
  "policy_replaced_year_2",
  "whatsapp_sent",
];

function getMinutesWithoutProgress(
  startValue: string,
) {
  const start =
    new Date(startValue);

  const now =
    new Date();

  if (
    Number.isNaN(
      start.getTime(),
    )
  ) {
    return 0;
  }

  const difference =
    now.getTime() -
    start.getTime();

  if (difference <= 0) {
    return 0;
  }

  return Math.floor(
    difference / 60000,
  );
}

type RequestStatus =
  | "waiting_payment"
  | "payment_review"
  | "payment_confirmed"
  | "policy_preparation"
  | "policy_available"
  | "payment_rejected"
  | "cancelled";

type RecentRequestRow = {
  id: string;
  request_code: string;
  insurance_duration_years: number;
  calculated_price:
    | number
    | string
    | null;
  status: string;
  created_at: string;

  client:
    | {
        first_name: string;
        last_name: string;
      }
    | Array<{
        first_name: string;
        last_name: string;
      }>
    | null;
};

type RequestChartRow = {
  created_at: string;
};

type PaymentChartRow = {
  expected_amount:
    | number
    | string
    | null;

  verified_at:
    | string
    | null;
};

type ClientNationalityRow = {
  nationality:
    | string
    | null;
};

type NationalityItem = {
  nationality: string;
  count: number;
  percentage: number;
};

type ChartItem = {
  label: string;
  requests: number;
  revenue: number;
};

type QueryError = {
  name: string;
  message: string;
};

const RECENT_REQUEST_STATUSES: RequestStatus[] = [
  "payment_review",
  "payment_confirmed",
  "policy_preparation",
  "policy_available",
  "payment_rejected",
  "cancelled",
];

function getIstanbulDateString(
  date: Date,
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(date);
}

function createIstanbulDate(
  dateString: string,
  time = "00:00:00",
): Date {
  return new Date(
    `${dateString}T${time}+03:00`,
  );
}

function addDays(
  date: Date,
  numberOfDays: number,
): Date {
  const result =
    new Date(date);

  result.setUTCDate(
    result.getUTCDate() +
      numberOfDays,
  );

  return result;
}

function getDateRanges() {
  const now =
    new Date();

  const todayString =
    getIstanbulDateString(
      now,
    );

  const todayStart =
    createIstanbulDate(
      todayString,
    );

  const tomorrowStart =
    addDays(
      todayStart,
      1,
    );

  const yesterdayStart =
    addDays(
      todayStart,
      -1,
    );

  const currentYear =
    Number(
      todayString.slice(
        0,
        4,
      ),
    );

  const currentMonth =
    Number(
      todayString.slice(
        5,
        7,
      ),
    );

  const monthStart =
    createIstanbulDate(
      `${currentYear}-${String(
        currentMonth,
      ).padStart(
        2,
        "0",
      )}-01`,
    );

  const nextMonthYear =
    currentMonth === 12
      ? currentYear + 1
      : currentYear;

  const nextMonthNumber =
    currentMonth === 12
      ? 1
      : currentMonth + 1;

  const nextMonthStart =
    createIstanbulDate(
      `${nextMonthYear}-${String(
        nextMonthNumber,
      ).padStart(
        2,
        "0",
      )}-01`,
    );

  const previousMonthYear =
    currentMonth === 1
      ? currentYear - 1
      : currentYear;

  const previousMonthNumber =
    currentMonth === 1
      ? 12
      : currentMonth - 1;

  const previousMonthStart =
    createIstanbulDate(
      `${previousMonthYear}-${String(
        previousMonthNumber,
      ).padStart(
        2,
        "0",
      )}-01`,
    );

  const chartStart =
    addDays(
      todayStart,
      -6,
    );

  return {
    todayStart,
    tomorrowStart,
    yesterdayStart,
    monthStart,
    nextMonthStart,
    previousMonthStart,
    chartStart,
  };
}

function calculateTrend(
  currentValue: number,
  previousValue: number,
): {
  value: string;
  direction:
    | "up"
    | "down"
    | "neutral";
} {
  if (
    currentValue === 0 &&
    previousValue === 0
  ) {
    return {
      value: "Stable",
      direction:
        "neutral",
    };
  }

  if (
    previousValue === 0
  ) {
    return {
      value:
        `+${currentValue}`,

      direction:
        currentValue > 0
          ? "up"
          : "neutral",
    };
  }

  const difference =
    ((currentValue -
      previousValue) /
      previousValue) *
    100;

  if (
    difference > 0
  ) {
    return {
      value:
        `+${difference.toLocaleString(
          "fr-FR",
          {
            maximumFractionDigits:
              1,
          },
        )} %`,

      direction:
        "up",
    };
  }

  if (
    difference < 0
  ) {
    return {
      value:
        `${difference.toLocaleString(
          "fr-FR",
          {
            maximumFractionDigits:
              1,
          },
        )} %`,

      direction:
        "down",
    };
  }

  return {
    value: "Stable",
    direction:
      "neutral",
  };
}

function formatCurrency(
  value: number,
): string {
  return `${value.toLocaleString(
    "fr-FR",
    {
      maximumFractionDigits:
        2,
    },
  )} TL`;
}

function getClientFromRelation(
  relation:
    RecentRequestRow["client"],
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

function isSupportedRequestStatus(
  value: string,
): value is RequestStatus {
  return RECENT_REQUEST_STATUSES.includes(
    value as RequestStatus,
  );
}

function buildChartData({
  requestRows,
  paymentRows,
  chartStart,
}: {
  requestRows:
    RequestChartRow[];

  paymentRows:
    PaymentChartRow[];

  chartStart:
    Date;
}): ChartItem[] {
  return Array.from({
    length: 7,
  }).map(
    (
      _,
      index,
    ) => {
      const currentDate =
        addDays(
          chartStart,
          index,
        );

      const currentDateString =
        getIstanbulDateString(
          currentDate,
        );

      const label =
        new Intl.DateTimeFormat(
          "fr-FR",
          {
            timeZone:
              "Europe/Istanbul",

            weekday:
              "short",
          },
        )
          .format(
            currentDate,
          )
          .replace(
            ".",
            "",
          );

      const requests =
        requestRows.filter(
          (
            requestRow,
          ) =>
            getIstanbulDateString(
              new Date(
                requestRow.created_at,
              ),
            ) ===
            currentDateString,
        ).length;

      const revenue =
        paymentRows
          .filter(
            (
              paymentRow,
            ) => {
              if (
                !paymentRow.verified_at
              ) {
                return false;
              }

              return (
                getIstanbulDateString(
                  new Date(
                    paymentRow.verified_at,
                  ),
                ) ===
                currentDateString
              );
            },
          )
          .reduce(
            (
              total,
              paymentRow,
            ) =>
              total +
              Number(
                paymentRow.expected_amount ??
                  0,
              ),
            0,
          );

      return {
        label,
        requests,
        revenue,
      };
    },
  );
}

export default async function TableauDeBordPage() {
  const {
  user,
  role,
} =
  await requireRole([
    "agent",
    "admin",
  ]);

  const serviceClient =
    createServiceClient();
let delayRequestQuery =
  serviceClient
    .from(
      "insurance_requests",
    )
    .select(
      `
        id,
        status,
        created_at,
        assigned_agent_id
      `,
    )
    .in(
      "status",
      DELAY_ACTIVE_STATUSES,
    );

/*
 * Pour un agent :
 *
 * - ses dossiers attribués ;
 * - nouvelles demandes non attribuées.
 *
 * L'admin voit tout.
 */
const currentRole =
  user.app_metadata?.role;

if (
  currentRole === "agent"
) {
  delayRequestQuery =
    delayRequestQuery.or(
      `assigned_agent_id.eq.${user.id},and(assigned_agent_id.is.null,status.eq.waiting_payment)`,
    );
}

const {
  data: delayRequestsData,
  error: delayRequestsError,
} =
  await delayRequestQuery;

if (delayRequestsError) {
  throw new Error(
    delayRequestsError.message,
  );
}

const delayRequests =
  (delayRequestsData ??
    []) as DelayRequestRow[];

const delayRequestIds =
  delayRequests.map(
    (request) =>
      request.id,
  );

let delayActivities:
  DelayActivityRow[] = [];

if (
  delayRequestIds.length > 0
) {
  const {
    data,
    error,
  } =
    await serviceClient
      .from(
        "activity_logs",
      )
      .select(
        `
          request_id,
          action,
          created_at
        `,
      )
      .in(
        "request_id",
        delayRequestIds,
      )
      .in(
        "action",
        DELAY_PROGRESS_ACTIONS,
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  delayActivities =
    (data ??
      []) as DelayActivityRow[];
}

const lastProgressByRequest =
  new Map<
    string,
    string
  >();

for (
  const activity of
  delayActivities
) {
  if (
    !lastProgressByRequest.has(
      activity.request_id,
    )
  ) {
    lastProgressByRequest.set(
      activity.request_id,
      activity.created_at,
    );
  }
}

let watchDelayCount = 0;
let lateDelayCount = 0;
let criticalDelayCount = 0;

for (
  const request of
  delayRequests
) {
  /*
   * Paiement refusé :
   * priorité élevée immédiatement.
   */
  if (
    request.status ===
    "payment_rejected"
  ) {
    criticalDelayCount += 1;
    continue;
  }

  /*
   * Si WhatsApp est déjà envoyé,
   * le traitement est terminé.
   */
  const hasWhatsappSent =
    delayActivities.some(
      (activity) =>
        activity.request_id ===
          request.id &&
        activity.action ===
          "whatsapp_sent",
    );

  if (hasWhatsappSent) {
    continue;
  }

  const lastProgressAt =
    lastProgressByRequest.get(
      request.id,
    ) ??
    request.created_at;

  const minutes =
    getMinutesWithoutProgress(
      lastProgressAt,
    );

  if (minutes >= 30) {
    criticalDelayCount += 1;
  } else if (
    minutes >= 15
  ) {
    lateDelayCount += 1;
  } else if (
    minutes >= 5
  ) {
    watchDelayCount += 1;
  }
}

  const {
    todayStart,
    tomorrowStart,
    yesterdayStart,
    monthStart,
    nextMonthStart,
    previousMonthStart,
    chartStart,
  } =
    getDateRanges();

  /*
   * Toutes les données
   * sont chargées en parallèle.
   */
  const [
    todayRequestsResult,
    yesterdayRequestsResult,
    currentMonthRequestsResult,
    previousMonthRequestsResult,

    paymentsToReviewResult,
    policiesToPrepareResult,
    policiesAvailableResult,

    oneYearRequestsResult,
    twoYearRequestsResult,

    rejectedRequestsResult,
    cancelledRequestsResult,

    currentMonthRejectedResult,
    currentMonthAvailableResult,

    currentMonthPaymentsResult,
    previousMonthPaymentsResult,

    recentRequestsResult,

    chartRequestsResult,
    chartPaymentsResult,

    nationalityClientsResult,
  ] =
    await Promise.all([
      /*
       * Aujourd'hui.
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
          todayStart.toISOString(),
        )
        .lt(
          "created_at",
          tomorrowStart.toISOString(),
        ),

      /*
       * Hier.
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
          yesterdayStart.toISOString(),
        )
        .lt(
          "created_at",
          todayStart.toISOString(),
        ),

      /*
       * Demandes du mois.
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
       * Mois précédent.
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

      /*
       * Toutes les assurances
       * actuellement disponibles.
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
       * Assurances 1 an du mois.
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
       * Assurances 2 ans du mois.
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
       * Tous les paiements refusés.
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
        ),

      /*
       * Tous les dossiers annulés.
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
          "cancelled",
        ),

      /*
       * Paiements refusés
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
       * Dossiers récents.
       */
      serviceClient
        .from(
          "insurance_requests",
        )
        .select(
          `
            id,
            request_code,
            insurance_duration_years,
            calculated_price,
            status,
            created_at,

            client:clients (
              first_name,
              last_name
            )
          `,
        )
        .in(
          "status",
          RECENT_REQUEST_STATUSES,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          6,
        ),

      /*
       * Graphique demandes.
       */
      serviceClient
        .from(
          "insurance_requests",
        )
        .select(
          "created_at",
        )
        .gte(
          "created_at",
          chartStart.toISOString(),
        )
        .lt(
          "created_at",
          tomorrowStart.toISOString(),
        ),

      /*
       * Graphique CA.
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
          chartStart.toISOString(),
        )
        .lt(
          "verified_at",
          tomorrowStart.toISOString(),
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
    ]);

  /*
   * Gestion détaillée
   * des erreurs Supabase.
   */
  const queryErrors:
    QueryError[] = [];

  function registerError(
    name: string,
    error:
      | {
          message?: string;
        }
      | null
      | undefined,
  ) {
    if (!error) {
      return;
    }

    queryErrors.push({
      name,

      message:
        error.message ??
        "Erreur Supabase inconnue.",
    });
  }

  registerError(
    "Demandes aujourd’hui",
    todayRequestsResult.error,
  );

  registerError(
    "Demandes hier",
    yesterdayRequestsResult.error,
  );

  registerError(
    "Demandes du mois",
    currentMonthRequestsResult.error,
  );

  registerError(
    "Demandes du mois précédent",
    previousMonthRequestsResult.error,
  );

  registerError(
    "Paiements à vérifier",
    paymentsToReviewResult.error,
  );

  registerError(
    "Polices à préparer",
    policiesToPrepareResult.error,
  );

  registerError(
    "Assurances disponibles",
    policiesAvailableResult.error,
  );

  registerError(
    "Assurances 1 an",
    oneYearRequestsResult.error,
  );

  registerError(
    "Assurances 2 ans",
    twoYearRequestsResult.error,
  );

  registerError(
    "Paiements refusés",
    rejectedRequestsResult.error,
  );

  registerError(
    "Dossiers annulés",
    cancelledRequestsResult.error,
  );

  registerError(
    "Paiements refusés du mois",
    currentMonthRejectedResult.error,
  );

  registerError(
    "Assurances disponibles du mois",
    currentMonthAvailableResult.error,
  );

  registerError(
    "Paiements du mois",
    currentMonthPaymentsResult.error,
  );

  registerError(
    "Paiements du mois précédent",
    previousMonthPaymentsResult.error,
  );

  registerError(
    "Dossiers récents",
    recentRequestsResult.error,
  );

  registerError(
    "Graphique des demandes",
    chartRequestsResult.error,
  );

  registerError(
    "Graphique des paiements",
    chartPaymentsResult.error,
  );

  registerError(
    "Nationalités",
    nationalityClientsResult.error,
  );

  if (
    queryErrors.length >
    0
  ) {
    console.error(
      "Erreurs du tableau de bord :",
      queryErrors,
    );

    return (
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <div className="rounded-xl bg-red-50 p-5">
              <h1 className="text-xl font-bold text-red-800">
                Impossible de charger complètement le tableau de bord
              </h1>

              <p className="mt-2 text-sm leading-6 text-red-700">
                Une ou plusieurs requêtes Supabase ont échoué.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {queryErrors.map(
                (
                  error,
                  index,
                ) => (
                  <div
                    key={`${error.name}-${index}`}
                    className="rounded-xl border border-red-200 bg-red-50/50 p-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {error.name}
                    </p>

                    <p className="mt-2 break-words font-mono text-sm leading-6 text-red-700">
                      {error.message}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * Statistiques principales.
   */
  const todayRequests =
    todayRequestsResult.count ??
    0;

  const yesterdayRequests =
    yesterdayRequestsResult.count ??
    0;

  const currentMonthRequests =
    currentMonthRequestsResult.count ??
    0;

  const previousMonthRequests =
    previousMonthRequestsResult.count ??
    0;

  const paymentsToReview =
    paymentsToReviewResult.count ??
    0;

  const policiesToPrepare =
    policiesToPrepareResult.count ??
    0;

  const policiesAvailable =
    policiesAvailableResult.count ??
    0;

  const oneYearRequests =
    oneYearRequestsResult.count ??
    0;

  const twoYearRequests =
    twoYearRequestsResult.count ??
    0;

  const rejectedRequests =
    rejectedRequestsResult.count ??
    0;

  const cancelledRequests =
    cancelledRequestsResult.count ??
    0;

  const currentMonthRejected =
    currentMonthRejectedResult.count ??
    0;

  const currentMonthAvailable =
    currentMonthAvailableResult.count ??
    0;

  const blockedRequests =
    rejectedRequests +
    cancelledRequests;

  /*
   * Paiements.
   */
  const confirmedPaymentsThisMonth =
    (
      currentMonthPaymentsResult.data ??
      []
    ).length;

  /*
   * CA du mois.
   */
  const currentMonthRevenue =
    (
      currentMonthPaymentsResult.data ??
      []
    ).reduce(
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
   * CA mois précédent.
   */
  const previousMonthRevenue =
    (
      previousMonthPaymentsResult.data ??
      []
    ).reduce(
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
   * Tendances.
   */
  const todayTrend =
    calculateTrend(
      todayRequests,
      yesterdayRequests,
    );

  const monthTrend =
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
   * 1 an / 2 ans.
   */
  const oneYearPercentage =
    currentMonthRequests > 0
      ? (
          oneYearRequests /
          currentMonthRequests
        ) *
        100
      : 0;

  const twoYearPercentage =
    currentMonthRequests > 0
      ? (
          twoYearRequests /
          currentMonthRequests
        ) *
        100
      : 0;

  /*
   * Dossiers récents.
   */
  const recentRequests =
    (
      (recentRequestsResult.data ??
        []) as RecentRequestRow[]
    )
      .filter(
        (
          requestRow,
        ) =>
          isSupportedRequestStatus(
            requestRow.status,
          ),
      )
      .map(
        (
          requestRow,
        ) => {
          const client =
            getClientFromRelation(
              requestRow.client,
            );

          const clientName =
            client
              ? `${client.last_name} ${client.first_name}`.trim()
              : "CLIENT INCONNU";

          return {
            id:
              requestRow.id,

            requestCode:
              requestRow.request_code,

            clientName,

            durationYears:
              requestRow.insurance_duration_years ===
              2
                ? (2 as const)
                : (1 as const),

            amount:
              Number(
                requestRow.calculated_price ??
                  0,
              ),

            status:
              requestRow.status as RequestStatus,

            createdAt:
              requestRow.created_at,
          };
        },
      );

  /*
   * Graphique 7 jours.
   */
  const chartData =
    buildChartData({
      requestRows:
        (
          chartRequestsResult.data ??
          []
        ) as RequestChartRow[],

      paymentRows:
        (
          chartPaymentsResult.data ??
          []
        ) as PaymentChartRow[],

      chartStart,
    });

  /*
   * Nationalités.
   */
  const nationalityRows =
    (
      nationalityClientsResult.data ??
      []
    ) as ClientNationalityRow[];

  const nationalityCounts =
    new Map<
      string,
      number
    >();

  for (
    const row of
    nationalityRows
  ) {
    const nationality =
      row.nationality
        ?.trim();

    if (!nationality) {
      continue;
    }

    nationalityCounts.set(
      nationality,
      (
        nationalityCounts.get(
          nationality,
        ) ??
        0
      ) + 1,
    );
  }

  const totalClientsWithNationality =
    Array.from(
      nationalityCounts.values(),
    ).reduce(
      (
        total,
        value,
      ) =>
        total +
        value,
      0,
    );

  const nationalityData:
    NationalityItem[] =
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
 * Utilisateur connecté.
 */
const email =
  user.email ??
  "";

const userName =
  (
    user.user_metadata
      ?.first_name ||
    user.user_metadata
      ?.name ||
    email.split(
      "@",
    )[0]
  )
    ?.toString()
    .trim() ||
  "Agent";

/*
 * Tableau de bord personnalisé
 * pour les agents.
 */
if (role === "agent") {
  return (
    <AgentDashboard
      userId={user.id}
      userName={userName}
    />
  );
}

/*
 * À partir d'ici :
 * tableau de bord ADMIN.
 */
return (
  <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <DashboardHeader
          userName={
            userName
          }
          title="Tableau de bord"
          description="Voici une vue d’ensemble en temps réel de l’activité du portail IF Sigorta."
        />

        {/* Statistiques principales */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Demandes aujourd’hui"
            value={todayRequests.toLocaleString(
              "fr-FR",
            )}
            description="Par rapport à hier"
            trendValue={
              todayTrend.value
            }
            trendDirection={
              todayTrend.direction
            }
            href="/admin/dossiers"
            accentClassName="bg-blue-50 text-blue-700"
            icon={
              <FileText className="h-5 w-5" />
            }
          />

          <StatCard
            title="Paiements à vérifier"
            value={paymentsToReview.toLocaleString(
              "fr-FR",
            )}
            description="Dekonts en attente"
            trendValue={
              paymentsToReview >
              0
                ? "Action requise"
                : "À jour"
            }
            trendDirection="neutral"
            href="/admin/dossiers?status=payment_review"
            accentClassName="bg-amber-50 text-amber-700"
            icon={
              <Clock3 className="h-5 w-5" />
            }
          />

          <StatCard
            title="Polices à préparer"
            value={policiesToPrepare.toLocaleString(
              "fr-FR",
            )}
            description="Dossiers en traitement"
            trendValue={
              policiesToPrepare >
              0
                ? "À traiter"
                : "À jour"
            }
            trendDirection="neutral"
            href="/admin/dossiers?status=policy_preparation"
            accentClassName="bg-violet-50 text-violet-700"
            icon={
              <ShieldCheck className="h-5 w-5" />
            }
          />

          <StatCard
            title="Assurances disponibles"
            value={policiesAvailable.toLocaleString(
              "fr-FR",
            )}
            description="Prêtes au téléchargement"
            trendValue="Total actuel"
            trendDirection="neutral"
            href="/admin/dossiers?status=policy_available"
            accentClassName="bg-emerald-50 text-emerald-700"
            icon={
              <FileCheck2 className="h-5 w-5" />
            }
          />
        </section>
<section className="mt-8">
  <DelaySummary
    watchCount={watchDelayCount}
    lateCount={lateDelayCount}
    criticalCount={criticalDelayCount}
  />
</section>
        {/* Statistiques du mois */}
        <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Demandes ce mois"
            value={currentMonthRequests.toLocaleString(
              "fr-FR",
            )}
            description="Toutes durées confondues"
            trendValue={
              monthTrend.value
            }
            trendDirection={
              monthTrend.direction
            }
            accentClassName="bg-cyan-50 text-cyan-700"
            icon={
              <TrendingUp className="h-5 w-5" />
            }
          />

          <StatCard
            title="Assurances 1 an"
            value={oneYearRequests.toLocaleString(
              "fr-FR",
            )}
            description={`${oneYearPercentage.toLocaleString(
              "fr-FR",
              {
                maximumFractionDigits:
                  1,
              },
            )} % des demandes du mois`}
            trendValue="Ce mois"
            trendDirection="neutral"
            accentClassName="bg-slate-100 text-slate-700"
            icon={
              <FileText className="h-5 w-5" />
            }
          />

          <StatCard
            title="Assurances 2 ans"
            value={twoYearRequests.toLocaleString(
              "fr-FR",
            )}
            description={`${twoYearPercentage.toLocaleString(
              "fr-FR",
              {
                maximumFractionDigits:
                  1,
              },
            )} % des demandes du mois`}
            trendValue="Ce mois"
            trendDirection="neutral"
            accentClassName="bg-indigo-50 text-indigo-700"
            icon={
              <ShieldCheck className="h-5 w-5" />
            }
          />

          <StatCard
            title="Chiffre d’affaires"
            value={formatCurrency(
              currentMonthRevenue,
            )}
            description="Paiements confirmés ce mois"
            trendValue={
              revenueTrend.value
            }
            trendDirection={
              revenueTrend.direction
            }
            accentClassName="bg-emerald-50 text-emerald-700"
            icon={
              <BadgeDollarSign className="h-5 w-5" />
            }
          />
        </section>

        {/* Graphique + notifications */}
        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_420px]">
          <DashboardOverviewChart
            data={
              chartData
            }
          />

          <AdminNotifications
            paymentsToReview={
              paymentsToReview
            }
            policiesToPrepare={
              policiesToPrepare
            }
            blockedRequests={
              blockedRequests
            }
          />
        </section>

        {/* Analyse mensuelle */}
        <section className="mt-8">
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
        </section>

        {/* Nationalités */}
        <section className="mt-8">
          <NationalityStats
            data={
              nationalityData
            }
            total={
              totalClientsWithNationality
            }
          />
        </section>

        {/* Rapport PDF */}
        <section className="mt-8">
          <MonthlyReportButton />
        </section>

        {/* Dossiers récents + actions */}
        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_420px]">
          <RecentRequestsTable
            requests={
              recentRequests
            }
          />

          <DashboardQuickActions />
        </section>
      </div>
    </main>
  );
}