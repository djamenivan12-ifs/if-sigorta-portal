"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileCheck2,
  FolderOpen,
  Inbox,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import {
  clientName,
  dashboard,
  statusLabels,
  waitLabel,
  type ActivityRow,
  type DashboardData,
  type Period,
} from "@/lib/dashboard/model";
import {
  adminOverview,
  type OverviewFilter,
  type TeamMember,
} from "@/lib/dashboard/adminOverview";
import { dateLabel } from "@/lib/accounting/model";

const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-navy transition hover:bg-brand-ice disabled:opacity-40";
const card = "rounded-xl border border-brand-border bg-white";
const filters: { key: OverviewFilter; label: string }[] = [
  { key: "actions", label: "À traiter" },
  { key: "queue", label: "Non affectés" },
  { key: "payments", label: "Paiements" },
  { key: "policies", label: "Polices" },
  { key: "new", label: "Nouveaux" },
];
const activityLabels: Record<string, string> = {
  request_created: "Dossier créé",
  payment_uploaded: "Justificatif de paiement reçu",
  payment_confirmed: "Paiement confirmé",
  policy_preparation_started: "Préparation de la police",
  request_claimed: "Dossier pris en charge",
  policy_uploaded_year_1: "Police année 1 ajoutée",
  policy_uploaded_year_2: "Police année 2 ajoutée",
  policy_replaced_year_1: "Police année 1 remplacée",
  policy_replaced_year_2: "Police année 2 remplacée",
};

