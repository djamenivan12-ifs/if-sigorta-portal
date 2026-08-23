type MonthlyPerformanceProps = {
  totalRequests: number;
  availablePolicies: number;
  rejectedPayments: number;
  confirmedPayments: number;
  revenue: number;
  oneYearRequests: number;
  twoYearRequests: number;
};

function formatPercentage(
  value: number,
) {
  return `${value.toLocaleString(
    "fr-FR",
    {
      maximumFractionDigits: 1,
    },
  )} %`;
}

function formatCurrency(
  value: number,
) {
  return `${value.toLocaleString(
    "fr-FR",
    {
      maximumFractionDigits: 2,
    },
  )} TL`;
}

type MetricProps = {
  label: string;
  value: string;
  description: string;
};

function Metric({
  label,
  value,
  description,
}: MetricProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function MonthlyPerformance({
  totalRequests,
  availablePolicies,
  rejectedPayments,
  confirmedPayments,
  revenue,
  oneYearRequests,
  twoYearRequests,
}: MonthlyPerformanceProps) {
  const conversionRate =
    totalRequests > 0
      ? (
          availablePolicies /
          totalRequests
        ) *
        100
      : 0;

  const rejectionRate =
    totalRequests > 0
      ? (
          rejectedPayments /
          totalRequests
        ) *
        100
      : 0;

  const averageRevenuePerPayment =
    confirmedPayments > 0
      ? revenue /
        confirmedPayments
      : 0;

  const durationTotal =
    oneYearRequests +
    twoYearRequests;

  const oneYearShare =
    durationTotal > 0
      ? (
          oneYearRequests /
          durationTotal
        ) *
        100
      : 0;

  const twoYearShare =
    durationTotal > 0
      ? (
          twoYearRequests /
          durationTotal
        ) *
        100
      : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
          Performance
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Analyse du mois
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Indicateurs de conversion,
          paiement et répartition des
          assurances.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          label="Taux de conversion"
          value={formatPercentage(
            conversionRate,
          )}
          description="Part des dossiers du mois devenus des assurances disponibles."
        />

        <Metric
          label="Taux de refus"
          value={formatPercentage(
            rejectionRate,
          )}
          description="Part des dossiers du mois actuellement en paiement refusé."
        />

        <Metric
          label="Panier moyen"
          value={formatCurrency(
            averageRevenuePerPayment,
          )}
          description="Revenu moyen par paiement confirmé."
        />

        <Metric
          label="Part assurances 1 an"
          value={formatPercentage(
            oneYearShare,
          )}
          description={`${oneYearRequests.toLocaleString(
            "fr-FR",
          )} dossier${
            oneYearRequests !== 1
              ? "s"
              : ""
          } sur le mois.`}
        />

        <Metric
          label="Part assurances 2 ans"
          value={formatPercentage(
            twoYearShare,
          )}
          description={`${twoYearRequests.toLocaleString(
            "fr-FR",
          )} dossier${
            twoYearRequests !== 1
              ? "s"
              : ""
          } sur le mois.`}
        />

        <Metric
          label="Paiements confirmés"
          value={confirmedPayments.toLocaleString(
            "fr-FR",
          )}
          description="Nombre de paiements validés sur la période."
        />
      </div>
    </section>
  );
}