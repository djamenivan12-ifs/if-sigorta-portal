"use client";

import {
  CalendarDays,
  Loader2,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type EditInsuranceRateFormProps = {
  rate: {
    id: string;
    minAge: number;
    maxAge: number;
    durationYears: number;
    realCost: number;
    effectiveFrom: string;
    isActive: boolean;
  };
};

export default function EditInsuranceRateForm({
  rate,
}: EditInsuranceRateFormProps) {
  const router = useRouter();

  const [minAge, setMinAge] =
    useState(String(rate.minAge));

  const [maxAge, setMaxAge] =
    useState(String(rate.maxAge));

  const [realCost, setRealCost] =
    useState(String(rate.realCost));

  const [
    effectiveFrom,
    setEffectiveFrom,
  ] = useState(rate.effectiveFrom);

  const [isActive, setIsActive] =
    useState(rate.isActive);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/admin/accounting/insurance-rates/${rate.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            minAge: Number(minAge),
            maxAge: Number(maxAge),
            realCost:
              Number(realCost),
            effectiveFrom,
            isActive,
          }),
        },
      );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Impossible de modifier le tarif.",
        );
      }

      setSuccess(
        "Le tarif a été modifié avec succès.",
      );

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="min-age"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Âge minimum
          </label>

          <input
            id="min-age"
            type="number"
            min={0}
            required
            value={minAge}
            onChange={(event) =>
              setMinAge(
                event.target.value,
              )
            }
            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
          />
        </div>

        <div>
          <label
            htmlFor="max-age"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Âge maximum
          </label>

          <input
            id="max-age"
            type="number"
            min={0}
            required
            value={maxAge}
            onChange={(event) =>
              setMaxAge(
                event.target.value,
              )
            }
            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-slate-700">
          Durée
        </label>

        <div className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700">
          <CalendarDays className="h-4 w-4 text-slate-400" />

          {rate.durationYears} an
          {rate.durationYears > 1
            ? "s"
            : ""}
        </div>

        <p className="mt-1.5 text-xs text-slate-400">
          La durée appartient au tarif
          concerné et n’est pas modifiée
          depuis cette page.
        </p>
      </div>

      <div>
        <label
          htmlFor="real-cost"
          className="mb-2 block text-sm font-bold text-slate-700"
        >
          Coût réel
        </label>

        <div className="relative">
          <input
            id="real-cost"
            type="number"
            step="0.01"
            min={0}
            required
            value={realCost}
            onChange={(event) =>
              setRealCost(
                event.target.value,
              )
            }
            className="h-12 w-full rounded-xl border border-slate-200 px-4 pr-14 text-sm font-semibold outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
          />

          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
            TL
          </span>
        </div>
      </div>

      <div>
        <label
          htmlFor="effective-from"
          className="mb-2 block text-sm font-bold text-slate-700"
        >
          Date d’entrée en vigueur
        </label>

        <input
          id="effective-from"
          type="date"
          required
          value={effectiveFrom}
          onChange={(event) =>
            setEffectiveFrom(
              event.target.value,
            )
          }
          className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
        />
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
        <div>
          <p className="text-sm font-bold text-slate-800">
            Tarif actif
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Un tarif inactif ne sera
            plus proposé pour les
            nouveaux dossiers.
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
          className="h-5 w-5 shrink-0 accent-[#0B5D3B]"
        />
      </label>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="flex justify-end border-t border-slate-100 pt-5">
        <button
          type="submit"
          disabled={loading}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition sm:w-auto",
            loading
              ? "cursor-not-allowed bg-slate-200 text-slate-500"
              : "bg-[#0B5D3B] text-white hover:bg-[#084B30]",
          ].join(" ")}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Enregistrer les modifications
            </>
          )}
        </button>
      </div>
    </form>
  );
}