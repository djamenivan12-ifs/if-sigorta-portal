"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  Inbox,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  dashboard,
  clientName,
  statusLabels,
  waitLabel,
  type DashboardData,
  type Period,
  type RequestRow,
} from "@/lib/dashboard/model";
import { money, dateLabel } from "@/lib/accounting/model";
import ClaimRequestButton from "@/components/admin/requests/ClaimRequestButton";
import MonthlyReportButton from "./MonthlyReportButton";
const control =
  "min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
const periods = [
  ["today", "Aujourd’hui"],
  ["7d", "7 jours"],
  ["30d", "30 jours"],
  ["month", "Ce mois"],
] as const;
type List = "actions" | "queue" | "waiting" | "rejected" | "recent";
export default function OperationsDashboard({ data }: { data: DashboardData }) {
  const router = useRouter(),
    [refreshing, startRefresh] = useTransition(),
    [period, setPeriod] = useState<Period>("month"),
    [list, setList] = useState<List>("actions"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [chartMetric, setChartMetric] = useState<"requests" | "collected">(
      "requests",
    );
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible")
        startRefresh(() => router.refresh());
    };
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
  const model = dashboard(data, period),
    admin = data.role === "admin";
  const setListView = (value: List) => {
    setList(value);
    setPage(1);
    setSearch("");
  };
  const selectedRows = model[list].filter((r) =>
    `${r.request_code} ${clientName(r)} ${statusLabels[r.status] ?? r.status}`
      .toLocaleLowerCase("fr")
      .includes(search.trim().toLocaleLowerCase("fr")),
  );
  const count = selectedRows.length,
    pages = Math.max(1, Math.ceil(count / 8)),
    currentPage = Math.min(page, pages),
    shown = selectedRows.slice((currentPage - 1) * 8, currentPage * 8);
  const delta = model.selected.length - model.previous.length,
    trend = model.previous.length
      ? `${delta > 0 ? "+" : ""}${((delta / model.previous.length) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`
      : model.selected.length
        ? "Sans période de référence"
        : "Aucune activité";
  const titles: Record<List, string> = {
    actions: "À traiter",
    queue: "À prendre en charge",
    waiting: "Attente client",
    rejected: "Paiements refusés",
    recent: "Tous les dossiers",
  };
  const renewals =
    model.renewals?.filter((r) => r.days !== null && r.days <= 7) ?? null;
  const maxChart = Math.max(
    1,
    ...model.chart.map(
      (d) => (chartMetric === "requests" ? d.requests : d.collected) ?? 0,
    ),
  );
  const actionLabel = (status: string) =>
    status === "payment_review"
      ? "Vérifier le paiement"
      : status === "payment_confirmed"
        ? "Choisir l’assureur"
        : status === "policy_preparation"
          ? "Préparer la police"
          : "Ouvrir le dossier";
  function action(row: RequestRow) {
    return row.assigned_agent_id === null &&
      model.queue.some((q) => q.id === row.id) ? (
      <ClaimRequestButton
        requestId={row.id}
        assignedAgentId={null}
        currentUserId={data.userId}
        currentUserRole={data.role}
      />
    ) : (
      <Link
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-emerald-900 hover:border-emerald-700"
        href={`/admin/dossiers/${row.id}`}
      >
        {actionLabel(row.status)}
        <ArrowRight size={14} />
        <span className="sr-only"> {row.request_code}</span>
      </Link>
    );
  }
  const urgency = (row: RequestRow) => {
    const r = model.actions.find((a) => a.id === row.id);
    if (!r) return <span className="text-slate-400">—</span>;
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${r.age === null ? "text-slate-500" : r.age >= 30 ? "text-rose-700" : r.age >= 15 ? "text-amber-700" : "text-slate-600"}`}
      >
        <Clock3 size={14} />
        {waitLabel(r.age)}
      </span>
    );
  };
  return (
    <main className="min-h-screen bg-[#F6F7F5] px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1540px] space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
              IF SIGORTA · {admin ? "PILOTAGE" : "ESPACE AGENT"}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Tableau de bord
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Bonjour {data.userName}.{" "}
              {admin
                ? "Voici les priorités de votre équipe."
                : "Voici vos dossiers et les demandes à prendre en charge."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={refreshing}
              onClick={() => startRefresh(() => router.refresh())}
              className={`${control} flex items-center gap-2 disabled:opacity-50`}
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Actualisation…" : "Actualiser"}
            </button>
            <Link
              href="/admin/dossiers"
              className="flex min-h-10 items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <FileText size={16} />
              Ouvrir les dossiers
            </Link>
          </div>
        </header>
        <section
          aria-label="Situation opérationnelle"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <Metric
            title={admin ? "Dossiers à traiter" : "Mes dossiers à traiter"}
            value={model.actions.length.toLocaleString("fr-FR")}
            description="Paiement à vérifier, assureur à choisir ou police à préparer"
            icon={<FileCheck2 size={20} />}
            onClick={() => setListView("actions")}
          />
          <Metric
            title="Sans attribution"
            value={model.queue.length.toLocaleString("fr-FR")}
            description="Demandes disponibles dans la file commune"
            icon={<Inbox size={20} />}
            onClick={() => setListView("queue")}
          />
          <Metric
            title="En attente du client"
            value={model.waiting.length.toLocaleString("fr-FR")}
            description="Paiement attendu · distinct des tâches de l’équipe"
            icon={<Clock3 size={20} />}
            onClick={() => setListView("waiting")}
          />
          <Metric
            dark
            title="Renouvellements à suivre"
            value={
              renewals === null
                ? "Indisponible"
                : renewals.length.toLocaleString("fr-FR")
            }
            description="Échéance dans 7 jours ou déjà dépassée"
            icon={<ShieldCheck size={20} />}
            href="#dashboard-renewals"
          />
        </section>
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-800">
              <CheckCheck size={20} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-950">
                Priorités opérationnelles
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Temps depuis la dernière avancée, sur les dossiers à traiter.
              </p>
            </div>
          </div>
          {data.activities === null ? (
            <p role="status" className="text-sm text-amber-800">
              Historique indisponible : les délais ne peuvent pas être calculés.
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <span>
                <strong className="text-rose-700">{model.critical}</strong> ≥ 30
                min
              </span>
              <span>
                <strong className="text-amber-700">{model.late}</strong> 15–29
                min
              </span>
              <span>
                <strong>{model.watch}</strong> 5–14 min
              </span>
            </div>
          )}
        </section>
        <section
          id="dashboard-work"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 pt-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                {admin ? "Le travail à organiser" : "Mon espace de travail"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {list === "actions"
                  ? "Les plus longues attentes apparaissent en premier."
                  : list === "queue"
                    ? "Prenez en charge une demande avant de la traiter."
                    : "Vue sur l’état actuel des dossiers, indépendante de la période d’analyse."}
              </p>
            </div>
            <label className="relative mb-2">
              <span className="sr-only">Rechercher un dossier</span>
              <Search
                size={16}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                className={`${control} w-56 max-w-full pl-9`}
                placeholder="Code ou nom du client…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <nav
              aria-label="Files de travail"
              className="flex w-full gap-1 overflow-x-auto"
            >
              {(
                ["actions", "queue", "waiting", "rejected", "recent"] as const
              ).map((id) => (
                <button
                  type="button"
                  key={id}
                  aria-current={list === id ? "page" : undefined}
                  onClick={() => setListView(id)}
                  className={`min-h-12 shrink-0 border-b-2 px-3 text-sm font-semibold ${id === list ? "border-emerald-800 text-emerald-900" : "border-transparent text-slate-500 hover:text-slate-900"}`}
                >
                  {titles[id]}{" "}
                  <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    {model[id].length}
                  </span>
                </button>
              ))}
            </nav>
          </div>
          {shown.length ? (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      {[
                        "Dossier / client",
                        "Étape actuelle",
                        "Dernière avancée",
                        "Créé le",
                        "Action",
                      ].map((h) => (
                        <th
                          scope="col"
                          key={h}
                          className="whitespace-nowrap px-5 py-3.5 font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shown.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60">
                        <td className="max-w-xs px-5 py-4">
                          <Link
                            href={`/admin/dossiers/${row.id}`}
                            className="font-semibold text-emerald-900 hover:underline"
                          >
                            {row.request_code}
                          </Link>
                          <p className="mt-1 break-words text-xs text-slate-500">
                            {clientName(row)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <Status status={row.status} />
                        </td>
                        <td className="px-5 py-4">{urgency(row)}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                          {dateLabel(row.created_at)}
                        </td>
                        <td className="min-w-52 px-5 py-4">{action(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-slate-100 lg:hidden">
                {shown.map((row) => (
                  <article key={row.id} className="space-y-4 p-5">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <Link
                          href={`/admin/dossiers/${row.id}`}
                          className="text-sm font-bold text-emerald-900"
                        >
                          {row.request_code}
                        </Link>
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {clientName(row)}
                        </p>
                      </div>
                      <Status status={row.status} />
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-xs">
                      <span className="text-slate-500">
                        Créé le {dateLabel(row.created_at)}
                      </span>
                      {urgency(row)}
                    </div>
                    {action(row)}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="px-6 py-12 text-center">
              <Inbox className="mx-auto mb-3 text-slate-300" size={32} />
              <p className="font-semibold text-slate-700">
                {search
                  ? "Aucun dossier ne correspond à la recherche."
                  : list === "actions"
                    ? "Aucun dossier à traiter pour le moment."
                    : "Aucun dossier dans cette file."}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {list === "actions"
                  ? "Consultez la file commune ou les prochaines échéances."
                  : "Les dossiers correspondant à cette vue apparaîtront ici."}
              </p>
            </div>
          )}
          <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
            <span>
              {count
                ? `${(currentPage - 1) * 8 + 1}–${Math.min(currentPage * 8, count)} sur ${count}`
                : "0 résultat"}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Page précédente"
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              {currentPage} / {pages}
              <button
                type="button"
                aria-label="Page suivante"
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"
                disabled={currentPage === pages}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </section>
        <section className="grid gap-5 xl:grid-cols-3">
          <article
            id="dashboard-renewals"
            className="scroll-mt-6 rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Prochaines échéances
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Renouvellements ouverts · aujourd’hui à Istanbul
                </p>
              </div>
              <Link
                href="/admin/renouvellements"
                className="text-xs font-semibold text-emerald-800"
              >
                Tout consulter →
              </Link>
            </div>
            {model.renewals === null ? (
              <p
                role="status"
                className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
              >
                Les renouvellements sont indisponibles. Réessayez avec «
                Actualiser ».
              </p>
            ) : !renewals?.length ? (
              <p className="py-6 text-sm text-slate-500">
                Aucun renouvellement ouvert à échéance dans les sept jours.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {renewals.slice(0, 5).map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <Link
                        href={`/admin/dossiers/${r.requestId}`}
                        className="text-sm font-semibold text-emerald-900 hover:underline"
                      >
                        {r.requestCode}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        Échéance le {dateLabel(r.endDate)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.days! < 0 ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"}`}
                    >
                      {r.days! < 0
                        ? `Dépassée de ${-r.days!} j`
                        : r.days === 0
                          ? "Aujourd’hui"
                          : `Dans ${r.days} j`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {renewals && renewals.length > 5 && (
              <Link
                href="/admin/renouvellements"
                className="mt-3 inline-block text-xs font-semibold text-emerald-800"
              >
                Voir les {renewals.length} échéances →
              </Link>
            )}
            {model.renewals?.some((r) => r.days === null) && (
              <p role="status" className="mt-3 text-xs text-amber-800">
                Certains renouvellements n’ont pas de date exploitable.
              </p>
            )}
          </article>
          <aside className="rounded-xl border border-emerald-950 bg-emerald-950 p-5 text-white">
            <h2 className="text-base font-bold">Accès directs</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-100/75">
              L’essentiel pour poursuivre votre travail.
            </p>
            <div className="mt-5 space-y-2">
              {[
                ["/admin/paiements", "Vérifier les paiements"],
                ["/admin/polices", "Consulter les polices"],
                ["/admin/renouvellements", "Suivre les renouvellements"],
                ...(admin
                  ? [
                      ["/admin/comptabilite", "Ouvrir la comptabilité"],
                      ["/admin/agents", "Organiser l’équipe"],
                    ]
                  : []),
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-sm font-medium hover:bg-white/10"
                >
                  {label}
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          </aside>
        </section>
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                {admin
                  ? "Activité de l’entreprise"
                  : "Activité de mes dossiers"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Dossiers créés sur la période · comparaison sur une durée
                équivalente
              </p>
            </div>
            <div
              className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1"
              aria-label="Période d’analyse"
            >
              {periods.map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={period === id}
                  onClick={() => setPeriod(id)}
                  className={`min-h-9 rounded-md px-3 text-xs font-semibold ${period === id ? "bg-emerald-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div
            className={`grid gap-4 sm:grid-cols-2 ${admin ? "xl:grid-cols-3" : ""}`}
          >
            <Metric
              title="Dossiers créés"
              value={model.selected.length.toLocaleString("fr-FR")}
              description={`${trend} · période précédente comparable`}
              icon={<FileText size={20} />}
            />
            <Metric
              title="Polices disponibles"
              value={model.completed.toLocaleString("fr-FR")}
              description={
                model.completionRate === null
                  ? "Aucun dossier dans la période"
                  : `${(model.completionRate * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % des dossiers créés sur la période, dans leur état actuel`
              }
              icon={<FileCheck2 size={20} />}
            />
            {admin && (
              <Metric
                title="Encaissements confirmés"
                value={
                  data.payments === null
                    ? "Indisponible"
                    : money(model.collected)
                }
                description={
                  data.payments === null
                    ? "Lecture des paiements indisponible"
                    : `${model.paymentCount} paiement(s) confirmé(s) sur la période · hors rapprochement`
                }
                icon={<Wallet size={20} />}
              />
            )}
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Les sept derniers jours
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Jours calendaires à Istanbul · journée courante partielle
                  </p>
                </div>
                {admin && (
                  <label className="text-xs">
                    <span className="sr-only">Mesure du graphique</span>
                    <select
                      className={control}
                      value={chartMetric}
                      onChange={(e) =>
                        setChartMetric(
                          e.target.value as "requests" | "collected",
                        )
                      }
                    >
                      <option value="requests">Demandes</option>
                      <option value="collected">Encaissements (TL)</option>
                    </select>
                  </label>
                )}
              </div>
              <div
                className="mt-6 flex h-48 items-end gap-2 sm:gap-4"
                role="img"
                aria-label={
                  chartMetric === "requests"
                    ? "Demandes créées chaque jour, détail dans le tableau ci-dessous"
                    : "Encaissements quotidiens en livres turques, détail dans le tableau ci-dessous"
                }
              >
                {model.chart.map((d) => {
                  const value =
                    chartMetric === "requests" ? d.requests : d.collected;
                  return (
                    <div
                      key={d.date}
                      className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span className="text-[10px] font-semibold tabular-nums text-slate-500">
                        {value === null
                          ? "—"
                          : chartMetric === "requests"
                            ? value
                            : (value / 100).toLocaleString("fr-FR", {
                                notation: "compact",
                                maximumFractionDigits: 1,
                              })}
                      </span>
                      <div
                        className="w-full max-w-12 rounded-t-md bg-emerald-800"
                        style={{
                          height:
                            value === null
                              ? 0
                              : Math.max(
                                  value > 0 ? 3 : 0,
                                  (value / maxChart) * 130,
                                ),
                        }}
                      />
                      <span className="text-[10px] text-slate-500">
                        {d.date.slice(8)}/{d.date.slice(5, 7)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <details className="mt-5 border-t border-slate-100 pt-4">
                <summary className="cursor-pointer text-xs font-semibold text-emerald-800">
                  Voir les valeurs du graphique
                </summary>
                <table className="mt-3 w-full text-left text-xs">
                  <thead>
                    <tr>
                      <th scope="col" className="py-2">
                        Date
                      </th>
                      <th scope="col">Demandes</th>
                      {admin && <th scope="col">Encaissements</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {model.chart.map((d) => (
                      <tr key={d.date}>
                        <th scope="row" className="py-2 font-normal">
                          {dateLabel(d.date)}
                        </th>
                        <td>{d.requests}</td>
                        {admin && (
                          <td>
                            {data.payments === null
                              ? "Indisponible"
                              : money(d.collected)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-bold text-slate-950">
                Durée des assurances demandées
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Sur les dossiers créés dans la période
              </p>
              <div className="mt-5 space-y-5">
                {[1, 2].map((duration) => {
                  const value = model.selected.filter(
                    (r) => r.insurance_duration_years === duration,
                  ).length;
                  return (
                    <div key={duration}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>
                          {duration} an{duration === 2 ? "s" : ""}
                        </span>
                        <strong>{value}</strong>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-emerald-800"
                          style={{
                            width: `${model.selected.length ? (value / model.selected.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {model.selected.some(
                (r) => ![1, 2].includes(r.insurance_duration_years ?? 0),
              ) && (
                <p className="mt-3 text-xs text-amber-800">
                  Des dossiers ont une durée non renseignée.
                </p>
              )}
              {admin && (
                <details className="mt-6 border-t border-slate-100 pt-4">
                  <summary className="cursor-pointer text-xs font-semibold text-emerald-800">
                    Nationalités des dossiers de la période
                  </summary>
                  <ul className="mt-3 max-h-48 space-y-2 overflow-auto text-xs">
                    {model.nationalities.map((n) => (
                      <li key={n.label} className="flex justify-between gap-3">
                        <span>{n.label}</span>
                        <strong>{n.count}</strong>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <MonthlyReportButton
            loadedAt={data.loadedAt}
            scopeLabel={
              admin
                ? "Rapport de l’entreprise"
                : "Rapport de mes dossiers actuellement attribués"
            }
          />
        </section>
        <details className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
          <summary className="cursor-pointer font-semibold text-slate-700">
            Comprendre les indicateurs
          </summary>
          <div className="mt-4 space-y-2 text-xs leading-6 text-slate-500">
            <p>
              Les files de travail portent sur l’état actuel des dossiers et ne
              changent pas avec la période d’analyse. Les paiements attendus du
              client et les paiements refusés ont leurs propres files ; ils ne
              sont pas présentés comme du retard de l’équipe.
            </p>
            <p>
              Les repères de 5, 15 et 30 minutes sont des alertes
              opérationnelles, pas des engagements contractuels. Un envoi
              WhatsApp ne termine jamais un dossier. Les polices disponibles et
              dossiers annulés sont exclus des tâches à traiter.
            </p>
            <p>
              Les comparaisons utilisent une durée équivalente : pour le mois en
              cours, le même temps écoulé dans le mois précédent, plafonné à sa
              fin. Les sept jours du graphique sont indépendants du filtre
              d’analyse.
            </p>
            <p>
              {admin
                ? "Les encaissements correspondent aux montants attendus des paiements confirmés à leur date de confirmation ; ils ne représentent ni un bénéfice ni un CA comptable."
                : "Les indicateurs et le rapport portent uniquement sur vos dossiers actuellement attribués. Les nouvelles prises en charge apparaissent dans votre activité après actualisation."}
            </p>
          </div>
        </details>
        <p role="status" className="pb-4 text-xs text-slate-400">
          {refreshing
            ? "Actualisation en cours…"
            : `Données au ${new Date(data.loadedAt).toLocaleString("fr-FR", { timeZone: "Europe/Istanbul" })}`}{" "}
          · Actualisation chaque minute lorsque la page est visible.
        </p>
      </div>
    </main>
  );
}
function Status({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex h-fit rounded-full px-2.5 py-1 text-xs font-semibold ${status === "payment_rejected" ? "bg-rose-50 text-rose-800" : status === "policy_available" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
    >
      {statusLabels[status] ?? "Statut à vérifier"}
    </span>
  );
}
function Metric({
  title,
  value,
  description,
  icon,
  dark = false,
  onClick,
  href,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  dark?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      <div
        className={`flex justify-between gap-3 text-sm ${dark ? "text-emerald-100" : "text-slate-500"}`}
      >
        <span>{title}</span>
        {icon}
      </div>
      <p className="mt-4 break-words text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      <p
        className={`mt-3 text-xs leading-5 ${dark ? "text-emerald-100/75" : "text-slate-500"}`}
      >
        {description}
      </p>
    </>
  );
  const className = `block h-full w-full rounded-xl border p-5 text-left shadow-sm ${dark ? "border-emerald-950 bg-emerald-950 text-white" : "border-slate-200 bg-white"} ${onClick || href ? "transition hover:border-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" : ""}`;
  return href ? (
    <a href={href} className={className}>
      {content}
    </a>
  ) : onClick ? (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  ) : (
    <article className={className}>{content}</article>
  );
}
