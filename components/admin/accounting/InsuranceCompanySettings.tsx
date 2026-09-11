"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Loader2,
  Pencil,
  Power,
  Save,
  X,
} from "lucide-react";

type InsuranceCompanySettingsProps = {
  company: {
    id: string;
    name: string;
    isActive: boolean;
  };
};

type ApiResponse = {
  success?: boolean;
  error?: string;
};

export default function InsuranceCompanySettings({
  company,
}: InsuranceCompanySettingsProps) {
  const router = useRouter();

  const [isEditing, setIsEditing] =
    useState(false);
  const [name, setName] =
    useState(company.name);
  const [isActive, setIsActive] =
    useState(company.isActive);
  const [isSaving, setIsSaving] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  function cancelEditing() {
    setName(company.name);
    setIsActive(company.isActive);
    setError(null);
    setIsEditing(false);
  }

  async function saveChanges() {
    const cleanName = name.trim();

    if (!cleanName) {
      setError(
        "Le nom de l’assureur est obligatoire.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/accounting/insurance-companies/${company.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: cleanName,
            isActive,
          }),
        },
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de modifier l’assureur.",
        );
      }

      setIsEditing(false);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!isEditing) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F8F2] text-[#0B5D3B]">
              <Building2 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className="font-bold text-slate-950">
                Gestion de l’assureur
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Modifiez son nom ou son statut.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsEditing(true);
            }}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-[#0B5D3B]/30 hover:bg-[#F3F8F2] hover:text-[#0B5D3B] sm:w-auto"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="font-bold text-slate-950">
          Modifier l’assureur
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Les dossiers historiques restent
          rattachés à cette compagnie.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label
            htmlFor="insurance-company-name"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Nom de l’assureur
          </label>

          <input
            id="insurance-company-name"
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            disabled={isSaving}
            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Power className="h-4 w-4 text-slate-500" />

              <p className="text-sm font-bold text-slate-800">
                Assureur actif
              </p>
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Un assureur inactif ne sera plus proposé pour les nouveaux dossiers.
            </p>
          </div>

          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) =>
              setIsActive(
                event.target.checked,
              )
            }
            disabled={isSaving}
            className="h-5 w-5 shrink-0 accent-[#0B5D3B]"
          />
        </label>

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={cancelEditing}
            disabled={isSaving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X className="h-4 w-4" />
            Annuler
          </button>

          <button
            type="button"
            onClick={saveChanges}
            disabled={isSaving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0B5D3B] px-5 text-sm font-bold text-white transition hover:bg-[#084B30] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {isSaving
              ? "Enregistrement..."
              : "Enregistrer"}
          </button>
        </div>
      </div>
    </section>
  );
}
