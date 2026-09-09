import Link from "next/link";

import {
  BarChart3,
  FilePlus2,
  FileSearch,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon:
    | "new"
    | "requests"
    | "payments"
    | "policies"
    | "clients"
    | "stats";
};

const defaultActions: QuickAction[] = [
  {
    title: "Nouvelle demande",
    description: "Créer un nouveau dossier.",
    href: "/demande/etape-1",
    icon: "new",
  },
  {
    title: "Voir les dossiers",
    description: "Consulter et traiter les demandes.",
    href: "/admin/dossiers",
    icon: "requests",
  },
  {
    title: "Paiements",
    description: "Vérifier les dekonts.",
    href: "/admin/paiements",
    icon: "payments",
  },
  {
    title: "Polices",
    description: "Préparer les assurances.",
    href: "/admin/polices",
    icon: "policies",
  },
  {
    title: "Clients",
    description: "Consulter la base clients.",
    href: "/admin/clients",
    icon: "clients",
  },
  {
    title: "Statistiques",
    description: "Analyser l’activité.",
    href: "/admin/statistiques",
    icon: "stats",
  },
];

export default function DashboardQuickActions({
  actions = defaultActions,
}: {
  actions?: QuickAction[];
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.5rem] sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
        Accès rapide
      </p>

      <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:mt-2 sm:text-xl">
        Actions rapides
      </h2>

      <div className="mt-4 space-y-1.5 sm:mt-5 sm:space-y-2">
        {actions.map(
          (action) => (
            <QuickActionItem
              key={action.title}
              action={action}
            />
          ),
        )}
      </div>
    </section>
  );
}

function QuickActionItem({
  action,
}: {
  action: QuickAction;
}) {
  const config = {
    new: FilePlus2,
    requests: FileSearch,
    payments: ReceiptText,
    policies: ShieldCheck,
    clients: Users,
    stats: BarChart3,
  }[action.icon];

  const Icon = config;

  return (
    <Link
      href={action.href}
      className="group flex min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition hover:bg-[#F3F8F2] sm:gap-3 sm:px-3 sm:py-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF6EC] text-[#0B5D3B] sm:h-9 sm:w-9">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-5 text-slate-800 sm:text-sm">
          {action.title}
        </p>

        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-400 sm:text-xs">
          {action.description}
        </p>
      </div>

      <span className="shrink-0 text-sm text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0B5D3B] sm:text-base">
        →
      </span>
    </Link>
  );
}