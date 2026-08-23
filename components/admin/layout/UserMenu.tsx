"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  LogOut,
  Settings,
  User,
} from "lucide-react";

import LogoutButton from "@/app/admin/(protected)/LogoutButton";

type UserMenuProps = {
  userEmail?: string | null;
  role: "admin" | "agent";
};

export default function UserMenu({
  userEmail,
  role,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);

  const menuRef =
    useRef<HTMLDivElement>(null);

  const email =
    userEmail ?? "Utilisateur";

  const initials = email
    .charAt(0)
    .toUpperCase();

  const roleLabel =
    role === "admin"
      ? "Administrateur"
      : "Agent";

  useEffect(() => {
    function handleClick(
      event: MouseEvent,
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClick,
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClick,
      );
  }, []);

  return (
    <div
      ref={menuRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setOpen(!open)
        }
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-2 py-2 transition hover:border-[#2F2963] hover:shadow-sm"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2F2963] font-bold text-white">
          {initials}
        </div>

        <div className="hidden text-left lg:block">
          <p className="max-w-[170px] truncate text-sm font-semibold text-slate-900">
            {email}
          </p>

          <p className="text-xs text-slate-500">
            {roleLabel}
          </p>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition ${
            open
              ? "rotate-180"
              : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2F2963] text-lg font-bold text-white">
                {initials}
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {email}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {roleLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="p-3">
            <Link
              href="/admin/profil"
              onClick={() =>
                setOpen(false)
              }
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <User className="h-5 w-5 text-[#2F2963]" />

              Mon profil
            </Link>

            {role === "admin" && (
              <Link
                href="/admin/parametres"
                onClick={() =>
                  setOpen(false)
                }
                className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <Settings className="h-5 w-5 text-[#2F2963]" />

                Paramètres
              </Link>
            )}
          </div>

          {/* Déconnexion */}
          <div className="border-t border-slate-100 p-4">
            <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-red-600">
              <LogOut className="h-5 w-5" />

              <div className="flex-1">
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}