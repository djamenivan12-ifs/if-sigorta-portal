"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BarChart3,
  Bell,
  CreditCard,
  FileCheck2,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  RefreshCcw,
  Search,
  Settings,
  UserCog,
  Users,
} from "lucide-react";

type NavigationProps = {
  role: "admin" | "agent";
  urgentRenewalCount?: number;
};

type NavigationLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  badge?: number;
};

export default function Navigation({
  role,
  urgentRenewalCount = 0,
}: NavigationProps) {
  const pathname = usePathname();

  const links: NavigationLink[] = [
    {
      href: "/admin/tableau-de-bord",
      label: "Tableau de bord",
      icon: LayoutDashboard,
    },

    {
      href: "/admin/dossiers",
      label: "Dossiers",
      icon: FolderOpen,
    },

    {
      href: "/admin/paiements",
      label: "Paiements",
      icon: CreditCard,
    },

    {
      href: "/admin/polices",
      label: "Polices",
      icon: FileCheck2,
    },

    {
      href: "/admin/clients",
      label: "Clients",
      icon: Users,
    },

    {
      href: "/admin/renouvellements",
      label: "Renouvellements",
      icon: RefreshCcw,
      badge: urgentRenewalCount,
    },

    {
      href: "/admin/recherche",
      label: "Recherche",
      icon: Search,
    },

    {
      href: "/admin/notifications",
      label: "Notifications",
      icon: Bell,
    },

    {
      href: "/admin/statistiques",
      label: "Statistiques",
      icon: BarChart3,
      adminOnly: true,
    },

    {
      href: "/admin/agents",
      label: "Agents",
      icon: UserCog,
      adminOnly: true,
    },

    {
      href: "/admin/agents/performance",
      label: "Performance agents",
      icon: Gauge,
      adminOnly: true,
    },

    {
      href: "/admin/parametres",
      label: "Paramètres",
      icon: Settings,
      adminOnly: true,
    },
  ];

  function isActive(
    href: string,
  ) {
    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`,
      )
    );
  }

  const visibleLinks =
    links.filter(
      (link) =>
        !link.adminOnly ||
        role === "admin",
    );

  return (
    <nav className="space-y-1">
      {visibleLinks.map(
        (link) => {
          const Icon = link.icon;

          const active =
            isActive(
              link.href,
            );

          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-[#2F2963] text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <Icon className="h-5 w-5 shrink-0" />

              <span className="min-w-0 flex-1 truncate">
                {link.label}
              </span>

              {typeof link.badge ===
                "number" &&
                link.badge > 0 && (
                  <span
                    className={[
                      "inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
                      active
                        ? "bg-white text-red-600"
                        : "bg-red-500 text-white",
                    ].join(" ")}
                  >
                    {link.badge > 99
                      ? "99+"
                      : link.badge}
                  </span>
                )}
            </Link>
          );
        },
      )}
    </nav>
  );
}