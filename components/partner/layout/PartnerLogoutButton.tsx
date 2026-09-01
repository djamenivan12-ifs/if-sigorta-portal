"use client";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

import {
  LogOut,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/client";

export default function PartnerLogoutButton() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  async function logout() {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const supabase =
        createClient();

      await supabase.auth.signOut();
    } finally {
      router.replace(
        "/partenaire/connexion",
      );

      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={
        logout
      }
      disabled={
        loading
      }
      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
        <LogOut className="h-[17px] w-[17px]" />
      </div>

      <span>
        {loading
          ? "Déconnexion..."
          : "Déconnexion"}
      </span>
    </button>
  );
}