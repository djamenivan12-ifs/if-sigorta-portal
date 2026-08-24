"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  ChevronDown,
  LogOut,
  Settings,
  User,
} from "lucide-react";

import LogoutButton from "@/app/admin/(protected)/LogoutButton";

type UserMenuProps = {
  userEmail?:
    | string
    | null;

  role:
    | "admin"
    | "agent";
};

export default function UserMenu({
  userEmail,
  role,
}: UserMenuProps) {
  const [
    open,
    setOpen,
  ] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement>(
      null,
    );

  const email =
    userEmail ??
    "Utilisateur";

  const initials =
    email
      .charAt(0)
      .toUpperCase();

  const roleLabel =
    role === "admin"
      ? "Administrateur"
      : "Agent";

  useEffect(() => {
    function handleClick(
      event:
        MouseEvent,
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(
          false,
        );
      }
    }

    function handleEscape(
      event:
        KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setOpen(
          false,
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleClick,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClick,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  return (
    <div
      ref={
        menuRef
      }
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setOpen(
            (
              current,
            ) =>
              !current,
          )
        }
        aria-expanded={
          open
        }
        className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#123F2C] text-xs font-black text-white">
          {initials}
        </div>

        <div className="hidden max-w-[150px] text-left xl:block">
          <p className="truncate text-xs font-semibold text-slate-800">
            {email}
          </p>

          <p className="mt-0.5 text-[10px] text-slate-400">
            {roleLabel}
          </p>
        </div>

        <ChevronDown
          className={`hidden h-4 w-4 text-slate-400 transition sm:block ${
            open
              ? "rotate-180"
              : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
          <div className="border-b border-slate-100 bg-[#F8FAF8] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123F2C] text-sm font-black text-white">
                {initials}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {email}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {roleLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <Link
              href="/admin/profil"
              onClick={() =>
                setOpen(
                  false,
                )
              }
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-[#F3F8F2] hover:text-[#123F2C]"
            >
              <User className="h-4 w-4 text-[#0B5D3B]" />

              Mon profil
            </Link>

            {role ===
              "admin" && (
              <Link
                href="/admin/parametres"
                onClick={() =>
                  setOpen(
                    false,
                  )
                }
                className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-[#F3F8F2] hover:text-[#123F2C]"
              >
                <Settings className="h-4 w-4 text-[#0B5D3B]" />

                Paramètres
              </Link>
            )}
          </div>

          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-red-600">
              <LogOut className="h-4 w-4" />

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