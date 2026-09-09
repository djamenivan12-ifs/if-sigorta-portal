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
      ? (availablePolicies /
          totalRequests) *
        100
      : 0;

  const rejectionRate =
    totalRequests > 0
      ? (rejectedPayments /
          totalRequests) *
        100
      : 0;

  const averageRevenue =
    confirmedPayments > 0
      ? revenue /
        confirmedPayments
      : 0;

  const durationTotal =
    oneYearRequests +
    twoYearRequests;

  const oneYearShare =
    durationTotal > 0
      ? (oneYearRequests /
          durationTotal) *
        100
      : 0;

  const twoYearShare =
    durationTotal > 0
      ? (twoYearRequests /
          durationTotal) *
        100
      : 0;

  const metrics = [
    [
      "Taux de conversion",
      formatPercentage(
        conversionRate,
      ),
      "Dossiers devenus assurances disponibles.",
    ],
    [
      "Taux de refus",
      formatPercentage(
        rejectionRate,
      ),
      "Dossiers avec paiement refusé.",
    ],
    [
      "Panier moyen",
      formatCurrency(
        averageRevenue,
      ),
      "Revenu moyen par paiement confirmé.",
    ],
    [
      "Assurances 1 an",
      formatPercentage(
        oneYearShare,
      ),
      `${oneYearRequests.toLocaleString(
        "fr-FR",
      )} dossier(s) ce mois.`,
    ],
    [
      "Assurances 2 ans",
      formatPercentage(
        twoYearShare,
      ),
      `${twoYearRequests.toLocaleString(
        "fr-FR",
      )} dossier(s) ce mois.`,
    ],
    [
      "Paiements confirmés",
      confirmedPayments.toLocaleString(
        "fr-FR",
      ),
      "Paiements validés sur la période.",
    ],
  ];

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.5rem] sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
        Performance
      </p>

      <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:mt-2 sm:text-xl">
        Analyse du mois
      </h2>

      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
        {metrics.map(
          ([
            label,
            value,
            description,
          ]) => (
            <div
              key={label}
              className="min-w-0 rounded-xl border border-slate-100 bg-[#FAFCFA] p-4 sm:rounded-2xl sm:p-5"
            >
              <p className="text-[13px] font-medium leading-5 text-slate-500 sm:text-sm">
                {label}
              </p>

              <p className="mt-1.5 break-words text-xl font-semibold leading-tight tracking-[-0.03em] text-[#102B20] sm:mt-2 sm:text-2xl">
                {value}
              </p>

              <p className="mt-1.5 break-words text-[11px] leading-4 text-slate-400 sm:mt-2 sm:text-xs sm:leading-5">
                {description}
              </p>
            </div>
          ),
        )}
      </div>
    </section>
  );
}