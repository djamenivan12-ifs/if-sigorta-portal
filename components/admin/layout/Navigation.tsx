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
  Handshake,
  LayoutDashboard,
  RefreshCcw,
  Search,
  Settings,
  Tags,
  UserCog,
  Users,
  WalletCards,
} from "lucide-react";

type NavigationProps = {
  role: "admin" | "agent";

  urgentRenewalCount?: number;

  onNavigate?: () => void;
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
  onNavigate,
}: NavigationProps) {
  const pathname = usePathname();

  const links: NavigationLink[] = [
    {
      href: "/admin/dashboard",
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
      href: "/admin/grille-de-prix",
      label: "Grille de prix",
      icon: Tags,
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
      href: "/admin/comptabilite",
      label: "Comptabilité",
      icon: WalletCards,
      adminOnly: true,
    },
    {
      href: "/admin/partenaires",
      label: "Partenaires",
      icon: Handshake,
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

  function isActive(href: string) {
    return (
      pathname === href ||
      (pathname.startsWith(`${href}/`) &&
        !links.some(
          (link) =>
            link.href !== href &&
            link.href.startsWith(`${href}/`) &&
            (pathname === link.href || pathname.startsWith(`${link.href}/`)),
        ))
    );
  }

  const visibleLinks = links.filter(
    (link) => !link.adminOnly || role === "admin",
  );

  return (
    <nav
      aria-label="Navigation principale"
      className="space-y-1"
    >
      {visibleLinks.map((link) => {
        const Icon = link.icon;

        const active = isActive(link.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={[
              "group flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition sm:min-h-11 sm:gap-3 sm:px-3.5 sm:py-2.5 sm:text-sm lg:min-h-10 lg:gap-2 lg:px-2.5 lg:py-1.5 lg:text-[13px]",
              active
                ? "bg-brand-lime text-brand-navy shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <div
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition sm:h-8 sm:w-8 lg:h-8 lg:w-8",
                active
                  ? "bg-brand-navy/10 text-brand-navy"
                  : "bg-transparent text-white/50 group-hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-4 w-4 sm:h-[17px] sm:w-[17px] lg:h-[17px] lg:w-[17px]" />
            </div>

            <span className="min-w-0 flex-1 truncate">{link.label}</span>

            {typeof link.badge === "number" && link.badge > 0 && (
              <span
                className={[
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black sm:min-w-6 sm:px-2 sm:text-[11px] lg:min-w-6 lg:px-2 lg:text-[11px]",
                  active ? "bg-white text-red-600" : "bg-red-500 text-white",
                ].join(" ")}
              >
                {link.badge > 99 ? "99+" : link.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
