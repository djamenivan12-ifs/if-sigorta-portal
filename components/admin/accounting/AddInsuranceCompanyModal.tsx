"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Loader2,
  X,
} from "lucide-react";

type AddInsuranceCompanyModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AddInsuranceCompanyModal({
  isOpen,
  onClose,
}: AddInsuranceCompanyModalProps) {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [isActive, setIsActive] =
    useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [success, setSuccess] =
    useState<string | null>(
      null,
    );

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    const cleanName =
      name.trim();

    if (!cleanName) {
      setError(
        "Veuillez saisir le nom de l’assureur.",
      );

      return;
    }

    try {
      setIsSubmitting(true);

      const response =
        await fetch(
          "/api/admin/accounting/insurance-companies",
          {
            method: "POST",

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

      const result =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "Impossible d’enregistrer l’assureur.",
        );
      }

      setSuccess(
        "Assureur ajouté avec succès.",
      );

      setName("");
      setIsActive(true);

      router.refresh();

      window.setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 800);
    } catch (submissionError) {
      setError(
        submissionError instanceof
          Error
          ? submissionError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setSuccess(null);
    setName("");
    setIsActive(true);

    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-insurance-company-title"
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F3F8F2] text-[#0B5D3B]">
              <Building2 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2
                id="add-insurance-company-title"
                className="text-lg font-black text-slate-950"
              >
                Ajouter un assureur
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                Enregistrez une
                nouvelle compagnie
                d’assurance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-5 px-5 py-6 sm:px-6"
        >
          <div className="space-y-2">
            <label
              htmlFor="insurance-company-name"
              className="text-sm font-bold text-slate-800"
            >
              Nom de
              l’assureur
            </label>

            <input
              id="insurance-company-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target
                    .value,
                )
              }
              placeholder="Ex : Ankara Sigorta"
              autoComplete="off"
              disabled={
                isSubmitting
              }
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">
                Statut
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Un assureur
                inactif ne sera
                pas proposé dans
                les futurs
                dossiers.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsActive(
                  (previous) =>
                    !previous,
                )
              }
              disabled={
                isSubmitting
              }
              className={[
                "relative h-7 w-12 shrink-0 rounded-full transition",
                isActive
                  ? "bg-[#0B5D3B]"
                  : "bg-slate-300",
                isSubmitting
                  ? "cursor-not-allowed opacity-60"
                  : "",
              ].join(" ")}
              aria-pressed={
                isActive
              }
            >
              <span
                className={[
                  "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
                  isActive
                    ? "left-6"
                    : "left-1",
                ].join(" ")}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-sm font-medium text-slate-600">
              État actuel
            </span>

            <span
              className={[
                "rounded-full px-2.5 py-1 text-xs font-black",
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600",
              ].join(" ")}
            >
              {isActive
                ? "Actif"
                : "Inactif"}
            </span>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {success}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={
                isSubmitting
              }
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0B5D3B] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#084C31] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {isSubmitting
                ? "Enregistrement..."
                : "Enregistrer l’assureur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}