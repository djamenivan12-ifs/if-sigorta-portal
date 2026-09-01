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
    <nav className="space-y-1.5">
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
                "group flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                active
                  ? "bg-[#123F2C] text-white shadow-sm"
                  : "text-slate-600 hover:bg-[#F3F8F2] hover:text-[#123F2C]",
              ].join(
                " ",
              )}
            >
              <div
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                  active
                    ? "bg-white/10 text-[#B8E83D]"
                    : "bg-slate-50 text-slate-500 group-hover:bg-white group-hover:text-[#0B5D3B]",
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