"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, LoaderCircle } from "lucide-react";
import Dialog from "./Dialog";
import {
  day,
  money,
  cents,
  type Company,
  type Rate,
} from "@/lib/accounting/model";
export type EditorMode =
  "withdrawal" | "deposit" | "company" | "rates" | "editRate" | "editCompany";
type Row = {
  minAge: string;
  maxAge: string;
  oneYearCost: string;
  twoYearCost: string;
};
type Fields = {
  insuranceCompanyId: string;
  name: string;
  isActive: boolean;
  amount: string;
  depositDate: string;
  paymentMethod: string;
  reference: string;
  note: string;
  effectiveFrom: string;
  minAge: string;
  maxAge: string;
  realCost: string;
  rows: Row[];
};
type Pending = {
  fields: Fields;
  body: Record<string, unknown>;
  endpoint: string;
  method: string;
};
const input =
  "mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100";
export default function Editor({
  mode,
  companies,
  company,
  rate,
  onClose,
  onSaved,
  balances = {},
}: {
  mode: EditorMode;
  companies: Company[];
  company?: Company;
  rate?: Rate;
  onClose: () => void;
  onSaved?: () => void;
  balances?: Record<string, number | null>;
}) {
  const router = useRouter(),
    key = `ifs-accounting-pending-${mode}`;
  const [stored] = useState<Pending | null>(() => {
    if (typeof window === "undefined" || mode.startsWith("edit")) return null;
    try {
      return JSON.parse(sessionStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  });
  const [fields, setFields] = useState<Fields>(
    stored?.fields ?? {
      insuranceCompanyId: company?.id ?? "",
      name: company?.name ?? "",
      isActive: rate?.is_active ?? company?.is_active ?? true,
      amount: "",
      depositDate: day(new Date().toISOString()),
      paymentMethod: "Virement bancaire",
      reference: "",
      note: "",
      effectiveFrom: rate?.effective_from ?? day(new Date().toISOString()),
      minAge: rate ? String(rate.min_age) : "",
      maxAge: rate ? String(rate.max_age) : "",
      realCost: rate ? String(rate.real_cost) : "",
      rows: [{ minAge: "", maxAge: "", oneYearCost: "", twoYearCost: "" }],
    },
  );
  const [pending, setPending] = useState<Pending | null>(stored),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const titles = {
    withdrawal: "Enregistrer un retrait",
    deposit: "Enregistrer un dépôt",
    company: "Ajouter un assureur",
    rates: "Créer une grille tarifaire",
    editRate: "Modifier le tarif",
    editCompany: "Modifier l’assureur",
  };
  const update = (name: keyof Fields, value: Fields[keyof Fields]) =>
    setFields((f) => ({ ...f, [name]: value }));
  const field = (
    name: Exclude<keyof Fields, "rows" | "isActive">,
    label: string,
    type = "text",
    required = true,
    maxLength?: number,
  ) => (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className={input}
        type={type}
        required={required}
        maxLength={maxLength}
        min={
          type === "number"
            ? mode === "withdrawal" && name === "amount"
              ? "0.01"
              : "0"
            : undefined
        }
        max={
          mode === "withdrawal" && name === "depositDate"
            ? day(new Date().toISOString())
            : undefined
        }
        step={
          type === "number"
            ? name === "minAge" || name === "maxAge"
              ? "1"
              : "0.01"
            : undefined
        }
        value={fields[name]}
        onChange={(e) => update(name, e.target.value)}
      />
    </label>
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    let operation = pending;
    if (!operation) {
      const base = "/api/admin/accounting/";
      let body: Record<string, unknown>,
        endpoint: string,
        method = "POST";
      if (mode === "withdrawal") {
        endpoint = base + "insurance-withdrawals";
        body = {
          insuranceCompanyId: fields.insuranceCompanyId,
          amount: Number(fields.amount),
          withdrawalDate: fields.depositDate,
          reason: fields.note,
          reference: fields.reference || null,
        };
      } else if (mode === "deposit") {
        endpoint = base + "insurance-deposits";
        body = {
          insuranceCompanyId: fields.insuranceCompanyId,
          amount: Number(fields.amount),
          depositDate: fields.depositDate,
          paymentMethod: fields.paymentMethod,
          reference: fields.reference || null,
          note: fields.note || null,
        };
      } else if (mode === "rates") {
        endpoint = base + "insurance-rates";
        body = {
          insuranceCompanyId: fields.insuranceCompanyId,
          effectiveFrom: fields.effectiveFrom,
          rows: fields.rows.map((r) => ({
            minAge: Number(r.minAge),
            maxAge: Number(r.maxAge),
            oneYearCost: Number(r.oneYearCost),
            twoYearCost: Number(r.twoYearCost),
          })),
        };
      } else if (mode === "editRate") {
        endpoint = base + "insurance-rates/" + rate!.id;
        method = "PATCH";
        body = {
          minAge: Number(fields.minAge),
          maxAge: Number(fields.maxAge),
          realCost: Number(fields.realCost),
          effectiveFrom: fields.effectiveFrom,
          isActive: fields.isActive,
          version: rate!.updated_at,
        };
      } else {
        endpoint =
          base +
          "insurance-companies" +
          (mode === "editCompany" ? "/" + company!.id : "");
        method = mode === "editCompany" ? "PATCH" : "POST";
        body = {
          name: fields.name,
          isActive: fields.isActive,
          ...(company ? { version: company.updated_at } : {}),
        };
      }
      if (method === "POST") body.operationId = crypto.randomUUID();
      operation = { fields, body, endpoint, method };
      setPending(operation);
      if (method === "POST")
        try {
          sessionStorage.setItem(key, JSON.stringify(operation));
        } catch {
          setError(
            "Le navigateur ne permet pas de conserver cette saisie. Autorisez le stockage de session avant d’enregistrer.",
          );
          setPending(null);
          return;
        }
    }
    setBusy(true);
    try {
      const response = await fetch(operation.endpoint, {
        method: operation.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operation.body),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (response.status >= 400 && response.status < 500) {
          setPending(null);
          sessionStorage.removeItem(key);
        }
        throw Error(
          result.error || "L’enregistrement n’a pas pu être confirmé.",
        );
      }
      sessionStorage.removeItem(key);
      router.refresh();
      onSaved?.();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Connexion interrompue. Réessayez la même opération.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title={titles[mode]} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-5 p-6">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
          >
            {error}
          </div>
        )}
        {pending && !busy && (
          <p
            role="status"
            className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
          >
            Une opération attend sa confirmation. Réessayez avec les mêmes
            valeurs pour éviter un double enregistrement.
          </p>
        )}
        <fieldset
          disabled={busy || !!pending}
          className="space-y-5 disabled:opacity-70"
        >
          {(mode === "withdrawal" ||
            mode === "deposit" ||
            mode === "rates") && (
            <label className="block text-sm font-medium text-slate-700">
              Assureur
              <select
                aria-label="Assureur"
                required
                className={input}
                value={fields.insuranceCompanyId}
                onChange={(e) => update("insuranceCompanyId", e.target.value)}
              >
                <option value="">Choisir un assureur</option>
                {companies
                  .filter((c) => c.is_active)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {(mode === "company" || mode === "editCompany") &&
            field("name", "Nom de l’assureur", "text", true, 120)}
          {mode === "withdrawal" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("amount", "Montant du retrait (₺)", "number")}
                {field("depositDate", "Date du retrait", "date")}
              </div>
              {field("note", "Motif du retrait", "text", true, 1000)}
              {field("reference", "Référence", "text", false, 200)}
              {fields.insuranceCompanyId && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <p>
                    Solde disponible après réservations :{" "}
                    {money(balances[fields.insuranceCompanyId] ?? null)}
                  </p>
                  <p>
                    Disponible après retrait :{" "}
                    {money(
                      balances[fields.insuranceCompanyId] == null ||
                        cents(fields.amount) === null
                        ? null
                        : balances[fields.insuranceCompanyId]! -
                            cents(fields.amount)!,
                    )}
                  </p>
                </div>
              )}
              <p className="text-xs text-slate-500">
                Enregistrez une sortie hors coût des polices, pour éviter un
                double débit. Le solde et la date sont revérifiés à
                l’enregistrement.
              </p>
            </>
          )}
          {mode === "deposit" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("amount", "Montant (TL)", "number")}
                {field("depositDate", "Date du dépôt", "date")}
              </div>
              {field("paymentMethod", "Mode de paiement", "text", false, 80)}
              {field("reference", "Référence du virement", "text", false, 200)}
              <label className="block text-sm font-medium text-slate-700">
                Note facultative
                <textarea
                  className={input}
                  maxLength={1000}
                  rows={3}
                  value={fields.note}
                  onChange={(e) => update("note", e.target.value)}
                />
              </label>
              <p className="text-xs leading-5 text-slate-500">
                Enregistrez uniquement une avance effectivement versée à
                l’assureur. La référence facilite le rapprochement.
              </p>
            </>
          )}
          {(mode === "rates" || mode === "editRate") &&
            field("effectiveFrom", "Date d’entrée en vigueur", "date")}
          {mode === "editRate" && (
            <>
              <p className="text-sm text-slate-500">
                {rate?.duration_years} an(s) ·{" "}
                {
                  companies.find((c) => c.id === rate?.insurance_company_id)
                    ?.name
                }
              </p>
              <div className="grid grid-cols-2 gap-4">
                {field("minAge", "Âge minimum", "number")}
                {field("maxAge", "Âge maximum", "number")}
              </div>
              {field("realCost", "Coût réel (TL)", "number")}
            </>
          )}
          {mode === "rates" && (
            <div className="space-y-4">
              {fields.rows.map((row, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Tranche {i + 1}</h3>
                    <button
                      type="button"
                      disabled={fields.rows.length === 1}
                      aria-label={`Supprimer la tranche ${i + 1}`}
                      onClick={() =>
                        update(
                          "rows",
                          fields.rows.filter((_, j) => j !== i),
                        )
                      }
                      className="rounded-lg p-2 text-slate-500 hover:bg-white disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        ["minAge", "Âge minimum"],
                        ["maxAge", "Âge maximum"],
                        ["oneYearCost", "Coût 1 an (TL)"],
                        ["twoYearCost", "Coût 2 ans (TL)"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="text-xs font-medium">
                        {label}
                        <input
                          required
                          className={input}
                          type="number"
                          min="0"
                          step={key.includes("Age") ? "1" : "0.01"}
                          value={row[key]}
                          onChange={(e) =>
                            update(
                              "rows",
                              fields.rows.map((r, j) =>
                                j === i ? { ...r, [key]: e.target.value } : r,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                disabled={fields.rows.length >= 100}
                onClick={() =>
                  update("rows", [
                    ...fields.rows,
                    {
                      minAge: "",
                      maxAge: "",
                      oneYearCost: "",
                      twoYearCost: "",
                    },
                  ])
                }
                className="flex items-center gap-2 text-sm font-semibold text-emerald-800"
              >
                <Plus size={16} />
                Ajouter une tranche
              </button>
              <p className="text-xs leading-5 text-slate-500">
                Les champs sont obligatoires. Saisissez explicitement 0
                uniquement si l’assurance n’a aucun coût.
              </p>
            </div>
          )}
          {(mode === "company" || mode.startsWith("edit")) && (
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium">
              <input
                type="checkbox"
                checked={fields.isActive}
                onChange={(e) => update("isActive", e.target.checked)}
                className="h-4 w-4 accent-emerald-800"
              />
              Actif pour les nouvelles opérations
            </label>
          )}
        </fieldset>
        <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold"
          >
            Fermer
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy && <LoaderCircle size={16} className="animate-spin" />}
            {busy
              ? "Enregistrement…"
              : pending
                ? "Réessayer la même opération"
                : "Enregistrer"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