export default function AdminOverview({
  data,
  team,
  activity,
}: {
  data: DashboardData;
  team: TeamMember[] | null;
  activity: ActivityRow[] | null;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [period, setPeriod] = useState<Period>("today");
  const [filter, setFilter] = useState<OverviewFilter>("actions");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
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
  const overview = adminOverview(data, period, team);
  const { model, workload } = overview;
  const today = period === "today" ? model : dashboard(data, "today");
  const teamById = new Map(team?.map((member) => [member.id, member.name]));
  const agentName = (id: string | null) =>
    id === null ? "Non affecté" : (teamById.get(id) ?? "Compte non disponible");
  const rows = overview.lists[filter].filter((row) =>
    `${row.request_code} ${clientName(row)} ${agentName(row.assigned_agent_id)}`
      .toLocaleLowerCase("fr")
      .includes(query.trim().toLocaleLowerCase("fr")),
  );
  const pages = Math.max(1, Math.ceil(rows.length / 6));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * 6, current * 6);
  const ages = new Map(model.actions.map((row) => [row.id, row.age]));
  const requests = new Map(data.requests.map((row) => [row.id, row]));
  const maxWorkload = Math.max(
    1,
    ...(workload ?? []).map((member) => member.count),
  );
  const renewals =
    model.renewals?.filter((row) => row.days !== null && row.days <= 7) ?? null;
  function selectFilter(value: OverviewFilter, scroll = false) {
    setFilter(value);
    setPage(1);
    setQuery("");
    if (scroll)
      document
        .getElementById("admin-supervision")
        ?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
  }
  const metrics = [
    {
      key: "new" as const,
      title: "Nouveaux dossiers",
      value: model.selected.length,
      hint: "Sur la période sélectionnée",
      Icon: FolderOpen,
      tone: "bg-sky-50 text-sky-800",
    },
    {
      key: "payments" as const,
      title: "Paiements à vérifier",
      value: overview.payments.length,
      hint: "Dossiers en attente de vérification",
      Icon: CreditCard,
      tone: "bg-amber-50 text-amber-800",
    },
    {
      key: "policies" as const,
      title: "Polices à préparer",
      value: overview.policies.length,
      hint: "Assureur à choisir ou police à préparer",
      Icon: FileCheck2,
      tone: "bg-emerald-50 text-emerald-800",
    },
    {
      key: "queue" as const,
      title: "Dossiers non affectés",
      value: model.queue.length,
      hint: "Demandes de la file commune",
      Icon: Users,
      tone: "bg-rose-50 text-rose-800",
    },
  ];
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1540px] space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Vue d’ensemble
            </h1>
            <p className="mt-2 text-sm leading-6 text-brand-muted">
              Bonjour {data.userName}. Suivez les dossiers et coordonnez votre
              équipe.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="overview-period">
              Période des nouveaux dossiers
            </label>
            <select
              id="overview-period"
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value as Period);
                setPage(1);
              }}
              className={button}
            >
              <option value="today">Aujourd’hui</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="month">Ce mois</option>
            </select>
            <button
              type="button"
              className={button}
              disabled={refreshing}
              onClick={() => startRefresh(() => router.refresh())}
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
              <span>{refreshing ? "Actualisation…" : "Actualiser"}</span>
            </button>
          </div>
        </header>
        <section
          aria-label="Indicateurs de supervision"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {metrics.map(({ key, title, value, hint, Icon, tone }) => (
            <button
              key={key}
              type="button"
              onClick={() => selectFilter(key, true)}
              className={`${card} flex items-start gap-4 p-5 text-left transition hover:border-brand-navy`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}
              >
                <Icon size={21} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium leading-5 text-brand-muted">
                  {title}
                </span>
                <strong className="mt-1 block text-3xl font-bold tabular-nums">
                  {value.toLocaleString("fr-FR")}
                </strong>
                <span className="mt-2 block text-[11px] leading-4 text-brand-muted">
                  {hint}
                </span>
              </span>
            </button>
          ))}
        </section>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section
            id="admin-supervision"
            className={`${card} min-w-0 scroll-mt-36 overflow-hidden`}
          >
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Dossiers à superviser</h2>
                  <p className="mt-1 text-xs leading-5 text-brand-muted">
                    {filter === "new"
                      ? "Dossiers créés sur la période sélectionnée, du plus récent au plus ancien."
                      : filter === "queue"
                        ? "Dossiers disponibles, du plus ancien au plus récent."
                        : "Les plus longues attentes depuis la dernière avancée apparaissent en premier."}
                  </p>
                </div>
                <Link
                  href="/admin/dossiers"
                  className="text-xs font-semibold hover:underline"
                >
                  Tous les dossiers →
                </Link>
              </div>
              <div
                className="flex flex-wrap gap-2"
                aria-label="Filtrer les dossiers"
              >
                {filters.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    aria-pressed={filter === item.key}
                    onClick={() => selectFilter(item.key)}
                    className={`min-h-10 rounded-lg px-3 text-xs font-semibold ${filter === item.key ? "bg-brand-navy text-white" : "bg-brand-ice text-brand-muted hover:bg-slate-100"}`}
                  >
                    {item.label}{" "}
                    <span className="ml-1 opacity-70">
                      {overview.lists[item.key].length}
                    </span>
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-3 text-brand-muted"
                />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  type="search"
                  aria-label="Filtrer par dossier, client ou agent"
                  placeholder="Filtrer par dossier, client ou agent…"
                  className="h-10 w-full rounded-lg border border-brand-border pl-10 pr-3 text-sm"
                />
              </div>
            </div>
            {data.activities === null && (
              <p
                role="status"
                className="mx-5 mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"
              >
                Historique indisponible : les délais ne peuvent pas être
                calculés.
              </p>
            )}
            {team === null && (
              <p
                role="status"
                className="mx-5 mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"
              >
                Les noms des agents sont temporairement indisponibles.
              </p>
            )}
            {shown.length ? (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">
                      {filters.find((item) => item.key === filter)?.label}
                    </caption>
                    <thead className="text-brand-muted">
                      <tr>
                        {[
                          "Dossier / Client",
                          "Agent",
                          "État actuel",
                          "Attente",
                          "Action",
                        ].map((label) => (
                          <th
                            scope="col"
                            key={label}
                            className="px-4 py-3 font-semibold"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shown.map((row) => (
                        <tr key={row.id} className="hover:bg-brand-ice/50">
                          <td className="px-4 py-4">
                            <Link
                              href={`/admin/dossiers/${row.id}`}
                              className="font-bold hover:underline"
                            >
                              {row.request_code}
                            </Link>
                            <p className="mt-1 max-w-44 break-words leading-5 text-brand-muted">
                              {clientName(row)}
                            </p>
                          </td>
                          <td className="max-w-36 break-words px-4 py-4 text-brand-muted">
                            {agentName(row.assigned_agent_id)}
                          </td>
                          <td className="px-4 py-4">
                            <Status status={row.status} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-brand-muted">
                            {ages.has(row.id)
                              ? waitLabel(ages.get(row.id) ?? null)
                              : "—"}
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              className={button}
                              href={`/admin/dossiers/${row.id}`}
                            >
                              Ouvrir
                              <span className="sr-only">
                                {" "}
                                {row.request_code}
                              </span>
                              <ArrowRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-slate-100 lg:hidden">
                  {shown.map((row) => (
                    <article key={row.id} className="space-y-3 p-5">
                      <div className="flex flex-wrap justify-between gap-2">
                        <Link
                          href={`/admin/dossiers/${row.id}`}
                          className="text-sm font-bold"
                        >
                          {row.request_code}
                        </Link>
                        <Status status={row.status} />
                      </div>
                      <p className="text-sm">{clientName(row)}</p>
                      <div className="flex flex-wrap justify-between gap-2 text-xs text-brand-muted">
                        <span>Agent : {agentName(row.assigned_agent_id)}</span>
                        {ages.has(row.id) && (
                          <span>
                            Attente : {waitLabel(ages.get(row.id) ?? null)}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/admin/dossiers/${row.id}`}
                        className={`${button} w-full`}
                      >
                        Ouvrir le dossier <ArrowRight size={14} />
                      </Link>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="px-5 py-12 text-center">
                <Inbox size={28} className="mx-auto mb-3 text-brand-soft" />
                <p className="text-sm font-semibold">
                  {query
                    ? "Aucun dossier ne correspond à votre recherche."
                    : "Aucun dossier dans cette file."}
                </p>
              </div>
            )}
            <footer className="flex items-center justify-between gap-2 border-t border-brand-border p-4 text-xs text-brand-muted">
              <span role="status">
                {rows.length} dossier{rows.length !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Page précédente"
                  className={button}
                  disabled={current === 1}
                  onClick={() => setPage(current - 1)}
                >
                  <ChevronLeft size={15} />
                </button>
                <span>
                  {current} / {pages}
                </span>
                <button
                  type="button"
                  aria-label="Page suivante"
                  className={button}
                  disabled={current === pages}
                  onClick={() => setPage(current + 1)}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </footer>
          </section>
          <aside className={`${card} p-5`}>
            <h2 className="text-lg font-bold">Charge de l’équipe</h2>
            <p className="mt-1 text-xs leading-5 text-brand-muted">
              Dossiers attribués nécessitant une action interne
            </p>
            {workload === null ? (
              <p role="status" className="mt-5 text-sm text-amber-800">
                Équipe temporairement indisponible.
              </p>
            ) : !workload.length ? (
              <p className="mt-5 text-sm text-brand-muted">
                Aucun compte interne disponible.
              </p>
            ) : (
              <ul className="mt-3 max-h-96 overflow-y-auto">
                {workload.map((member) => (
                  <li
                    key={member.id}
                    className="border-b border-slate-100 py-4"
                  >
                    <Link
                      href={`/admin/agents/${member.id}`}
                      className="flex justify-between gap-3 text-sm hover:underline"
                    >
                      <span className="min-w-0 break-words font-semibold">
                        {member.name}
                        {member.role === "admin" && (
                          <span className="mt-1 block text-[10px] font-normal text-brand-muted">
                            Administrateur
                          </span>
                        )}
                      </span>
                      <strong className="tabular-nums">{member.count}</strong>
                    </Link>
                    <div
                      aria-hidden="true"
                      className="mt-3 h-2 overflow-hidden rounded-full bg-brand-ice"
                    >
                      <div
                        className="h-full rounded-full bg-brand-navy"
                        style={{
                          width: `${(member.count / maxWorkload) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {overview.unknownAssignments > 0 && (
              <p className="mt-3 text-xs text-amber-800">
                {overview.unknownAssignments} dossier(s) attribué(s) à un compte
                absent de l’annuaire.
              </p>
            )}
            <Link href="/admin/agents" className={`${button} mt-5 w-full`}>
              Voir les agents <ArrowRight size={14} />
            </Link>
          </aside>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <section className={`${card} p-5`}>
            <h2 className="text-lg font-bold">Paiements du jour</h2>
            <p className="mt-1 text-xs text-brand-muted">
              Aujourd’hui à Istanbul
            </p>
            <div className="my-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-brand-border p-4">
                <p className="text-xs text-brand-muted">
                  Confirmés aujourd’hui
                </p>
                <strong className="mt-2 block text-2xl">
                  {today.paymentCount ?? "Indisponible"}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => selectFilter("payments", true)}
                className="rounded-lg border border-brand-border p-4 text-left hover:bg-brand-ice"
              >
                <span className="block text-xs text-brand-muted">
                  Dossiers à vérifier · total
                </span>
                <strong className="mt-2 block text-2xl">
                  {overview.payments.length}
                </strong>
              </button>
            </div>
            <Link className={`${button} w-full`} href="/admin/paiements">
              Voir les paiements <ArrowRight size={14} />
            </Link>
          </section>
          <section className={`${card} p-5`}>
            <h2 className="text-lg font-bold">Activité récente</h2>
            <p className="mt-1 text-xs text-brand-muted">
              Dernières avancées enregistrées
            </p>
            {activity === null ? (
              <p role="status" className="mt-5 text-sm text-amber-800">
                Historique temporairement indisponible.
              </p>
            ) : !activity.length ? (
              <p className="mt-5 text-sm text-brand-muted">
                Aucune activité enregistrée.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {activity.slice(0, 4).map((event) => (
                  <li key={event.id} className="flex items-start gap-3 py-3">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-lime"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">
                        {activityLabels[event.action] ?? "Dossier mis à jour"}
                        {requests.has(event.request_id) && (
                          <>
                            {" "}
                            ·{" "}
                            <Link
                              className="hover:underline"
                              href={`/admin/dossiers/${event.request_id}`}
                            >
                              {requests.get(event.request_id)?.request_code}
                            </Link>
                          </>
                        )}
                      </p>
                      <time
                        dateTime={event.created_at}
                        className="mt-1 block text-[11px] text-brand-muted"
                      >
                        {new Date(event.created_at).toLocaleString("fr-FR", {
                          timeZone: "Europe/Istanbul",
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <section className={`${card} p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Renouvellements à suivre</h2>
            <Link
              href="/admin/renouvellements"
              className="text-xs font-semibold hover:underline"
            >
              Tout consulter →
            </Link>
          </div>
          <p className="mt-1 text-xs text-brand-muted">
            Échéance dans les 7 jours ou déjà dépassée
          </p>
          {renewals === null ? (
            <p role="status" className="mt-4 text-sm text-amber-800">
              Renouvellements temporairement indisponibles.
            </p>
          ) : !renewals.length ? (
            <p className="mt-4 text-sm text-brand-muted">
              Aucun renouvellement à suivre sur cette période.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {renewals.slice(0, 4).map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/admin/dossiers/${row.requestId}`}
                    className="block rounded-lg border border-brand-border p-3 hover:bg-brand-ice"
                  >
                    <strong className="text-sm">{row.requestCode}</strong>
                    <span className="mt-1 block text-xs text-brand-muted">
                      Échéance : {dateLabel(row.endDate)}
                    </span>
                    <span
                      className={`mt-2 block text-xs font-semibold ${row.days! < 0 ? "text-rose-800" : "text-amber-800"}`}
                    >
                      {row.days! < 0
                        ? `Dépassée de ${-row.days!} j`
                        : row.days === 0
                          ? "Aujourd’hui"
                          : `Dans ${row.days} j`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {model.renewals?.some((row) => row.days === null) && (
            <p className="mt-3 text-xs text-amber-800">
              Certains renouvellements n’ont pas de date exploitable.
            </p>
          )}
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <p role="status" className="text-xs leading-5 text-brand-muted">
            Données au{" "}
            {new Date(data.loadedAt).toLocaleString("fr-FR", {
              timeZone: "Europe/Istanbul",
            })}
            <br />
            Actualisation chaque minute. Les files à traiter portent sur tous
            les dossiers en cours.
          </p>
          <Link href="/admin/dashboard?view=analysis" className={button}>
            Analyses et rapports détaillés <ArrowRight size={14} />
          </Link>
        </footer>
      </div>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const tone =
    status === "payment_review"
      ? "bg-amber-50 text-amber-900"
      : ["payment_confirmed", "policy_preparation"].includes(status)
        ? "bg-sky-50 text-sky-900"
        : status === "policy_available"
          ? "bg-emerald-50 text-emerald-900"
          : status === "payment_rejected"
            ? "bg-rose-50 text-rose-900"
            : "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1.5 text-[11px] font-medium ${tone}`}
    >
      {statusLabels[status] ?? "Statut à vérifier"}
    </span>
  );
}
