import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Landmark,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import InsuranceCompanySettings from "@/components/admin/accounting/InsuranceCompanySettings";
import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type CompanyRow = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type DepositRow = {
  id: string;
  insurance_company_id: string;
  amount: number | string;
  deposit_date: string;
  payment_method: string | null;
  reference: string | null;
  note: string | null;
  created_at: string;
};

type RequestRow = {
  id: string;
  request_code: string;
  calculated_age: number | null;
  insurance_duration_years: number | null;
  actual_insurance_cost: number | string | null;
  insurance_cost_rate_id: string | null;
  status: string;
};

type PaymentRow = {
  request_id: string;
  expected_amount: number | string | null;
  status: string;
};

type RateRow = {
  id: string;
  min_age: number;
  max_age: number;
  duration_years: number;
  real_cost: number | string;
  effective_from: string;
  is_active: boolean;
  created_at: string;
};

function toNumber(
  value: number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} TL`;
}

function formatPercentage(value: number) {
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })} %`;
}

function formatDate(value: string) {
  const dateOnly = value.slice(0, 10);
  const [year, month, day] =
    dateOnly.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export default async function InsuranceCompanyPage({
  params,
}: PageProps) {
  await requireRole(["admin"]);

  const { id } = await params;
  const serviceClient = createServiceClient();

  const {
    data: companyData,
    error: companyError,
  } = await serviceClient
    .from("insurance_companies")
    .select(`
      id,
      name,
      is_active,
      created_at,
      updated_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (companyError || !companyData) {
    return (
      <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
            <h1 className="text-lg font-black text-red-800">
              Assureur introuvable
            </h1>

            <p className="mt-2 text-sm text-red-700">
              Cette compagnie n’existe pas ou n’est plus disponible.
            </p>

            <Link
              href="/admin/comptabilite"
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-red-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la comptabilité
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const company =
    companyData as CompanyRow;

  const [
    depositsResult,
    requestsResult,
    ratesResult,
  ] = await Promise.all([
    serviceClient
      .from("insurance_company_deposits")
      .select(`
        id,
        insurance_company_id,
        amount,
        deposit_date,
        payment_method,
        reference,
        note,
        created_at
      `)
      .eq("insurance_company_id", id)
      .order("deposit_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      }),

    serviceClient
      .from("insurance_requests")
      .select(`
        id,
        request_code,
        calculated_age,
        insurance_duration_years,
        actual_insurance_cost,
        insurance_cost_rate_id,
        status
      `)
      .eq("insurance_company_id", id)
      .order("insurance_company_selected_at", {
        ascending: false,
      }),

    serviceClient
      .from("insurance_cost_rates")
      .select(`
        id,
        min_age,
        max_age,
        duration_years,
        real_cost,
        effective_from,
        is_active,
        created_at
      `)
      .eq("insurance_company_id", id)
      .order("effective_from", {
        ascending: false,
      })
      .order("min_age", {
        ascending: true,
      })
      .order("duration_years", {
        ascending: true,
      }),
  ]);

  if (depositsResult.error) {
    throw new Error(
      depositsResult.error.message,
    );
  }

  if (requestsResult.error) {
    throw new Error(
      requestsResult.error.message,
    );
  }

  if (ratesResult.error) {
    throw new Error(
      ratesResult.error.message,
    );
  }

  const deposits =
    (depositsResult.data ?? []) as DepositRow[];

  const requests =
    (requestsResult.data ?? []) as RequestRow[];

  const rates =
    (ratesResult.data ?? []) as RateRow[];

  const requestIds =
    requests.map((request) => request.id);

  let confirmedPayments: PaymentRow[] = [];

  if (requestIds.length > 0) {
    const {
      data: paymentsData,
      error: paymentsError,
    } = await serviceClient
      .from("payments")
      .select(`
        request_id,
        expected_amount,
        status
      `)
      .in("request_id", requestIds)
      .eq("status", "confirmed");

    if (paymentsError) {
      throw new Error(
        paymentsError.message,
      );
    }

    confirmedPayments =
      (paymentsData ?? []) as PaymentRow[];
  }

  const revenueByRequest =
    new Map<string, number>();

  confirmedPayments.forEach((payment) => {
    const current =
      revenueByRequest.get(
        payment.request_id,
      ) ?? 0;

    revenueByRequest.set(
      payment.request_id,
      current +
        toNumber(payment.expected_amount),
    );
  });

  const totalDeposits =
    deposits.reduce(
      (total, deposit) =>
        total + toNumber(deposit.amount),
      0,
    );

  const availableRequests =
    requests.filter(
      (request) =>
        request.status ===
        "policy_available",
    );

  const consumedCosts =
    availableRequests.reduce(
      (total, request) =>
        total +
        toNumber(
          request.actual_insurance_cost,
        ),
      0,
    );

  const estimatedBalance =
    totalDeposits - consumedCosts;

  const realizedRequests =
    availableRequests.filter(
      (request) =>
        revenueByRequest.has(request.id),
    );

  const realizedRevenue =
    realizedRequests.reduce(
      (total, request) =>
        total +
        (revenueByRequest.get(
          request.id,
        ) ?? 0),
      0,
    );

  const realizedCosts =
    realizedRequests.reduce(
      (total, request) =>
        total +
        toNumber(
          request.actual_insurance_cost,
        ),
      0,
    );

  const grossProfit =
    realizedRevenue - realizedCosts;

  const grossMargin =
    realizedRevenue > 0
      ? (grossProfit / realizedRevenue) *
        100
      : 0;

  const activeRates =
    rates.filter(
      (rate) => rate.is_active,
    ).length;

  return (
    <main className="w-full px-4 pb-10 pt-5 sm:px-6 sm:pt-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mx-auto w-full max-w-[1600px] space-y-7">
        <section>
          <Link
            href="/admin/comptabilite"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0B5D3B]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la comptabilité
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3F8F2] text-[#0B5D3B]">
                <Building2 className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Assureur
                </p>

                <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {company.name}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Suivi financier et historique de la compagnie.
                </p>
              </div>
            </div>

            <span
              className={[
                "inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-bold",
                company.is_active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500",
              ].join(" ")}
            >
              {company.is_active
                ? "Assureur actif"
                : "Assureur inactif"}
            </span>
          </div>
        </section>

        <InsuranceCompanySettings
          company={{
            id: company.id,
            name: company.name,
            isActive: company.is_active,
          }}
        />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total déposé"
            value={formatCurrency(
              totalDeposits,
            )}
            description={`${deposits.length.toLocaleString(
              "fr-FR",
            )} dépôt(s) enregistré(s)`}
            icon={Landmark}
          />

          <StatCard
            title="Coûts consommés"
            value={formatCurrency(
              consumedCosts,
            )}
            description={`${availableRequests.length.toLocaleString(
              "fr-FR",
            )} assurance(s) disponible(s)`}
            icon={ReceiptText}
          />

          <StatCard
            title="Solde estimé"
            value={formatCurrency(
              estimatedBalance,
            )}
            description="Dépôts moins assurances consommées"
            icon={WalletCards}
          />

          <StatCard
            title="CA réalisé"
            value={formatCurrency(
              realizedRevenue,
            )}
            description={`${realizedRequests.length.toLocaleString(
              "fr-FR",
            )} assurance(s) disponible(s) et payée(s)`}
            icon={CircleDollarSign}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStatCard
            title="Bénéfice brut"
            value={formatCurrency(
              grossProfit,
            )}
            icon={TrendingUp}
          />

          <MiniStatCard
            title="Marge"
            value={formatPercentage(
              grossMargin,
            )}
            icon={Banknote}
          />

          <MiniStatCard
            title="Tarifs actifs"
            value={activeRates.toLocaleString(
              "fr-FR",
            )}
            icon={ShieldCheck}
          />

          <MiniStatCard
            title="Dossiers liés"
            value={requests.length.toLocaleString(
              "fr-FR",
            )}
            icon={Building2}
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Assurances consommées
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Le coût est comptabilisé uniquement lorsque la police est disponible.
              </p>
            </div>
          </div>

          {availableRequests.length === 0 ? (
            <EmptyState
              title="Aucune assurance consommée"
              description="Les dossiers apparaîtront ici lorsqu’une police deviendra disponible."
            />
          ) : (
            <>
              <div className="space-y-3 p-4 md:hidden">
                {availableRequests.map(
                  (request) => (
                    <article
                      key={request.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/admin/dossiers/${request.id}`}
                          className="break-all font-black text-[#0B5D3B] hover:underline"
                        >
                          {request.request_code}
                        </Link>

                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          Disponible
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <MobileValue
                          label="Âge"
                          value={
                            request.calculated_age !==
                            null
                              ? `${request.calculated_age} ans`
                              : "—"
                          }
                        />

                        <MobileValue
                          label="Durée"
                          value={
                            request.insurance_duration_years
                              ? `${request.insurance_duration_years} an${
                                  request.insurance_duration_years >
                                  1
                                    ? "s"
                                    : ""
                                }`
                              : "—"
                          }
                        />

                        <MobileValue
                          label="Coût réel"
                          value={formatCurrency(
                            toNumber(
                              request.actual_insurance_cost,
                            ),
                          )}
                        />

                        <MobileValue
                          label="CA réalisé"
                          value={
                            revenueByRequest.has(
                              request.id,
                            )
                              ? formatCurrency(
                                  revenueByRequest.get(
                                    request.id,
                                  ) ?? 0,
                                )
                              : "Non encaissé"
                          }
                        />
                      </div>
                    </article>
                  ),
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-6 py-3">
                        Matricule
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Âge
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Durée
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Coût réel
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        CA réalisé
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Bénéfice
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {availableRequests.map(
                      (request) => {
                        const revenue =
                          revenueByRequest.get(
                            request.id,
                          );

                        const cost =
                          toNumber(
                            request.actual_insurance_cost,
                          );

                        return (
                          <tr
                            key={request.id}
                            className="text-slate-700"
                          >
                            <td className="whitespace-nowrap px-6 py-4">
                              <Link
                                href={`/admin/dossiers/${request.id}`}
                                className="font-black text-[#0B5D3B] hover:underline"
                              >
                                {request.request_code}
                              </Link>
                            </td>

                            <td className="whitespace-nowrap px-6 py-4">
                              {request.calculated_age ??
                                "—"}
                            </td>

                            <td className="whitespace-nowrap px-6 py-4">
                              {request.insurance_duration_years
                                ? `${request.insurance_duration_years} an${
                                    request.insurance_duration_years >
                                    1
                                      ? "s"
                                      : ""
                                  }`
                                : "—"}
                            </td>

                            <td className="whitespace-nowrap px-6 py-4 font-bold">
                              {formatCurrency(
                                cost,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-6 py-4">
                              {revenue !==
                              undefined
                                ? formatCurrency(
                                    revenue,
                                  )
                                : "Non encaissé"}
                            </td>

                            <td className="whitespace-nowrap px-6 py-4 font-bold text-emerald-700">
                              {revenue !==
                              undefined
                                ? formatCurrency(
                                    revenue -
                                      cost,
                                  )
                                : "—"}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-950">
              Historique des dépôts
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Toutes les avances enregistrées auprès de cet assureur.
            </p>
          </div>

          {deposits.length === 0 ? (
            <EmptyState
              title="Aucun dépôt"
              description="Aucune avance n’a encore été enregistrée pour cet assureur."
            />
          ) : (
            <>
              <div className="space-y-3 p-4 md:hidden">
                {deposits.map(
                  (deposit) => (
                    <article
                      key={deposit.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-slate-900">
                          {formatDate(
                            deposit.deposit_date,
                          )}
                        </p>

                        <p className="font-black text-emerald-700">
                          {formatCurrency(
                            toNumber(
                              deposit.amount,
                            ),
                          )}
                        </p>
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
                  ),
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-6 py-3">
                        Date
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Montant
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Mode
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
                    {deposits.map(
                      (deposit) => (
                        <tr
                          key={deposit.id}
                          className="text-slate-700"
                        >
                          <td className="whitespace-nowrap px-6 py-4">
                            {formatDate(
                              deposit.deposit_date,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 font-black text-emerald-700">
                            {formatCurrency(
                              toNumber(
                                deposit.amount,
                              ),
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
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Tarifs
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Historique des coûts réels enregistrés pour cette compagnie.
              </p>
            </div>

            <Link
              href="/admin/comptabilite/tarifs"
              className="inline-flex min-h-10 w-fit items-center justify-center rounded-xl border border-[#0B5D3B]/20 bg-[#F3F8F2] px-4 text-sm font-bold text-[#0B5D3B] transition hover:border-[#0B5D3B]"
            >
              Gérer les tarifs
            </Link>
          </div>

          {rates.length === 0 ? (
            <EmptyState
              title="Aucun tarif"
              description="Aucune grille tarifaire n’a encore été enregistrée pour cet assureur."
            />
          ) : (
            <>
              <div className="space-y-3 p-4 md:hidden">
                {rates.map((rate) => (
                  <article
                    key={rate.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">
                          {rate.min_age} –{" "}
                          {rate.max_age} ans
                        </p>

                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Dès le{" "}
                          {formatDate(
                            rate.effective_from,
                          )}
                        </p>
                      </div>

                      <span
                        className={[
                          "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                          rate.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {rate.is_active
                          ? "Actif"
                          : "Inactif"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <MobileValue
                        label="Durée"
                        value={`${rate.duration_years} an${
                          rate.duration_years >
                          1
                            ? "s"
                            : ""
                        }`}
                      />

                      <MobileValue
                        label="Coût réel"
                        value={formatCurrency(
                          toNumber(
                            rate.real_cost,
                          ),
                        )}
                      />
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[800px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-6 py-3">
                        Tranche d’âge
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Durée
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Coût réel
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Entrée en vigueur
                      </th>
                      <th className="whitespace-nowrap px-6 py-3">
                        Statut
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rates.map((rate) => (
                      <tr
                        key={rate.id}
                        className="text-slate-700"
                      >
                        <td className="whitespace-nowrap px-6 py-4 font-bold text-slate-900">
                          {rate.min_age} –{" "}
                          {rate.max_age} ans
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          {rate.duration_years} an
                          {rate.duration_years >
                          1
                            ? "s"
                            : ""}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 font-black">
                          {formatCurrency(
                            toNumber(
                              rate.real_cost,
                            ),
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          {formatDate(
                            rate.effective_from,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={[
                              "rounded-full px-2.5 py-1 text-xs font-bold",
                              rate.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500",
                            ].join(" ")}
                          >
                            {rate.is_active
                              ? "Actif"
                              : "Inactif"}
                          </span>
                        </td>
                      </tr>
                    ))}
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

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-8 text-center sm:p-12">
      <ShieldCheck className="mx-auto h-9 w-9 text-slate-300" />

      <p className="mt-3 font-semibold text-slate-700">
        {title}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}
