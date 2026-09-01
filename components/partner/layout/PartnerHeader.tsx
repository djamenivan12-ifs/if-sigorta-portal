"use client";

import Link from "next/link";

import {
  FilePlus2,
  Menu,
  UserRound,
} from "lucide-react";

type PartnerHeaderProps = {
  managerName: string;
  companyName: string;

  onOpenMobileMenu:
    () => void;
};

export default function PartnerHeader({
  managerName,
  companyName,
  onOpenMobileMenu,
}: PartnerHeaderProps) {
  const initial =
    managerName
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "P";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="flex h-20 items-center gap-3 px-4 sm:px-5 lg:px-8">
        <button
          type="button"
          aria-label="Ouvrir le menu"
          onClick={
            onOpenMobileMenu
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden min-w-0 flex-1 lg:block">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Espace partenaire
          </p>

          <p className="mt-1 truncate text-sm font-bold text-[#123F2C]">
            {
              companyName
            }
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/partenaire/nouvelle-demande"
            className="hidden min-h-11 items-center gap-2 rounded-xl bg-[#B8E83D] px-4 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E] sm:flex"
          >
            <FilePlus2 className="h-4 w-4" />

            Nouvelle demande
          </Link>

          <Link
            href="/partenaire/profil"
            className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 transition hover:bg-slate-50 sm:px-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F8F2] text-xs font-black text-[#0B5D3B]">
              {
                initial
              }
            </div>

            <div className="hidden min-w-0 text-left md:block">
              <p className="max-w-[180px] truncate text-xs font-bold text-slate-700">
                {
                  managerName
                }
              </p>

              <p className="text-[10px] font-semibold text-slate-400">
                Partenaire
              </p>
            </div>

            <UserRound className="hidden h-4 w-4 text-slate-400 md:block" />
          </Link>
        </div>
      </div>
    </header>
  );
}