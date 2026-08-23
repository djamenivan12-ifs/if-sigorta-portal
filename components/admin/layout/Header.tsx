"use client";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  FormEvent,
  useState,
} from "react";

import UserMenu from "./UserMenu";

import {
  Bell,
  Globe2,
  Menu,
  Plus,
  Search,
} from "lucide-react";

import type {
  NotificationLevel,
} from "@/lib/admin/getNotificationSummary";

type HeaderProps = {
  userEmail?:
    | string
    | null;

  role:
    | "admin"
    | "agent";

  notificationCount:
    number;

  notificationLevel:
    NotificationLevel;
};

export default function Header({
  userEmail,
  role,
  notificationCount,
  notificationLevel,
}: HeaderProps) {
  const router =
    useRouter();

  const [
    desktopSearch,
    setDesktopSearch,
  ] =
    useState("");

  const [
    mobileSearch,
    setMobileSearch,
  ] =
    useState("");

  function submitSearch(
    event:
      FormEvent<HTMLFormElement>,
    value: string,
  ) {
    event.preventDefault();

    const query =
      value.trim();

    if (!query) {
      router.push(
        "/admin/recherche",
      );

      return;
    }

    router.push(
      `/admin/recherche?q=${encodeURIComponent(
        query,
      )}`,
    );
  }

  const notificationBadgeClassName =
    getNotificationBadgeClassName(
      notificationLevel,
    );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="flex h-20 items-center gap-4 px-5 lg:px-8">
        {/* Menu mobile */}
        <button
          type="button"
          aria-label="Ouvrir le menu"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-50 lg:hidden"
        >
          <Menu className="h-5 w-5 text-slate-600" />
        </button>

        {/* Recherche desktop */}
        <div className="hidden min-w-0 flex-1 lg:block">
          <form
            onSubmit={(
              event,
            ) =>
              submitSearch(
                event,
                desktopSearch,
              )
            }
            className="relative max-w-2xl"
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={
                desktopSearch
              }
              onChange={(
                event,
              ) =>
                setDesktopSearch(
                  event.target.value,
                )
              }
              placeholder="Matricule, client, WhatsApp, passeport, Kimlik..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-28 text-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#2F2963] focus:bg-white focus:ring-4 focus:ring-[#2F2963]/10"
            />

            <button
              type="submit"
              className="absolute right-1.5 top-1/2 inline-flex h-9 -translate-y-1/2 items-center justify-center rounded-xl bg-[#2F2963] px-4 text-xs font-semibold text-white transition hover:bg-[#24204F]"
            >
              Rechercher
            </button>
          </form>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Nouvelle demande */}
          <Link
            href="/demande/etape-1"
            className="hidden items-center gap-2 rounded-xl bg-[#18C100] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#13a300] md:flex"
          >
            <Plus className="h-4 w-4" />

            Nouvelle demande
          </Link>

          {/* Langue */}
          <button
            type="button"
            className="hidden h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:flex"
          >
            <Globe2 className="h-4 w-4" />

            FR
          </button>

          {/* Notifications */}
          <Link
            href="/admin/notifications"
            aria-label={
              notificationCount > 0
                ? `${notificationCount} notification${notificationCount > 1 ? "s" : ""}`
                : "Notifications"
            }
            title={
              notificationCount > 0
                ? `${notificationCount} dossier${notificationCount > 1 ? "s" : ""} nécessite${notificationCount > 1 ? "nt" : ""} votre attention`
                : "Aucune notification"
            }
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-50"
          >
            <Bell
              className={`h-5 w-5 ${
                notificationLevel ===
                "critical"
                  ? "text-red-600"
                  : notificationLevel ===
                      "late"
                    ? "text-orange-600"
                    : notificationLevel ===
                        "watch"
                      ? "text-amber-600"
                      : "text-slate-700"
              }`}
            />

            {notificationCount >
              0 && (
              <span
                className={`absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-bold shadow-sm ring-2 ring-white ${notificationBadgeClassName}`}
              >
                {notificationCount >
                99
                  ? "99+"
                  : notificationCount}
              </span>
            )}
          </Link>

          {/* Utilisateur */}
          <UserMenu
            userEmail={
              userEmail
            }
            role={
              role
            }
          />
        </div>
      </div>

      {/* Recherche mobile */}
      <div className="border-t border-slate-100 p-4 lg:hidden">
        <form
          onSubmit={(
            event,
          ) =>
            submitSearch(
              event,
              mobileSearch,
            )
          }
          className="flex gap-2"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={
                mobileSearch
              }
              onChange={(
                event,
              ) =>
                setMobileSearch(
                  event.target.value,
                )
              }
              placeholder="Rechercher..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-[#2F2963] focus:bg-white focus:ring-4 focus:ring-[#2F2963]/10"
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#2F2963] px-4 text-sm font-semibold text-white transition hover:bg-[#24204F]"
          >
            <Search className="h-4 w-4 sm:hidden" />

            <span className="hidden sm:inline">
              Rechercher
            </span>
          </button>
        </form>
      </div>
    </header>
  );
}

function getNotificationBadgeClassName(
  level:
    NotificationLevel,
) {
  switch (level) {
    case "critical":
      return "bg-red-500 text-white";

    case "late":
      return "bg-orange-500 text-white";

    case "watch":
      return "bg-amber-400 text-amber-950";

    default:
      return "bg-slate-500 text-white";
  }
}