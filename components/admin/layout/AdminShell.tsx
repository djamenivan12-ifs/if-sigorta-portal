"use client";

import type {
  ReactNode,
} from "react";

import {
  useEffect,
  useState,
} from "react";

import {
  X,
} from "lucide-react";

import Header from "./Header";
import Sidebar from "./Sidebar";

import type {
  NotificationLevel,
} from "@/lib/admin/getNotificationSummary";

type AdminShellProps = {
  children: ReactNode;

  role:
    | "admin"
    | "agent";

  userEmail?:
    | string
    | null;

  urgentRenewalCount:
    number;

  notificationCount:
    number;

  notificationLevel:
    NotificationLevel;
};

export default function AdminShell({
  children,
  role,
  userEmail,
  urgentRenewalCount,
  notificationCount,
  notificationLevel,
}: AdminShellProps) {
  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] =
    useState(false);

  useEffect(() => {
    document.body.style.overflow =
      mobileMenuOpen
        ? "hidden"
        : "";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [
    mobileMenuOpen,
  ]);

  return (
    <div className="min-h-screen bg-[#F6F8F5]">
      {/* SIDEBAR DESKTOP */}

      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[276px]">
        <Sidebar
          role={role}
          urgentRenewalCount={
            urgentRenewalCount
          }
        />
      </div>

      {/* SIDEBAR MOBILE */}

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() =>
              setMobileMenuOpen(
                false,
              )
            }
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
          />

          <div className="absolute inset-y-0 left-0 w-[88%] max-w-[320px] shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={() =>
                  setMobileMenuOpen(
                    false,
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <Sidebar
              role={role}
              urgentRenewalCount={
                urgentRenewalCount
              }
              onNavigate={() =>
                setMobileMenuOpen(
                  false,
                )
              }
            />
          </div>
        </div>
      )}

      {/* MAIN */}

      <div className="min-h-screen lg:pl-[276px]">
        <Header
          userEmail={
            userEmail
          }
          role={role}
          notificationCount={
            notificationCount
          }
          notificationLevel={
            notificationLevel
          }
          onOpenMobileMenu={() =>
            setMobileMenuOpen(
              true,
            )
          }
        />

        <main className="min-h-[calc(100vh-5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}