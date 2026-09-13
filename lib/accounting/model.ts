import { isValidDate } from "@/lib/validation/date";
export type Company = { id: string; name: string; is_active: boolean; updated_at: string };
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
export type Dossier = {
  id: string;
  request_code: string;
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
  insurance_company_id: string;
  insurance_cost_rate_id: string;
  min_age: number;
  max_age: number;
  duration_years: number;
  real_cost: number | string;
  effective_from: string;
  is_active: boolean;
  changed_by: string | null;
  changed_at: string;
};
export type AccountingData = {
  companies: Company[];
  rates: Rate[];
  deposits: Deposit[];
  requests: Dossier[];
  payments: Payment[];
  history: History[];
  authors: Record<string, string>;
  loadedAt: string;
};
export type Filters = { from: string; to: string; company: string };
export function cents(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value !== "number" && typeof value !== "string")
  )
    return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isSafeInteger(Math.round(n * 100))) return null;
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
  if (isValidDate(value)) return value;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
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
  return (!f.from && !f.to) || (!!d && (!f.from || d >= f.from) && (!f.to || d <= f.to));
}
function sum(values: (number | null)[]): number | null {
  if (values.some((v) => v === null)) return null;
  const total = values.reduce<number>((a, b) => a + (b ?? 0), 0);
  return Number.isSafeInteger(total) ? total : null;
}
export function accounting(data: AccountingData, f: Filters) {
  const requests = data.requests.filter((r) => !f.company || r.insurance_company_id === f.company),
    ids = new Set(requests.map((r) => r.id));
  const payments = data.payments.filter(
    (p) => p.status === "confirmed" && (!f.company || ids.has(p.request_id)),
  );
  const periodPayments = payments.filter((p) => inPeriod(p.verified_at, f));
  const paid = new Map<string, (number | null)[]>();
  for (const p of periodPayments)
    paid.set(p.request_id, [...(paid.get(p.request_id) ?? []), cents(p.expected_amount)]);
  const dossiers = requests
    .filter((r) => paid.has(r.id))
    .map((r) => ({
      ...r,
      revenue: sum(paid.get(r.id)!),
      cost: cents(r.actual_insurance_cost),
      ageGroup:
        r.calculated_age === null
          ? "Âge inconnu"
          : `${Math.floor(r.calculated_age / 10) * 10}–${Math.floor(r.calculated_age / 10) * 10 + 9} ans`,
    }));
  const realized = dossiers.filter((r) => r.status === "policy_available");
  const revenue = sum(realized.map((r) => r.revenue)),
    cost = sum(realized.map((r) => r.cost));
  const deposits = data.deposits.filter((d) => !f.company || d.insurance_company_id === f.company);
  const horizon = f.to || day(data.loadedAt);
  const asOf = (value: string | null) => !horizon || (!!day(value) && day(value) <= horizon);
  const cumulativeDeposits = deposits.filter((d) => asOf(d.deposit_date));
  const consumed = requests.filter(
    (r) => r.status === "policy_available" && asOf(r.insurance_company_selected_at),
  );
  const unknownCostDates = horizon
    ? requests.filter(
        (r) => r.status === "policy_available" && !day(r.insurance_company_selected_at),
      ).length
    : 0;
  const balanceCost = unknownCostDates
    ? null
    : sum(consumed.map((r) => cents(r.actual_insurance_cost)));
  const depositTotal = sum(cumulativeDeposits.map((d) => cents(d.amount)));
  const periodDeposits = deposits.filter((d) => inPeriod(d.deposit_date, f));
  const paidIds = new Set(
    data.payments.filter((p) => p.status === "confirmed").map((p) => p.request_id),
  );
  const missingCosts = requests.filter(
    (r) => r.status === "policy_available" && cents(r.actual_insurance_cost) === null,
  );
  const anomalies = [
    ...missingCosts.map((r) => ({
      id: r.id,
      code: r.request_code,
      label: "Coût réel manquant",
      kind: "dossier",
    })),
    ...requests
      .filter((r) => r.status === "policy_available" && !paidIds.has(r.id))
      .map((r) => ({
        id: r.id,
        code: r.request_code,
        label: "Police disponible sans paiement confirmé",
        kind: "dossier",
      })),
    ...requests
      .filter((r) => r.status === "policy_available" && !r.insurance_company_id)
      .map((r) => ({
        id: r.id,
        code: r.request_code,
        label: "Assureur non renseigné",
        kind: "dossier",
      })),
    ...requests
      .filter((r) => r.status === "cancelled" && paidIds.has(r.id))
      .map((r) => ({
        id: r.id,
        code: r.request_code,
        label: "Dossier annulé avec paiement confirmé : vérifier le remboursement",
        kind: "dossier",
      })),
    ...payments
      .filter((p) => !day(p.verified_at))
      .map((p) => ({
        id: p.request_id,
        code: requests.find((r) => r.id === p.request_id)?.request_code ?? p.request_id,
        label: "Date de confirmation manquante",
        kind: "dossier",
      })),
    ...payments
      .filter((p) => cents(p.expected_amount) === null)
      .map((p) => ({
        id: p.request_id,
        code: requests.find((r) => r.id === p.request_id)?.request_code ?? p.request_id,
        label: "Montant du paiement manquant",
        kind: "dossier",
      })),
    ...requests
      .filter((r) => r.status === "policy_available" && !day(r.insurance_company_selected_at))
      .map((r) => ({
        id: r.id,
        code: r.request_code,
        label: "Date de sélection de l’assureur manquante",
        kind: "dossier",
      })),
  ];
  return {
    payments: periodPayments,
    dossiers,
    realized,
    deposits: periodDeposits,
    anomalies,
    collected: sum(periodPayments.map((p) => cents(p.expected_amount))),
    revenue,
    cost,
    profit: revenue === null || cost === null ? null : revenue - cost,
    depositFlow: sum(periodDeposits.map((d) => cents(d.amount))),
    cumulativeDeposits: depositTotal,
    consumed: balanceCost,
    balance: depositTotal === null || balanceCost === null ? null : depositTotal - balanceCost,
    committed: sum(
      requests
        .filter((r) => r.status === "policy_preparation")
        .map((r) => cents(r.actual_insurance_cost)),
    ),
    missingCosts: missingCosts.length,
  };
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function csv(rows: unknown[][]) {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
