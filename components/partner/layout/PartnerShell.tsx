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

import PartnerHeader from "./PartnerHeader";
import PartnerSidebar from "./PartnerSidebar";

type PartnerShellProps = {
  children: ReactNode;

  companyName: string;
  managerName: string;
  partnerCode: string;
};

export default function PartnerShell({
  children,
  companyName,
  managerName,
  partnerCode,
}: PartnerShellProps) {
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
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[276px]">
        <PartnerSidebar
          companyName={
            companyName
          }
          partnerCode={
            partnerCode
          }
        />
      </div>

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

            <PartnerSidebar
              companyName={
                companyName
              }
              partnerCode={
                partnerCode
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

      <div className="min-h-screen lg:pl-[276px]">
        <PartnerHeader
          managerName={
            managerName
          }
          companyName={
            companyName
          }
          onOpenMobileMenu={() =>
            setMobileMenuOpen(
              true,
            )
          }
        />

        <main className="min-h-[calc(100vh-5rem)]">
          {
            children
          }
        </main>
      </div>
    </div>
  );
}