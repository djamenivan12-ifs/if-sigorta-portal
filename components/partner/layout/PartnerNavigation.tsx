"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  FilePlus2,
  FolderOpen,
  LayoutDashboard,
  UserRound,
} from "lucide-react";

type PartnerNavigationProps = {
  onNavigate?: () => void;
};

const links = [
  {
    href:
      "/partenaire/tableau-de-bord",
    label:
      "Tableau de bord",
    icon:
      LayoutDashboard,
  },
  {
    href:
      "/partenaire/dossiers",
    label:
      "Mes dossiers",
    icon:
      FolderOpen,
  },
  {
    href:
      "/partenaire/nouvelle-demande",
    label:
      "Nouvelle demande",
    icon:
      FilePlus2,
  },
  {
    href:
      "/partenaire/profil",
    label:
      "Mon profil",
    icon:
      UserRound,
  },
];

export default function PartnerNavigation({
  onNavigate,
}: PartnerNavigationProps) {
  const pathname =
    usePathname();

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

  return (
    <nav aria-label="Navigation partenaire" className="space-y-1">
      {links.map(
        (link) => {
          const Icon =
            link.icon;

          const active =
            isActive(
              link.href,
            );

          return (
            <Link
              aria-current={active ? "page" : undefined}
              key={
                link.href
              }
              href={
                link.href
              }
              onClick={
                onNavigate
              }
              className={[
                "group flex min-h-11 items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition",
                active
                  ? "bg-brand-lime text-brand-navy shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              ].join(
                " ",
              )}
            >
              <div
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                  active
                    ? "bg-brand-navy/10 text-brand-navy"
                    : "bg-transparent text-white/50 group-hover:text-white",
                ].join(
                  " ",
                )}
              >
                <Icon className="h-[17px] w-[17px]" />
              </div>

              <span className="min-w-0 flex-1 truncate">
                {
                  link.label
                }
              </span>
            </Link>
          );
        },
      )}
    </nav>
  );
}