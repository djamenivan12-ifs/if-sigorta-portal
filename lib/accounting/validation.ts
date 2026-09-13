import { isValidDate } from "@/lib/validation/date";
export class AccountingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new AccountingError("Les données envoyées sont invalides.");
  return value as Record<string, unknown>;
}
export function text(value: unknown, label: string, max = 200, optional = false): string | null {
  if (optional && (value === null || value === undefined || value === "")) return null;
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new AccountingError(
      `${label} : saisissez une valeur valide (maximum ${max} caractères).`,
    );
  return value.trim();
}
export function uuid(value: unknown) {
  const s = text(value, "Identifiant", 36)!;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s))
    throw new AccountingError("Identifiant invalide.");
  return s;
}
export function date(value: unknown) {
  if (!isValidDate(value))
    throw new AccountingError("Saisissez une date réelle au format jour/mois/année.");
  return value;
}
export function amount(value: unknown, zero = false) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < (zero ? 0 : 0.01) ||
    value > 999999999.99 ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.00001
  )
    throw new AccountingError("Le montant doit être valide, avec au maximum deux décimales.");
  return value;
}
export function age(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 10000)
    throw new AccountingError("L’âge doit être un entier positif.");
  return value;
}
export function bool(value: unknown) {
  if (typeof value !== "boolean") throw new AccountingError("Le statut est invalide.");
  return value;
}
export function version(value: unknown) {
  if (typeof value !== "string" || !Number.isFinite(new Date(value).getTime()))
    throw new AccountingError("Rechargez la page avant de modifier cette ligne.", 409);
  return value;
}
export function rateBody(value: unknown) {
  const b = record(value),
    minAge = age(b.minAge),
    maxAge = age(b.maxAge);
  if (maxAge < minAge)
    throw new AccountingError("L’âge maximum doit être supérieur ou égal à l’âge minimum.");
  return {
    minAge,
    maxAge,
    realCost: amount(b.realCost, true),
    effectiveFrom: date(b.effectiveFrom),
    isActive: bool(b.isActive),
    version: version(b.version),
  };
}
export function ratesBody(value: unknown) {
  const b = record(value);
  if (!Array.isArray(b.rows) || !b.rows.length || b.rows.length > 100)
    throw new AccountingError("Ajoutez entre 1 et 100 tranches.");
  const rows = b.rows
    .map((v) => {
      const r = record(v),
        minAge = age(r.minAge),
        maxAge = age(r.maxAge);
      if (maxAge < minAge) throw new AccountingError("Tranche d’âge invalide.");
      return {
        minAge,
        maxAge,
        oneYearCost: amount(r.oneYearCost, true),
        twoYearCost: amount(r.twoYearCost, true),
      };
    })
    .sort((a, b) => a.minAge - b.minAge);
  for (let i = 1; i < rows.length; i++)
    if (rows[i].minAge <= rows[i - 1].maxAge)
      throw new AccountingError("Les tranches d’âge ne doivent pas se chevaucher.");
  return {
    insuranceCompanyId: uuid(b.insuranceCompanyId),
    effectiveFrom: date(b.effectiveFrom),
    operationId: uuid(b.operationId),
    rows,
  };
}
export function depositBody(value: unknown) {
  const b = record(value);
  return {
    insuranceCompanyId: uuid(b.insuranceCompanyId),
    amount: amount(b.amount),
    depositDate: date(b.depositDate),
    paymentMethod: text(b.paymentMethod, "Mode de paiement", 80, true),
    reference: text(b.reference, "Référence", 200, true),
    note: text(b.note, "Note", 1000, true),
    operationId: uuid(b.operationId),
  };
}
