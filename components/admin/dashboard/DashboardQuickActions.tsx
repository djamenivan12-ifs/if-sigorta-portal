import Link from "next/link";
import {
  FilePlus2,
  FileSearch,
  ReceiptText,
  ShieldCheck,
  Users,
  BarChart3,
} from "lucide-react";

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: "new" | "requests" | "payments" | "policies" | "clients" | "stats";
};

type DashboardQuickActionsProps = {
  actions?: QuickAction[];
};

const defaultActions: QuickAction[] = [
  {
    title: "Nouvelle demande",
    description:
      "Créer un nouveau dossier d’assurance.",
    href: "/demande/etape-1",
    icon: "new",
  },
  {
    title: "Voir les dossiers",
    description:
      "Consulter et traiter les demandes.",
    href: "/admin/dossiers",
    icon: "requests",
  },
  {
    title: "Paiements",
    description:
      "Vérifier les dekonts en attente.",
    href: "/admin/paiements",
    icon: "payments",
  },
  {
    title: "Polices",
    description:
      "Préparer et déposer les assurances.",
    href: "/admin/polices",
    icon: "policies",
  },
  {
    title: "Clients",
    description:
      "Consulter la base des clients.",
    href: "/admin/clients",
    icon: "clients",
  },
  {
    title: "Statistiques",
    description:
      "Analyser l’activité du portail.",
    href: "/admin/statistiques",
    icon: "stats",
  },
];

export default function DashboardQuickActions({
  actions = defaultActions,
}: DashboardQuickActionsProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Accès rapide
        </p>

        <h2 className="mt-2 text-xl font-bold text-slate-950">
          Actions rapides
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          Accédez directement aux principales fonctions du portail.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {actions.map((action) => (
          <QuickActionItem
            key={action.title}
            action={action}
          />
        ))}
      </div>
    </section>
  );
}

type QuickActionItemProps = {
  action: QuickAction;
};

function QuickActionItem({
  action,
}: QuickActionItemProps) {
  const iconConfiguration = {
    new: {
      icon: (
        <FilePlus2 className="h-5 w-5" />
      ),
      className:
        "bg-blue-100 text-blue-700",
    },

    requests: {
      icon: (
        <FileSearch className="h-5 w-5" />
      ),
      className:
        "bg-slate-100 text-slate-700",
    },

    payments: {
      icon: (
        <ReceiptText className="h-5 w-5" />
      ),
      className:
        "bg-amber-100 text-amber-700",
    },

    policies: {
      icon: (
        <ShieldCheck className="h-5 w-5" />
      ),
      className:
        "bg-emerald-100 text-emerald-700",
    },

    clients: {
      icon: (
        <Users className="h-5 w-5" />
      ),
      className:
        "bg-violet-100 text-violet-700",
    },

    stats: {
      icon: (
        <BarChart3 className="h-5 w-5" />
      ),
      className:
        "bg-cyan-100 text-cyan-700",
    },
  }[action.icon];

  return (
    <Link
      href={action.href}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/50"
    >
      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          iconConfiguration.className,
        ].join(" ")}
      >
        {iconConfiguration.icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">
          {action.title}
        </p>

        <p className="mt-1 text-sm leading-5 text-slate-600">
          {action.description}
        </p>
      </div>

      <span className="text-lg text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700">
        →
      </span>
    </Link>
  );
}