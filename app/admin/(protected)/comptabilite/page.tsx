import {
  Banknote,
  Building2,
  CircleDollarSign,
  Landmark,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import AccountingActions from "@/components/admin/accounting/AccountingActions";
import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type PaymentRow = {
  request_id: string;
  expected_amount: number | string | null;
  status: string;
  verified_at: string | null;
};

type RequestRow = {
  id: string;
  request_code: string;
  calculated_age: number | null;
  insurance_duration_years: number | null;
  calculated_price: number | string | null;
  actual_insurance_cost: number | string | null;
  insurance_company_id: string | null;
  insurance_cost_rate_id: string | null;
  source: string | null;
  partner_id: string | null;
  status: string;
};

type InsuranceCompanyRow = {
  id: string;
  name: string;
  is_active: boolean;
};

type DepositRow = {
  id: string;
  insurance_company_id: string;
  amount: number | string;
  deposit_date: string;
  payment_method: string | null;
  reference: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

type InsuranceCostRateRow = {
  id: string;
  min_age: number;
  max_age: number;
};

function toNumber(
  value:
    | number
    | string
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : 0;
}

function formatCurrency(
  value: number,
) {
  return `${value.toLocaleString(
    "fr-FR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  )} TL`;
}

function formatPercentage(
  value: number,
) {
  return `${value.toLocaleString(
    "fr-FR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    },
  )} %`;
}

function formatDepositDate(
  value: string,
) {
  const parts =
    value.split("-");

  if (
    parts.length !== 3
  ) {
    return value;
  }

  const [
    year,
    month,
    day,
  ] = parts;

  return `${day}/${month}/${year}`;
}

export default async function ComptabilitePage() {
  await requireRole([
    "admin",
  ]);

  const serviceClient =
    createServiceClient();

  const [
    paymentsResult,
    requestsResult,
    companiesResult,
    depositsResult,
    ratesResult,
  ] = await Promise.all([
    serviceClient
      .from("payments")
      .select(`
        request_id,
        expected_amount,
        status,
        verified_at
      `)
      .eq(
        "status",
        "confirmed",
      ),

    serviceClient
      .from(
        "insurance_requests",
      )
      .select(`
        id,
        request_code,
        calculated_age,
        insurance_duration_years,
        calculated_price,
        actual_insurance_cost,
        insurance_company_id,
        insurance_cost_rate_id,
        source,
        partner_id,
        status
      `),

    serviceClient
      .from(
        "insurance_companies",
      )
      .select(`
        id,
        name,
        is_active
      `)
      .order(
        "name",
        {
          ascending: true,
        },
      ),

    serviceClient
      .from(
        "insurance_company_deposits",
      )
      .select(`
        id,
        insurance_company_id,
        amount,
        deposit_date,
        payment_method,
        reference,
        note,
        created_by,
        created_at
      `)
      .order(
        "deposit_date",
        {
          ascending: false,
        },
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),

    serviceClient
      .from(
        "insurance_cost_rates",
      )
      .select(`
        id,
        min_age,
        max_age
      `),
  ]);

  if (
    paymentsResult.error
  ) {
    throw new Error(
      paymentsResult.error.message,
    );
  }

  if (
    requestsResult.error
  ) {
    throw new Error(
      requestsResult.error.message,
    );
  }

  if (
    companiesResult.error
  ) {
    throw new Error(
      companiesResult.error.message,
    );
  }

  if (
    depositsResult.error
  ) {
    throw new Error(
      depositsResult.error.message,
    );
  }

  if (
    ratesResult.error
  ) {
    throw new Error(
      ratesResult.error.message,
    );
  }

  const confirmedPayments =
    (paymentsResult.data ??
      []) as PaymentRow[];

  const requests =
    (requestsResult.data ??
      []) as RequestRow[];

  const companies =
    (companiesResult.data ??
      []) as InsuranceCompanyRow[];

  const deposits =
    (depositsResult.data ??
      []) as DepositRow[];

  const rates =
    (ratesResult.data ??
      []) as InsuranceCostRateRow[];

  const ratesById =
    new Map(
      rates.map(
        (rate) => [
          rate.id,
          rate,
        ],
      ),
    );

  const revenueByRequest =
    new Map<
      string,
      number
    >();

  confirmedPayments.forEach(
    (payment) => {
      const current =
        revenueByRequest.get(
          payment.request_id,
        ) ?? 0;

      revenueByRequest.set(
        payment.request_id,
        current +
          toNumber(
            payment.expected_amount,
          ),
      );
    },
  );

  const confirmedRequestIds =
    new Set(
      revenueByRequest.keys(),
    );

  const paidRequests =
    requests.filter(
      (request) =>
        confirmedRequestIds.has(
          request.id,
        ),
    );

  const totalCollected =
    Array.from(
      revenueByRequest.values(),
    ).reduce(
      (
        total,
        amount,
      ) =>
        total +
        amount,
      0,
    );

  const availableRequests =
    requests.filter(
      (request) =>
        request.status ===
        "policy_available",
    );

  const realizedRequests =
    availableRequests.filter(
      (request) =>
        confirmedRequestIds.has(
          request.id,
        ),
    );

  const realizedRevenue =
    realizedRequests.reduce(
      (
        total,
        request,
      ) =>
        total +
        (revenueByRequest.get(
          request.id,
        ) ?? 0),
      0,
    );

  const totalRealCost =
    realizedRequests.reduce(
      (
        total,
        request,
      ) =>
        total +
        toNumber(
          request.actual_insurance_cost,
        ),
      0,
    );

  const grossProfit =
    realizedRevenue -
    totalRealCost;

  const grossMargin =
    realizedRevenue > 0
      ? (grossProfit /
          realizedRevenue) *
        100
      : 0;

  const collectedInsuranceCount =
    confirmedRequestIds.size;

  const realizedInsuranceCount =
    realizedRequests.length;

  const averageBasket =
    realizedInsuranceCount > 0
      ? realizedRevenue /
        realizedInsuranceCount
      : 0;

  const oneYearRequests =
    requests.filter(
      (request) =>
        request.insurance_duration_years ===
        1,
    );

  const twoYearRequests =
    requests.filter(
      (request) =>
        request.insurance_duration_years ===
        2,
    );

  function calculateGroupStats(
    rows: RequestRow[],
  ) {
    const soldRows =
      rows.filter(
        (request) =>
          request.status ===
            "policy_available" &&
          confirmedRequestIds.has(
            request.id,
          ),
      );

    const revenue =
      soldRows.reduce(
        (
          total,
          request,
        ) =>
          total +
          (revenueByRequest.get(
            request.id,
          ) ?? 0),
        0,
      );

    const cost =
      soldRows.reduce(
        (
          total,
          request,
        ) =>
          total +
          toNumber(
            request.actual_insurance_cost,
          ),
        0,
      );

    const profit =
      revenue -
      cost;

    const margin =
      revenue > 0
        ? (profit /
            revenue) *
          100
        : 0;

    return {
      count:
        soldRows.length,
      revenue,
      cost,
      profit,
      margin,
    };
  }

  const oneYearStats =
    calculateGroupStats(
      oneYearRequests,
    );

  const twoYearStats =
    calculateGroupStats(
      twoYearRequests,
    );

  const ageGroupsMap =
    new Map<
      string,
      {
        minAge: number;
        maxAge: number;
        rows: RequestRow[];
      }
    >();

  realizedRequests.forEach(
    (request) => {
      if (
        !request.insurance_cost_rate_id
      ) {
        return;
      }

      const rate =
        ratesById.get(
          request.insurance_cost_rate_id,
        );

      if (!rate) {
        return;
      }

      const key =
        `${rate.min_age}-${rate.max_age}`;

      const existing =
        ageGroupsMap.get(key);

      if (existing) {
        existing.rows.push(request);
        return;
      }

      ageGroupsMap.set(key, {
        minAge: rate.min_age,
        maxAge: rate.max_age,
        rows: [request],
      });
    },
  );

  const ageGroupStats =
    Array.from(
      ageGroupsMap.values(),
    )
      .map((group) => ({
        minAge: group.minAge,
        maxAge: group.maxAge,
        ...calculateGroupStats(
          group.rows,
        ),
      }))
      .sort(
        (a, b) =>
          a.minAge - b.minAge ||
          a.maxAge - b.maxAge,
      );

  const legacyAvailableWithoutRate =
    realizedRequests.filter(
      (request) =>
        !request.insurance_cost_rate_id ||
        !ratesById.has(
          request.insurance_cost_rate_id,
        ),
    ).length;

  const totalDeposits =
    deposits.reduce(
      (
        total,
        deposit,
      ) =>
        total +
        toNumber(
          deposit.amount,
        ),
      0,
    );

  const consumedRealCosts =
    availableRequests.reduce(
      (
        total,
        request,
      ) =>
        total +
        toNumber(
          request.actual_insurance_cost,
        ),
      0,
    );

  const estimatedCompanyBalance =
    totalDeposits -
    consumedRealCosts;

  const activeCompanies =
    companies.filter(
      (company) =>
        company.is_active,
    );

  const companyStats =
    companies.map(
      (company) => {
        const companyDeposits =
          deposits
            .filter(
              (deposit) =>
                deposit.insurance_company_id ===
                company.id,
            )
            .reduce(
              (
                total,
                deposit,
              ) =>
                total +
                toNumber(
                  deposit.amount,
                ),
              0,
            );

        const companyRequests =
          requests.filter(
            (request) =>
              request.insurance_company_id ===
              company.id,
          );

        const companyAvailableRequests =
          companyRequests.filter(
            (request) =>
              request.status ===
              "policy_available",
          );

        const companyCosts =
          companyAvailableRequests.reduce(
            (
              total,
              request,
            ) =>
              total +
              toNumber(
                request.actual_insurance_cost,
              ),
            0,
          );

        const companyPaidRequests =
          companyAvailableRequests.filter(
            (request) =>
              confirmedRequestIds.has(
                request.id,
              ),
          );

        const companyRevenue =
          companyPaidRequests.reduce(
            (
              total,
              request,
            ) =>
              total +
              (revenueByRequest.get(
                request.id,
              ) ?? 0),
            0,
          );

        const companyPaidCosts =
          companyPaidRequests.reduce(
            (
              total,
              request,
            ) =>
              total +
              toNumber(
                request.actual_insurance_cost,
              ),
            0,
          );

        return {
          id:
            company.id,

          name:
            company.name,

          active:
            company.is_active,

          deposits:
            companyDeposits,

          consumed:
            companyCosts,

          balance:
            companyDeposits -
            companyCosts,

          sold:
            companyPaidRequests.length,

          revenue:
            companyRevenue,

          profit:
            companyRevenue -
            companyPaidCosts,
        };
      },
    );

  return (
    <main className="w-full px-4 pb-10 pt-5 sm:px-6 sm:pt-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mx-auto w-full max-w-[1600px] space-y-7">
        {/* HEADER */}

        <section className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Comptabilité
              </h1>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Suivez les ventes,
                les coûts réels,
                les bénéfices,
                les dépôts et
                les soldes des
                assureurs.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <ShieldCheck className="h-4 w-4" />

              Réservé à
              l’administration
            </div>
          </div>
        </section>

        {/* PRINCIPAUX INDICATEURS */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Encaissements clients"
            value={formatCurrency(
              totalCollected,
            )}
            description={`${collectedInsuranceCount.toLocaleString(
              "fr-FR",
            )} paiement(s) confirmé(s)`}
            icon={
              CircleDollarSign
            }
          />

          <StatCard
            title="CA réalisé"
            value={formatCurrency(
              realizedRevenue,
            )}
            description={`${realizedInsuranceCount.toLocaleString(
              "fr-FR",
            )} assurance(s) disponible(s) et payée(s)`}
            icon={ReceiptText}
          />

          <StatCard
            title="Bénéfice brut"
            value={formatCurrency(
              grossProfit,
            )}
            description={`Marge ${formatPercentage(
              grossMargin,
            )}`}
            icon={TrendingUp}
          />

          <StatCard
            title="Panier moyen"
            value={formatCurrency(
              averageBasket,
            )}
            description="Par assurance disponible et payée"
            icon={Banknote}
          />
        </section>

        {/* TRÉSORERIE ASSUREURS */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStatCard
            title="Dépôts assureurs"
            value={formatCurrency(
              totalDeposits,
            )}
            icon={Landmark}
          />

          <MiniStatCard
            title="Coûts consommés"
            value={formatCurrency(
              totalRealCost,
            )}
            icon={ReceiptText}
          />

          <MiniStatCard
            title="Solde assureurs estimé"
            value={formatCurrency(
              estimatedCompanyBalance,
            )}
            icon={WalletCards}
          />

          <MiniStatCard
            title="Assureurs actifs"
            value={activeCompanies.length.toLocaleString(
              "fr-FR",
            )}
            icon={Building2}
          />
        </section>

        {/* GESTION COMPTABLE */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-950">
              Gestion comptable
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Gérez les assureurs,
              les tarifs et les dépôts
              depuis cette rubrique.
            </p>
          </div>

          <AccountingActions />
        </section>

        {/* RENTABILITÉ PAR DURÉE */}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Rentabilité par
              durée
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Comparaison des
              assurances 1 an et
              2 ans.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DurationCard
              title="Assurance 1 an"
              stats={
                oneYearStats
              }
            />

            <DurationCard
              title="Assurance 2 ans"
              stats={
                twoYearStats
              }
            />
          </div>
        </section>

        {/* SITUATION PAR ASSUREUR */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-950">
              Situation par
              assureur
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Dépôts, consommation,
              solde et rentabilité
              par compagnie.
            </p>
          </div>

          {companyStats.length ===
          0 ? (
            <div className="p-8 text-center sm:p-12">
              <Building2 className="mx-auto h-9 w-9 text-slate-300" />

              <p className="mt-3 font-semibold text-slate-700">
                Aucun assureur
                enregistré
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Utilisez
                « Ajouter un
                assureur » pour
                commencer.
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE */}

              <div className="space-y-3 p-4 md:hidden">
                {companyStats.map(
                  (company) => (
                    <div
                      key={
                        company.id
                      }
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">
                            {
                              company.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              company.sold
                            }{" "}
                            vente(s)
                          </p>
                        </div>

                        <span
                          className={[
                            "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                            company.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          ].join(
                            " ",
                          )}
                        >
                          {company.active
                            ? "Actif"
                            : "Inactif"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <MobileValue
                          label="Dépôts"
                          value={formatCurrency(
                            company.deposits,
                          )}
                        />

                        <MobileValue
                          label="Solde"
                          value={formatCurrency(
                            company.balance,
                          )}
                        />

                        <MobileValue
                          label="CA"
                          value={formatCurrency(
                            company.revenue,
                          )}
                        />

                        <MobileValue
                          label="Bénéfice"
                          value={formatCurrency(
                            company.profit,
                          )}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>

              {/* TABLETTE / DESKTOP */}

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-6 py-3">
                        Assureur
                      </th>

                      <th className="whitespace-nowrap px-6 py-3">
                        Dépôts
                      </th>

                      <th className="whitespace-nowrap px-6 py-3">
                        Consommé
                      </th>

                      <th className="whitespace-nowrap px-6 py-3">
                        Solde
                      </th>

                      <th className="whitespace-nowrap px-6 py-3">
                        Ventes
                      </th>

                      <th className="whitespace-nowrap px-6 py-3">
                        CA
                      </th>

                      <th className="whitespace-nowrap px-6 py-3">
                        Bénéfice
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {companyStats.map(
                      (company) => (
                        <tr
                          key={
                            company.id
                          }
                          className="text-slate-700"
                        >
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="font-bold text-slate-900">
                              {
                                company.name
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {company.active
                                ? "Actif"
                                : "Inactif"}
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-6 py-4">
                            {formatCurrency(
                              company.deposits,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4">
                            {formatCurrency(
                              company.consumed,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 font-bold">
                            {formatCurrency(
                              company.balance,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4">
                            {
                              company.sold
                            }
                          </td>

                          <td className="whitespace-nowrap px-6 py-4">
                            {formatCurrency(
                              company.revenue,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 font-bold text-emerald-700">
                            {formatCurrency(
                              company.profit,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* HISTORIQUE DES DÉPÔTS ASSUREURS */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-950">
              Historique des dépôts assureurs
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Retrouvez chaque avance enregistrée auprès des compagnies
              d’assurance, de la plus récente à la plus ancienne.
            </p>
          </div>

          {deposits.length === 0 ? (
            <div className="p-8 text-center sm:p-12">
              <Landmark className="mx-auto h-9 w-9 text-slate-300" />

              <p className="mt-3 font-semibold text-slate-700">
                Aucun dépôt enregistré
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Les dépôts ajoutés depuis la gestion comptable apparaîtront ici.
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE */}

              <div className="space-y-3 p-4 md:hidden">
                {deposits.map((deposit) => {
                  const company =
                    companies.find(
                      (item) =>
                        item.id ===
                        deposit.insurance_company_id,
                    );

                  return (
                    <article
                      key={deposit.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-bold text-slate-900">
                            {company?.name ?? "Assureur inconnu"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDepositDate(deposit.deposit_date)}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {formatCurrency(
                            toNumber(deposit.amount),
                          )}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <MobileValue
                          label="Mode de paiement"
                          value={
                            deposit.payment_method?.trim() ||
                            "—"
                          }
                        />

                        <MobileValue
                          label="Référence"
                          value={
                            deposit.reference?.trim() ||
                            "—"
                          }
                        />

                        <div className="sm:col-span-2">
                          <MobileValue
                            label="Note"
                            value={
                              deposit.note?.trim() ||
                              "—"
                            }
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* TABLETTE / DESKTOP */}

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[1050px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-6 py-3">
                        Date
                      </th>

                      <th className="whitespace-nowrap px-6 py-3">
                        Assureur
                      </th>

                      <th className="whitespace-nowrap px-6 py-3">
                        Montant
                      </th>

                      <th className="whitespace-nowrap px-6 py-3">
                        Mode de paiement
                      </th>

                      <th className="whitespace-nowrap px-6 py-3">
                        Référence
                      </th>

                      <th className="px-6 py-3">
                        Note
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {deposits.map((deposit) => {
                      const company =
                        companies.find(
                          (item) =>
                            item.id ===
                            deposit.insurance_company_id,
                        );

                      return (
                        <tr
                          key={deposit.id}
                          className="text-slate-700"
                        >
                          <td className="whitespace-nowrap px-6 py-4">
                            {formatDepositDate(
                              deposit.deposit_date,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 font-bold text-slate-900">
                            {company?.name ??
                              "Assureur inconnu"}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 font-black text-emerald-700">
                            {formatCurrency(
                              toNumber(deposit.amount),
                            )}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4">
                            {deposit.payment_method?.trim() ||
                              "—"}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4">
                            {deposit.reference?.trim() ||
                              "—"}
                          </td>

                          <td className="max-w-[360px] break-words px-6 py-4">
                            {deposit.note?.trim() ||
                              "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* RENTABILITÉ PAR ÂGE */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-950">
              Rentabilité par tranche d’âge
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Analyse basée sur la tranche tarifaire
              exacte figée lors du choix de l’assureur.
            </p>
          </div>

          {legacyAvailableWithoutRate > 0 ? (
            <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 sm:px-6">
              {legacyAvailableWithoutRate.toLocaleString(
                "fr-FR",
              )}{" "}
              dossier(s) historique(s) disponible(s)
              ne possèdent pas de tarif figé et ne sont
              donc pas inclus dans cette analyse.
            </div>
          ) : null}

          {ageGroupStats.length === 0 ? (
            <div className="p-8 text-center sm:p-12">
              <p className="font-semibold text-slate-700">
                Aucune tranche tarifaire à analyser
                pour le moment.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Les statistiques apparaîtront après
                la finalisation de nouvelles assurances
                utilisant un tarif figé.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-4 md:hidden">
                {ageGroupStats.map(
                  (group) => (
                    <div
                      key={`${group.minAge}-${group.maxAge}`}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <p className="font-black text-slate-950">
                        {group.minAge} – {group.maxAge} ans
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <MobileValue
                          label="Dossiers"
                          value={group.count.toLocaleString(
                            "fr-FR",
                          )}
                        />
                        <MobileValue
                          label="CA réalisé"
                          value={formatCurrency(
                            group.revenue,
                          )}
                        />
                        <MobileValue
                          label="Coût réel"
                          value={formatCurrency(
                            group.cost,
                          )}
                        />
                        <MobileValue
                          label="Bénéfice"
                          value={formatCurrency(
                            group.profit,
                          )}
                        />
                        <MobileValue
                          label="Marge"
                          value={formatPercentage(
                            group.margin,
                          )}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-6 py-3">
                        Tranche d’âge
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Dossiers
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        CA réalisé
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Coût réel
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Bénéfice
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Marge
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {ageGroupStats.map(
                      (group) => (
                        <tr
                          key={`${group.minAge}-${group.maxAge}`}
                          className="text-slate-700"
                        >
                          <td className="whitespace-nowrap px-6 py-4 font-bold text-slate-900">
                            {group.minAge} – {group.maxAge} ans
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            {group.count.toLocaleString(
                              "fr-FR",
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            {formatCurrency(
                              group.revenue,
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            {formatCurrency(
                              group.cost,
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 font-bold text-emerald-700">
                            {formatCurrency(
                              group.profit,
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 font-bold">
                            {formatPercentage(
                              group.margin,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Banknote;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F8F2] text-[#0B5D3B]">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}

function MiniStatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: typeof Banknote;
}) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">
          {title}
        </p>

        <p className="mt-1 break-words text-lg font-black text-slate-950">
          {value}
        </p>
      </div>
    </article>
  );
}

function DurationCard({
  title,
  stats,
}: {
  title: string;
  stats: {
    count: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  };
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[#0B5D3B]" />

        <h3 className="font-bold text-slate-950">
          {title}
        </h3>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DataItem
          label="Dossiers"
          value={stats.count.toLocaleString(
            "fr-FR",
          )}
        />

        <DataItem
          label="CA"
          value={formatCurrency(
            stats.revenue,
          )}
        />

        <DataItem
          label="Coût"
          value={formatCurrency(
            stats.cost,
          )}
        />

        <DataItem
          label="Bénéfice"
          value={formatCurrency(
            stats.profit,
          )}
        />

        <DataItem
          label="Marge"
          value={formatPercentage(
            stats.margin,
          )}
        />
      </div>
    </article>
  );
}

function DataItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black text-slate-900 sm:text-base">
        {value}
      </p>
    </div>
  );
}

function MobileValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}