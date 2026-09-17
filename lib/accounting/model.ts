import { isValidDate } from "@/lib/validation/date";

export type Company = {
  id: string;
  name: string;
  is_active: boolean;
  updated_at: string;
};

export type Rate = {
  id: string;
  insurance_company_id: string;
  min_age: number;
  max_age: number;
  duration_years: number;
  real_cost: number | string;
  effective_from: string;
  is_active: boolean;
  updated_at: string;
};

export type Deposit = {
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

export type Withdrawal = {
  id: string;
  insurance_company_id: string;
  amount: number | string;
  withdrawal_date: string;
  reason: string;
  reference: string | null;
  created_by: string;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
};

export type Dossier = {
  id: string;
  request_code: string;

  partner_id: string | null;

  insurance_company_id: string | null;
  calculated_age: number | null;
  insurance_duration_years: number | null;
  actual_insurance_cost: number | string | null;
  insurance_company_selected_at: string | null;
  status: string;
};

export type Payment = {
  id: string;
  request_id: string;
  expected_amount: number | string | null;
  status: string;
  verified_at: string | null;
};

export type History = {
  id: string;

  type:
    | "withdrawal"
    | "withdrawal_cancelled"
    | "deposit"
    | "payment"
    | "policy"
    | "rate";

  occurred_at: string;

  insurance_company_id: string | null;

  request_id: string | null;
  request_code: string | null;

  origin: "client" | "partner" | null;

  partner_id: string | null;
  partner_name: string | null;

  title: string;
  description: string;

  amount: number | string | null;

  direction: "in" | "out" | "neutral";

  author_id: string | null;
};

export type AccountingData = {
  missingTables?: string[];
  companies: Company[];
  rates: Rate[];
  deposits: Deposit[];
  withdrawals?: Withdrawal[];
  nationalityRates?: import("@/lib/insurance/nationalityRates").NationalityRate[];
  requests: Dossier[];
  payments: Payment[];
  history: History[];
  authors: Record<string, string>;
  loadedAt: string;
};

export type Filters = {
  from: string;
  to: string;
  company: string;
};

export function cents(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value !== "number" && typeof value !== "string")
  ) {
    return null;
  }

  const n = Number(value);

  if (
    !Number.isFinite(n) ||
    n < 0 ||
    !Number.isSafeInteger(Math.round(n * 100))
  ) {
    return null;
  }

  return Math.round(n * 100);
}

export function money(value: number | null): string {
  return value === null
    ? "À compléter"
    : new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 2,
      }).format(value / 100);
}

