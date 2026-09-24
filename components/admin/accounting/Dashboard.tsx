"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import {
  accounting,
  cents,
  csv,
  dateLabel,
  day,
  money,
  type AccountingData,
  type Company,
  type Rate,
} from "@/lib/accounting/model";
import Editor, { type EditorMode } from "./Editor";
const control =
  "min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
const tabs = [
  ["overview", "Vue d’ensemble"],
  ["companies", "Assureurs"],
  ["dossiers", "Dossiers"],
  ["deposits", "Dépôts"],
  ["withdrawals", "Retraits"],
  ["nationalityRates", "Anciens tarifs Congo-Brazzaville"],
  ["rates", "Tarifs"],
  ["history", "Historique"],
] as const;
type Tab = (typeof tabs)[number][0];
type ViewRow = {
  id: string;
  cells: React.ReactNode[];
  exportValues: unknown[];
  search: string;
};
export default function Dashboard({
  data,
  initialCompany = "",
  initialTab = "overview",
  initialEdit = "",
}: {
  data: AccountingData;
  initialCompany?: string;
  initialTab?: Tab;
  initialEdit?: string;
}) {
  const router = useRouter();
  const withdrawalsReady = !data.missingTables?.includes(
    "insurance_company_withdrawals",
  );
  const [company, setCompany] = useState(initialCompany),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [tab, setTab] = useState<Tab>(initialTab),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [notice, setNotice] = useState(""),
    [showIssues, setShowIssues] = useState(false);
  const [editor, setEditor] = useState<{
    mode: EditorMode;
    company?: Company;
    rate?: Rate;
  } | null>(() => {
    const rate = data.rates.find((r) => r.id === initialEdit);
    return rate ? { mode: "editRate", rate } : null;
  });
  const [cancelling, setCancelling] = useState(false);
  async function cancelWithdrawal(id: string) {
    if (
      cancelling ||
      !window.confirm(
        "Annuler ce retrait et restituer son montant au solde assureur ? La trace sera conservée.",
      )
    )
      return;
    setCancelling(true);
    try {
      const response = await fetch(
        "/api/admin/accounting/insurance-withdrawals",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, operationId: crypto.randomUUID() }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error || "Annulation impossible.");
      router.refresh();
      setNotice("Retrait annulé. Le montant a été restitué au solde assureur.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Connexion interrompue. Actualisez avant de réessayer.",
      );
    } finally {
      setCancelling(false);
    }
  }
  const invalid = !!from && !!to && from > to;
  const filter = useMemo(
    () => ({ from: invalid ? "" : from, to: invalid ? "" : to, company }),
    [from, to, company, invalid],
  );
  const report = useMemo(() => accounting(data, filter), [data, filter]);
  const selectedCompany = data.companies.find((c) => c.id === company),
    companyName = (id: string | null) =>
      data.companies.find((c) => c.id === id)?.name ?? "Assureur non renseigné";
  const scopedCompanies = data.companies.filter(
      (c) => !company || c.id === company,
    ),
    companyReports = scopedCompanies.map((c) => ({
      company: c,
      report: accounting(data, { ...filter, company: c.id }),
    }));
  const changeTab = (value: Tab) => {
    setTab(value);
    setPage(1);
    setQ("");
  };
  const link = (id: string, code: string) => (
    <Link
      className="font-semibold text-emerald-900 hover:underline"
      href={`/admin/dossiers/${id}`}
    >
      {code}
    </Link>
  );
  const badge = (active: boolean) => (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"}`}
    >
      {active ? "Actif" : "Inactif"}
    </span>
  );
  const edit = (mode: EditorMode, rate?: Rate, c?: Company) => (
    <button
      type="button"
      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:border-emerald-700 hover:text-emerald-800"
      onClick={() => setEditor({ mode, rate, company: c })}
    >
      Modifier
      <span className="sr-only">
        {" "}
        {rate
          ? `${rate.min_age}–${rate.max_age} ans, ${rate.duration_years} an(s), ${companyName(rate.insurance_company_id)}`
          : c?.name}
      </span>
    </button>
  );
  let headers: string[] = [],
    rows: ViewRow[] = [];
  if (tab === "companies" || tab === "overview") {
    headers = [
      "Assureur",
      "Dépôts cumulés",
      "Coûts consommés",
      "Retraits nets cumulés",
      "Solde estimé",
      "CA réalisé",
      "Bénéfice brut",
      "Actions",
    ];
    rows = companyReports.map(({ company: c, report: r }) => ({
      id: c.id,
      search: c.name,
      cells: [
        <div key="name">
          <Link
            href={`/admin/comptabilite/assureurs/${c.id}`}
            className="font-semibold text-slate-900 hover:text-emerald-800"
          >
            {c.name}
          </Link>
          <div className="mt-1">{badge(c.is_active)}</div>
        </div>,
        money(r.cumulativeDeposits),
        money(r.consumed),
        money(r.cumulativeWithdrawals),
        <span
          key="balance"
          className={
            r.balance !== null && r.balance < 0
              ? "font-bold text-rose-700"
              : "font-semibold"
          }
        >
          {money(r.balance)}
        </span>,
        money(r.revenue),
        money(r.profit),
        edit("editCompany", undefined, c),
      ],
      exportValues: [
        c.name,
        r.cumulativeDeposits === null
          ? "À compléter"
          : r.cumulativeDeposits / 100,
        r.consumed === null ? "À compléter" : r.consumed / 100,
        r.cumulativeWithdrawals === null
          ? "À compléter"
          : r.cumulativeWithdrawals / 100,
        r.balance === null ? "À compléter" : r.balance / 100,
        r.revenue === null ? "À compléter" : r.revenue / 100,
        r.profit === null ? "À compléter" : r.profit / 100,
        c.is_active ? "Actif" : "Inactif",
      ],
    }));
  } else if (tab === "dossiers") {
    headers = [
      "Dossier",
      "Assureur",
      "Durée / âge",
      "Encaissement confirmé",
      "Coût réel",
      "Bénéfice réalisé",
      "Situation",
    ];
    rows = report.dossiers.map((r) => ({
      id: r.id,
      search: `${r.request_code} ${companyName(r.insurance_company_id)} ${r.status}`,
      cells: [
        link(r.id, r.request_code),
        companyName(r.insurance_company_id),
        `${r.insurance_duration_years ?? "—"} an(s) · ${r.calculated_age ?? "—"} ans`,
        money(r.revenue),
        money(r.cost),
        r.status === "policy_available" && r.revenue !== null && r.cost !== null
          ? money(r.revenue - r.cost)
          : "—",
        r.status === "policy_available"
          ? "Police disponible"
          : r.status === "cancelled"
            ? "Annulé · à rapprocher"
            : "En cours",
      ],
      exportValues: [
        r.request_code,
        companyName(r.insurance_company_id),
        r.insurance_duration_years,
        r.revenue === null ? "À compléter" : r.revenue / 100,
        r.cost === null ? "À compléter" : r.cost / 100,
        r.status === "policy_available" && r.revenue !== null && r.cost !== null
          ? (r.revenue - r.cost) / 100
          : "",
        r.status,
      ],
    }));
  } else if (tab === "deposits") {
    headers = [
      "Date",
      "Assureur",
      "Montant",
      "Mode / référence",
      "Note",
      "Enregistré par",
    ];
    rows = [...report.deposits]
      .sort(
        (a, b) =>
          b.deposit_date.localeCompare(a.deposit_date) ||
          b.created_at.localeCompare(a.created_at),
      )
      .map((d) => ({
        id: d.id,
        search: `${companyName(d.insurance_company_id)} ${d.reference ?? ""} ${d.note ?? ""}`,
        cells: [
          dateLabel(d.deposit_date),
          companyName(d.insurance_company_id),
          <strong key="amount">{money(cents(d.amount))}</strong>,
          <div key="ref">
            {d.payment_method || "—"}
            <p className="mt-1 text-xs text-slate-500">
              {d.reference || "Sans référence"}
            </p>
          </div>,
          d.note || "—",
          data.authors[d.created_by ?? ""] || "Auteur non disponible",
        ],
        exportValues: [
          d.deposit_date,
          companyName(d.insurance_company_id),
          d.amount,
          `${d.payment_method ?? ""} / ${d.reference ?? ""}`,
          d.note,
          data.authors[d.created_by ?? ""] || d.created_by,
        ],
      }));
  } else if (tab === "withdrawals") {
    headers = [
      "Date",
      "Assureur",
      "Montant",
      "Motif / référence",
      "Auteur",
      "Statut",
      "Actions",
    ];
    rows = [...report.withdrawals]
      .sort((a, b) => b.withdrawal_date.localeCompare(a.withdrawal_date))
      .map((w) => ({
        id: w.id,
        search:
          companyName(w.insurance_company_id) +
          " " +
          w.reason +
          " " +
          (w.reference ?? ""),
        cells: [
          dateLabel(w.withdrawal_date),
          companyName(w.insurance_company_id),
          money(cents(w.amount)),
          w.reason + (w.reference ? " · " + w.reference : ""),
          data.authors[w.created_by] ?? "Auteur non disponible",
          w.cancelled_at ? "Annulé le " + dateLabel(w.cancelled_at) : "Débité",
          w.cancelled_at ? (
            "—"
          ) : (
            <button
              key="cancel"
              className={control}
              onClick={() => cancelWithdrawal(w.id)}
            >
              Annuler le retrait
            </button>
          ),
        ],
        exportValues: [
          w.withdrawal_date,
          companyName(w.insurance_company_id),
          w.amount,
          w.reason,
          data.authors[w.created_by] ?? w.created_by,
          w.cancelled_at ? "Annulé" : "Débité",
          "",
        ],
      }));
  } else if (tab === "nationalityRates") {
    headers = [
      "Assureur",
      "Nationalité",
      "Tranche d’âge",
      "Assureur 1 an",
      "Client 1 an",
      "Assureur 2 ans",
      "Client 2 ans",
      "En vigueur dès le",
    ];
    rows = (data.nationalityRates ?? [])
      .filter((r) => !company || r.insurance_company_id === company)
      .map((r) => ({
        id: r.id,
        search:
          companyName(r.insurance_company_id) +
          " Congo-Brazzaville " +
          r.min_age +
          " " +
          r.max_age,
        cells: [
          companyName(r.insurance_company_id),
          "Congo-Brazzaville",
          r.min_age + "–" + r.max_age + " ans",
          ...[
            r.one_year_cost,
            r.one_year_price,
            r.two_year_cost,
            r.two_year_price,
          ].map((v) => money(cents(v))),
          dateLabel(r.effective_from),
        ],
        exportValues: [
          companyName(r.insurance_company_id),
          "Congo-Brazzaville",
          r.min_age + "–" + r.max_age,
          r.one_year_cost,
          r.one_year_price,
          r.two_year_cost,
          r.two_year_price,
          r.effective_from,
        ],
      }));
  } else if (tab === "rates") {
    headers = [
      "Assureur",
      "Tranche d’âge",
      "Durée",
      "Coût réel",
      "En vigueur dès le",
      "Statut",
      "Actions",
    ];
    rows = data.rates
      .filter((r) => !company || r.insurance_company_id === company)
      .sort(
        (a, b) =>
          companyName(a.insurance_company_id).localeCompare(
            companyName(b.insurance_company_id),
          ) ||
          b.effective_from.localeCompare(a.effective_from) ||
          a.min_age - b.min_age ||
          a.duration_years - b.duration_years,
      )
      .map((r) => ({
        id: r.id,
        search: `${companyName(r.insurance_company_id)} ${r.min_age} ${r.max_age} ${r.is_active ? "actif" : "inactif"}`,
        cells: [
          companyName(r.insurance_company_id),
          `${r.min_age}–${r.max_age} ans`,
          `${r.duration_years} an(s)`,
          money(cents(r.real_cost)),
          dateLabel(r.effective_from),
          <div key="status">
            {badge(r.is_active)}
            {r.effective_from > day(new Date().toISOString()) && (
              <span className="ml-2 text-xs text-slate-500">À venir</span>
            )}
          </div>,
          edit("editRate", r),
        ],
        exportValues: [
          companyName(r.insurance_company_id),
          `${r.min_age}–${r.max_age}`,
          r.duration_years,
          r.real_cost,
          r.effective_from,
          r.is_active ? "Actif" : "Inactif",
          "",
        ],
      }));
  } else {
    headers = [
      "Date",
      "Origine",
      "Type",
      "Assureur",
      "Dossier",
      "Description",
      "Montant",
      "Auteur",
    ];

    const historyTypeLabel = {
      withdrawal: "Retrait assureur",
      withdrawal_cancelled: "Retrait annulé",
      deposit: "Dépôt assureur",
      payment: "Paiement",
      policy: "Assurance disponible",
      rate: "Tarif modifié",
    } as const;

    rows = data.history
      .filter(
        (h) =>
          (!company || h.insurance_company_id === company) &&
          (!from || day(h.occurred_at) >= from) &&
          (!to || day(h.occurred_at) <= to),
      )
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .map((h) => {
        const originLabel =
          h.origin === "partner"
            ? `Partenaire — ${h.partner_name ?? "Partenaire"}`
            : h.origin === "client"
              ? "Client direct"
              : "—";

        const amount =
          h.amount === null
            ? "—"
            : `${
                h.direction === "out" ? "−" : h.direction === "in" ? "+" : ""
              }${money(cents(h.amount))}`;

        const author = h.author_id
          ? data.authors[h.author_id] || "Auteur non disponible"
          : "Système";

        const typeLabel =
          h.type === "payment"
            ? h.origin === "partner"
              ? "Paiement partenaire"
              : "Paiement client"
            : historyTypeLabel[h.type];

        return {
          id: h.id,

          search: [
            originLabel,
            h.partner_name ?? "",
            typeLabel,
            h.title,
            h.description,
            h.request_code ?? "",
            h.insurance_company_id ? companyName(h.insurance_company_id) : "",
            author,
          ].join(" "),

          cells: [
            new Date(h.occurred_at).toLocaleString("fr-FR", {
              timeZone: "Europe/Istanbul",
            }),

            originLabel,

            typeLabel,

            h.insurance_company_id ? companyName(h.insurance_company_id) : "—",

            h.request_code || "—",

            h.description,

            amount,

            author,
          ],

          exportValues: [
            h.occurred_at,

            originLabel,

            typeLabel,

            h.insurance_company_id ? companyName(h.insurance_company_id) : "",

            h.request_code ?? "",

            h.description,

            h.amount ?? "",

            h.direction,

            author,
          ],
        };
      });
  }
  const filtered = rows.filter((r) =>
      r.search
        .toLocaleLowerCase("fr")
        .includes(q.trim().toLocaleLowerCase("fr")),
    ),
    pages = Math.max(1, Math.ceil(filtered.length / 12)),
    current = Math.min(page, pages),
    shown = filtered.slice((current - 1) * 12, current * 12);
  function download() {
    const blob = new Blob(
      [
        csv([
          [
            "Comptabilité IF Sigorta",
            `Du ${from || "début"} au ${to || "jour courant"}`,
            selectedCompany?.name || "Tous les assureurs",
          ],
          headers,
          ...filtered.map((r) => r.exportValues),
        ]),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `comptabilite-${tab}-${day(new Date().toISOString())}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function period(value: string) {
    const today = day(new Date().toISOString());
    setTo(value === "all" ? "" : today);
    setFrom(
      value === "month"
        ? today.slice(0, 7) + "-01"
        : value === "year"
          ? today.slice(0, 4) + "-01-01"
          : "",
    );
    setPage(1);
  }
  return (
    <main className="min-h-screen bg-[#F6F7F5] px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1540px] space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
              IF SIGORTA · FINANCES
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {selectedCompany ? selectedCompany.name : "Comptabilité"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Une vue claire de vos encaissements, de vos marges et de vos
              avances.
            </p>
            {initialCompany && (
              <Link
                href="/admin/comptabilite"
                className="mt-2 inline-block text-sm font-semibold text-emerald-800"
              >
                ← Tous les assureurs
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                router.refresh();
                setNotice("Actualisation demandée.");
              }}
              className={`${control} flex items-center gap-2`}
            >
              <RefreshCw size={15} />
              Actualiser
            </button>
            <button
              onClick={() =>
                setEditor({ mode: "deposit", company: selectedCompany })
              }
              className="flex min-h-10 items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
            >
              <Plus size={17} />
              Enregistrer un dépôt
            </button>
            <button
              onClick={() =>
                setEditor({ mode: "withdrawal", company: selectedCompany })
              }
              disabled={!withdrawalsReady}
              title={
                withdrawalsReady ? undefined : "Mise à jour de la base requise"
              }
              className={`${control} font-semibold text-rose-800 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Enregistrer un retrait
            </button>
          </div>
        </header>
        {!!data.missingTables?.length && (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          >
            La mise à jour de la base est nécessaire pour activer{" "}
            {data.missingTables.includes("insurance_company_withdrawals")
              ? "les retraits assureur"
              : "l’historique des anciens tarifs Congo-Brazzaville"}
            {data.missingTables.length > 1
              ? " et l’historique des anciens tarifs Congo-Brazzaville"
              : ""}
            .
            {!withdrawalsReady &&
              " Les soldes incluant les retraits restent à compléter jusqu’à cette activation."}
            {" Les autres données comptables restent consultables."}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            <CheckCheck size={17} />
            {notice}
            <button className="ml-auto underline" onClick={() => setNotice("")}>
              Masquer
            </button>
          </p>
        )}
        <section
          aria-label="Filtres comptables"
          className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <label className="min-w-[160px] flex-1 text-xs font-semibold text-slate-500">
            Assureur
            <select
              aria-label="Filtrer par assureur"
              className={`${control} mt-1 block w-full`}
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous les assureurs</option>
              {data.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.is_active ? "" : " · inactif"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Du
            <input
              type="date"
              className={`${control} mt-1 block max-w-[160px]`}
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Au
            <input
              type="date"
              className={`${control} mt-1 block max-w-[160px]`}
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <div className="flex gap-1 pb-0.5">
            {[
              ["all", "Tout"],
              ["month", "Ce mois"],
              ["year", "Cette année"],
            ].map(([v, l]) => (
              <button
                key={v}
                className="min-h-10 rounded-lg px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                onClick={() => period(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </section>
        {invalid ? (
          <div role="alert" className="rounded-xl bg-rose-50 p-5 text-rose-900">
            La date de début doit précéder la date de fin. Corrigez la période
            pour consulter les résultats.
          </div>
        ) : (
          <>
            <section
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Indicateurs"
            >
              <Kpi
                title="Encaissements confirmés"
                value={money(report.collected)}
                caption={`${report.payments.length} paiement(s) · période sélectionnée`}
                icon={<ArrowDownLeft size={20} />}
              />
              <Kpi
                title="Chiffre d’affaires réalisé"
                value={money(report.revenue)}
                caption={`${report.realized.length} police(s) disponible(s) et payée(s)`}
                icon={<ArrowUpRight size={20} />}
              />
              <Kpi
                title="Bénéfice brut"
                value={money(report.profit)}
                caption={
                  report.profit === null
                    ? "Des coûts ou montants restent à compléter"
                    : report.revenue
                      ? `${((report.profit / report.revenue) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % de marge · hors frais généraux`
                      : "Aucune vente sur la période"
                }
                icon={<CheckCheck size={20} />}
              />
              <Kpi
                dark
                title="Solde assureurs estimé"
                value={money(report.balance)}
                caption={`Cumul ${to ? `au ${dateLabel(to)}` : "à ce jour"} · indépendant de la date de début`}
                icon={<Wallet size={20} />}
              />
            </section>
            {report.anomalies.length > 0 && (
              <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                <button
                  className="flex w-full items-center gap-3 text-left text-sm text-amber-950"
                  onClick={() => setShowIssues((v) => !v)}
                  aria-expanded={showIssues}
                >
                  <TriangleAlert size={20} className="shrink-0" />
                  <span>
                    <strong>
                      {report.anomalies.length} point(s) à rapprocher
                    </strong>
                    <span className="ml-2 text-amber-800">
                      Coûts, paiements ou informations incomplets · tous les
                      dossiers de l’assureur
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 font-semibold">
                    {showIssues ? "Réduire" : "Consulter"}
                  </span>
                </button>
                {showIssues && (
                  <ul className="mt-4 max-h-72 space-y-2 overflow-auto border-t border-amber-200 pt-4">
                    {report.anomalies.map((a, i) => (
                      <li
                        key={`${a.id}-${i}`}
                        className="flex flex-wrap justify-between gap-2 text-sm"
                      >
                        {link(a.id, a.code)}
                        <span>{a.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            <nav
              aria-label="Rubriques comptables"
              className="flex gap-1 overflow-x-auto border-b border-slate-200"
            >
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => changeTab(id)}
                  aria-current={tab === id ? "page" : undefined}
                  className={`min-h-12 shrink-0 border-b-2 px-4 text-sm font-semibold ${tab === id ? "border-emerald-800 text-emerald-900" : "border-transparent text-slate-500 hover:text-slate-900"}`}
                >
                  {label}
                </button>
              ))}
            </nav>
            {tab === "overview" && (
              <section className="grid gap-5 lg:grid-cols-5">
                <article className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-3">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-950">
                      Rapprochement des avances
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                      Cumul {to ? dateLabel(to) : "à ce jour"}
                    </span>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Amount
                      label="Avances versées"
                      value={report.cumulativeDeposits}
                    />
                    <Amount
                      label="− Coûts des polices disponibles"
                      value={report.consumed}
                    />
                    <Amount
                      label="− Retraits nets"
                      value={report.cumulativeWithdrawals}
                    />
                    <Amount label="= Solde estimé" value={report.balance} />
                  </div>
                  <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
                    Les coûts sont rattachés à la date de sélection de
                    l’assureur. Le solde est estimatif et ne remplace pas le
                    relevé de la compagnie.
                    {to
                      ? " Il porte sur les dossiers actuellement disponibles dont l’assureur était sélectionné à cette date ; ce n’est pas un arrêté historique."
                      : ""}
                  </p>
                </article>
                <article className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
                  <h2 className="mb-5 text-base font-bold text-slate-950">
                    À suivre
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-500">
                        Dépôts sur la période
                      </span>
                      <strong>{money(report.depositFlow)}</strong>
                    </div>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-500">
                        Coûts en préparation, à ce jour
                      </span>
                      <strong>{money(report.committed)}</strong>
                    </div>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-500">
                        Polices sans coût renseigné
                      </span>
                      <strong
                        className={report.missingCosts ? "text-amber-700" : ""}
                      >
                        {report.missingCosts}
                      </strong>
                    </div>
                  </div>
                  <p className="mt-5 text-xs leading-5 text-slate-500">
                    Les coûts en préparation sont présentés séparément et ne
                    sont pas déduits une seconde fois.
                  </p>
                </article>
              </section>
            )}
            {tab === "overview" && <Profitability dossiers={report.realized} />}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-base font-bold text-slate-950">
                    {tab === "overview"
                      ? "Situation par assureur"
                      : tabs.find((t) => t[0] === tab)?.[1]}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {tab === "rates"
                      ? "Une ligne par durée. Les tarifs absents ne sont jamais affichés à zéro."
                      : tab === "history"
                        ? "Journal des dépôts, retraits, annulations, paiements, polices et modifications tarifaires."
                        : `${filtered.length} ligne(s) · montants en livres turques`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="relative">
                    <span className="sr-only">Rechercher dans la liste</span>
                    <Search
                      className="absolute left-3 top-3 text-slate-400"
                      size={15}
                    />
                    <input
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Rechercher…"
                      className={`${control} w-48 pl-9`}
                    />
                  </label>
                  <button
                    onClick={download}
                    className={`${control} flex items-center gap-2`}
                  >
                    <Download size={15} />
                    Exporter
                  </button>
                  {(tab === "rates" || tab === "companies") && (
                    <button
                      onClick={() =>
                        setEditor({
                          mode: tab === "rates" ? "rates" : "company",
                          company: selectedCompany,
                        })
                      }
                      className={`${control} flex items-center gap-2 font-semibold text-emerald-800`}
                    >
                      <Plus size={15} />
                      {tab === "rates" ? "Nouvelle grille" : "Ajouter"}
                    </button>
                  )}
                </div>
              </div>
              {shown.length ? (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                        <tr>
                          {headers.map((h) => (
                            <th
                              scope="col"
                              key={h}
                              className="whitespace-nowrap px-5 py-3.5"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {shown.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/70">
                            {r.cells.map((cell, i) => (
                              <td
                                key={i}
                                className="max-w-xs px-5 py-4 align-middle break-words"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="divide-y divide-slate-100 md:hidden">
                    {shown.map((r) => (
                      <article
                        key={r.id}
                        className="grid grid-cols-2 gap-4 p-5"
                      >
                        {r.cells.map((cell, i) => (
                          <div key={i} className={i === 0 ? "col-span-2" : ""}>
                            <p className="mb-1 text-xs text-slate-500">
                              {headers[i]}
                            </p>
                            <div className="break-words text-sm">{cell}</div>
                          </div>
                        ))}
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="px-6 py-14 text-center">
                  <Building2
                    className="mx-auto mb-3 text-slate-300"
                    size={32}
                  />
                  <p className="font-semibold text-slate-700">
                    Aucune ligne à afficher
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Modifiez vos filtres ou enregistrez votre première
                    opération.
                  </p>
                  {tab === "overview" && (
                    <button
                      onClick={() => setEditor({ mode: "company" })}
                      className="mt-5 rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      Ajouter un assureur
                    </button>
                  )}
                </div>
              )}
              <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
                <span>
                  {filtered.length
                    ? `${(current - 1) * 12 + 1}–${Math.min(current * 12, filtered.length)} sur ${filtered.length}`
                    : "0 résultat"}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    aria-label="Page précédente"
                    disabled={current === 1}
                    onClick={() => setPage(current - 1)}
                    className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>
                    {current} / {pages}
                  </span>
                  <button
                    aria-label="Page suivante"
                    disabled={current === pages}
                    onClick={() => setPage(current + 1)}
                    className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </footer>
            </section>
            <details className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
              <summary className="cursor-pointer font-semibold text-slate-700">
                <SlidersHorizontal className="mr-2 inline" size={16} />
                Comprendre les chiffres
              </summary>
              <div className="mt-4 grid gap-4 leading-6 text-slate-500 sm:grid-cols-2">
                <p>
                  Les encaissements utilisent les montants attendus des
                  paiements confirmés, à leur date de confirmation. Vérifiez les
                  écarts éventuels avec les relevés bancaires.
                </p>
                <p>
                  Le CA et le bénéfice portent sur les dossiers actuellement
                  disponibles dont le paiement est confirmé pendant la période.
                  Le coût enregistré de ces dossiers est déduit une seule fois.
                  Les frais généraux et remboursements non enregistrés ne sont
                  pas inclus.
                </p>
                <p>
                  Les avances utilisent la date du dépôt. Le solde cumulé ignore
                  la date de début. Une date ou un coût manquant empêche de
                  présenter un solde complet.
                </p>
                <p>
                  L’historique regroupe les dépôts assureurs, les paiements
                  clients directs, les paiements provenant de partenaires, les
                  assurances mises à disposition et les modifications
                  tarifaires. Pour les dossiers partenaires, le nom du
                  partenaire est affiché afin de distinguer clairement leur
                  origine. Les exports contiennent toutes les lignes
                  correspondant à la recherche, pas uniquement la page affichée.
                </p>
              </div>
            </details>
          </>
        )}
        <p className="pb-4 text-xs text-slate-400">
          Données actualisées le{" "}
          {new Date(data.loadedAt).toLocaleString("fr-FR", {
            timeZone: "Europe/Istanbul",
          })}{" "}
          · Accès réservé à l’administration
        </p>
        {editor && (
          <Editor
            key={`${editor.mode}-${editor.rate?.id ?? editor.company?.id ?? ""}`}
            {...editor}
            companies={data.companies}
            balances={Object.fromEntries(
              data.companies.map((c) => {
                const r = accounting(data, { from: "", to: "", company: c.id });
                return [
                  c.id,
                  r.balance === null || r.committed === null
                    ? null
                    : r.balance - r.committed,
                ];
              }),
            )}
            onClose={() => setEditor(null)}
            onSaved={() =>
              setNotice(
                "Enregistrement confirmé. Les données ont été actualisées.",
              )
            }
          />
        )}
      </div>
    </main>
  );
}
function Kpi({
  title,
  value,
  caption,
  icon,
  dark = false,
}: {
  title: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border p-5 shadow-sm ${dark ? "border-emerald-950 bg-emerald-950 text-white" : "border-slate-200 bg-white"}`}
    >
      <div
        className={`flex items-center justify-between gap-2 text-sm ${dark ? "text-emerald-100" : "text-slate-500"}`}
      >
        <h2>{title}</h2>
        {icon}
      </div>
      <p className="mt-4 break-words text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      <p
        className={`mt-3 text-xs leading-5 ${dark ? "text-emerald-100/75" : "text-slate-500"}`}
      >
        {caption}
      </p>
    </article>
  );
}
function Amount({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-xs leading-5 text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">
        {money(value)}
      </p>
    </div>
  );
}

function Profitability({
  dossiers,
}: {
  dossiers: ReturnType<typeof accounting>["realized"];
}) {
  function stats(rows: typeof dossiers) {
    const revenue = rows.some((r) => r.revenue === null)
        ? null
        : rows.reduce((s, r) => s + (r.revenue ?? 0), 0),
      cost = rows.some((r) => r.cost === null)
        ? null
        : rows.reduce((s, r) => s + (r.cost ?? 0), 0);
    return {
      revenue,
      cost,
      profit: revenue === null || cost === null ? null : revenue - cost,
    };
  }
  const ages = Array.from(new Set(dossiers.map((r) => r.ageGroup))).sort(
    (a, b) => a.localeCompare(b, "fr", { numeric: true }),
  );
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-base font-bold text-slate-950">
        Rentabilité des polices disponibles
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Dossiers payés sur la période sélectionnée.
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {[1, 2].map((duration) => {
          const rows = dossiers.filter(
              (r) => r.insurance_duration_years === duration,
            ),
            s = stats(rows);
          return (
            <article key={duration} className="rounded-xl bg-slate-50 p-4">
              <div className="mb-4 flex justify-between text-sm">
                <h3 className="font-bold">
                  Assurance {duration} an{duration === 2 ? "s" : ""}
                </h3>
                <span className="text-slate-500">{rows.length} dossier(s)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Amount label="Chiffre d’affaires" value={s.revenue} />
                <Amount label="Bénéfice brut" value={s.profit} />
              </div>
            </article>
          );
        })}
      </div>
      <details className="mt-5 border-t border-slate-100 pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-900">
          Répartition par âge enregistré
        </summary>
        <p className="mt-2 text-xs text-slate-500">
          Catégories fixes de dix ans, indépendantes des modifications de
          tarifs.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ages.map((age) => {
            const rows = dossiers.filter((r) => r.ageGroup === age),
              s = stats(rows);
            return (
              <div
                key={age}
                className="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div className="flex justify-between gap-3">
                  <strong>{age}</strong>
                  <span>{rows.length} dossier(s)</span>
                </div>
                <p className="mt-2 text-slate-500">
                  Bénéfice :{" "}
                  <strong className="text-slate-800">{money(s.profit)}</strong>
                </p>
              </div>
            );
          })}
          {!ages.length && (
            <p className="text-sm text-slate-500">
              Aucune police sur la période.
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