export function day(value: string | null): string {
  if (!value) return "";

  if (isValidDate(value)) {
    return value;
  }

  const d = new Date(value);

  if (!Number.isFinite(d.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function dateLabel(value: string | null): string {
  const d = day(value);

  return d ? d.split("-").reverse().join("/") : "Date manquante";
}

export function inPeriod(value: string | null, f: Filters): boolean {
  const d = day(value);

  return (
    (!f.from && !f.to) ||
    (!!d && (!f.from || d >= f.from) && (!f.to || d <= f.to))
  );
}

function sum(values: (number | null)[]): number | null {
  if (values.some((value) => value === null)) {
    return null;
  }

  const total = values.reduce<number>(
    (accumulator, value) => accumulator + (value ?? 0),
    0,
  );

  return Number.isSafeInteger(total) ? total : null;
}

export function accounting(data: AccountingData, f: Filters) {
  const requests = data.requests.filter(
    (request) => !f.company || request.insurance_company_id === f.company,
  );

  const ids = new Set(requests.map((request) => request.id));

  const payments = data.payments.filter(
    (payment) =>
      payment.status === "confirmed" &&
      (!f.company || ids.has(payment.request_id)),
  );

  const periodPayments = payments.filter((payment) =>
    inPeriod(payment.verified_at, f),
  );

  const paid = new Map<string, (number | null)[]>();

  for (const payment of periodPayments) {
    paid.set(payment.request_id, [
      ...(paid.get(payment.request_id) ?? []),
      cents(payment.expected_amount),
    ]);
  }

  const dossiers = requests
    .filter((request) => paid.has(request.id))
    .map((request) => ({
      ...request,

      revenue: sum(paid.get(request.id)!),

      cost: cents(request.actual_insurance_cost),

      ageGroup:
        request.calculated_age === null
          ? "Âge inconnu"
          : `${Math.floor(request.calculated_age / 10) * 10}–${
              Math.floor(request.calculated_age / 10) * 10 + 9
            } ans`,
    }));

  const realized = dossiers.filter(
    (request) => request.status === "policy_available",
  );

  const revenue = sum(realized.map((request) => request.revenue));

  const cost = sum(realized.map((request) => request.cost));

  const deposits = data.deposits.filter(
    (deposit) => !f.company || deposit.insurance_company_id === f.company,
  );

  const horizon = f.to || day(data.loadedAt);

  const asOf = (value: string | null) =>
    !horizon || (!!day(value) && day(value) <= horizon);

  const cumulativeDeposits = deposits.filter((deposit) =>
    asOf(deposit.deposit_date),
  );

  const consumed = requests.filter(
    (request) =>
      request.status === "policy_available" &&
      asOf(request.insurance_company_selected_at),
  );

  const unknownCostDates = horizon
    ? requests.filter(
        (request) =>
          request.status === "policy_available" &&
          !day(request.insurance_company_selected_at),
      ).length
    : 0;

  const balanceCost = unknownCostDates
    ? null
    : sum(consumed.map((request) => cents(request.actual_insurance_cost)));

  const depositTotal = sum(
    cumulativeDeposits.map((deposit) => cents(deposit.amount)),
  );

  const withdrawals = (data.withdrawals ?? []).filter(
    (w) => !f.company || w.insurance_company_id === f.company,
  );
  const withdrawalTotal = data.missingTables?.includes(
    "insurance_company_withdrawals",
  )
    ? null
    : sum(
        withdrawals
          .filter(
            (w) =>
              asOf(w.withdrawal_date) &&
              (!w.cancelled_at || !asOf(w.cancelled_at)),
          )
          .map((w) => cents(w.amount)),
      );
  const periodWithdrawals = withdrawals.filter((w) =>
    inPeriod(w.withdrawal_date, f),
  );
  const periodDeposits = deposits.filter((deposit) =>
    inPeriod(deposit.deposit_date, f),
  );

  const paidIds = new Set(
    data.payments
      .filter((payment) => payment.status === "confirmed")
      .map((payment) => payment.request_id),
  );

  const missingCosts = requests.filter(
    (request) =>
      request.status === "policy_available" &&
      cents(request.actual_insurance_cost) === null,
  );

  const anomalies = [
    ...missingCosts.map((request) => ({
      id: request.id,
      code: request.request_code,
      label: "Coût réel manquant",
      kind: "dossier",
    })),

    ...requests
      .filter(
        (request) =>
          request.status === "policy_available" && !paidIds.has(request.id),
      )
      .map((request) => ({
        id: request.id,
        code: request.request_code,
        label: "Police disponible sans paiement confirmé",
        kind: "dossier",
      })),

    ...requests
      .filter(
        (request) =>
          request.status === "policy_available" &&
          !request.insurance_company_id,
      )
      .map((request) => ({
        id: request.id,
        code: request.request_code,
        label: "Assureur non renseigné",
        kind: "dossier",
      })),

    ...requests
      .filter(
        (request) => request.status === "cancelled" && paidIds.has(request.id),
      )
      .map((request) => ({
        id: request.id,
        code: request.request_code,
        label:
          "Dossier annulé avec paiement confirmé : vérifier le remboursement",
        kind: "dossier",
      })),

    ...payments
      .filter((payment) => !day(payment.verified_at))
      .map((payment) => ({
        id: payment.request_id,
        code:
          requests.find((request) => request.id === payment.request_id)
            ?.request_code ?? payment.request_id,
        label: "Date de confirmation manquante",
        kind: "dossier",
      })),

    ...payments
      .filter((payment) => cents(payment.expected_amount) === null)
      .map((payment) => ({
        id: payment.request_id,
        code:
          requests.find((request) => request.id === payment.request_id)
            ?.request_code ?? payment.request_id,
        label: "Montant du paiement manquant",
        kind: "dossier",
      })),

    ...requests
      .filter(
        (request) =>
          request.status === "policy_available" &&
          !day(request.insurance_company_selected_at),
      )
      .map((request) => ({
        id: request.id,
        code: request.request_code,
        label: "Date de sélection de l’assureur manquante",
        kind: "dossier",
      })),
  ];

  return {
    withdrawals: periodWithdrawals,
    cumulativeWithdrawals: withdrawalTotal,
    payments: periodPayments,

    dossiers,

    realized,

    deposits: periodDeposits,

    anomalies,

    collected: sum(
      periodPayments.map((payment) => cents(payment.expected_amount)),
    ),

    revenue,

    cost,

    profit: revenue === null || cost === null ? null : revenue - cost,

    depositFlow: sum(periodDeposits.map((deposit) => cents(deposit.amount))),

    cumulativeDeposits: depositTotal,

    consumed: balanceCost,

    balance:
      depositTotal === null || balanceCost === null || withdrawalTotal === null
        ? null
        : depositTotal - balanceCost - withdrawalTotal,

    committed: sum(
      requests
        .filter((request) => request.status === "policy_preparation")
        .map((request) => cents(request.actual_insurance_cost)),
    ),

    missingCosts: missingCosts.length,
  };
}

export function csvCell(value: unknown) {
  let text = String(value ?? "");

  if (/^[\s]*[=+@-]/.test(text)) {
    text = "'" + text;
  }

  return '"' + text.replaceAll('"', '""') + '"';
}

export function csv(rows: unknown[][]) {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
