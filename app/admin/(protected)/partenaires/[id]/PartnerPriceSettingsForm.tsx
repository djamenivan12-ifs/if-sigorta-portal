"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { validatePriceRanges } from "@/lib/insurance/validatePriceRanges";
import { hasOverlappingRanges } from "@/lib/insurance/priceRanges";

type PriceRange = {
  id?: number;
  minimumAge: number;
  maximumAge: number;
  oneYearPrice: number;
  twoYearPrice: number;
  isActive: boolean;
};

type PartnerPriceSettingsFormProps = {
  partnerId?: string;
  bulk?: { revision: string; count: number };
  onSavingChange?: (saving: boolean) => void;
  initialRanges: PriceRange[];
};

export default function PartnerPriceSettingsForm({
  partnerId,
  initialRanges,
  bulk,
  onSavingChange,
}: PartnerPriceSettingsFormProps) {
  const router = useRouter();

  const [ranges, setRanges] = useState<PriceRange[]>(initialRanges);
  const [expectedRanges, setExpectedRanges] = useState<PriceRange[]>(initialRanges);

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  function updateRange(
    index: number,
    field:
      | "minimumAge"
      | "maximumAge"
      | "oneYearPrice"
      | "twoYearPrice"
      | "isActive",
    value: number | boolean,
  ) {
    setRanges((current) =>
      current.map((range, rangeIndex) =>
        rangeIndex === index
          ? {
              ...range,
              [field]: value,
            }
          : range,
      ),
    );

    setErrorMessage("");
    setSuccessMessage("");
  }

  function addRange() {
    setRanges((current) => [
      ...current,
      {
        minimumAge: 0,
        maximumAge: 0,
        oneYearPrice: 0,
        twoYearPrice: 0,
        isActive: true,
      },
    ]);

    setErrorMessage("");
    setSuccessMessage("");
  }

  function removeRange(index: number) {
    setRanges((current) =>
      current.filter((_, rangeIndex) => rangeIndex !== index),
    );

    setErrorMessage("");
    setSuccessMessage("");
  }

  async function save() {
    const validation = validatePriceRanges({ ranges });
    if (!validation.success) { setErrorMessage(validation.error); return; }
    if (hasOverlappingRanges(ranges)) { setErrorMessage("Les tranches d’âge actives ne doivent pas se chevaucher."); return; }
    if (bulk && !window.confirm(`Appliquer cette grille aux ${bulk.count} partenaires, actifs et inactifs ? Leurs grilles actuelles, y compris les tarifs personnalisés, seront remplacées. Vous pourrez ensuite les modifier individuellement.`)) return;
    setLoading(true);
    onSavingChange?.(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (ranges.length === 0) {
        throw new Error("Ajoutez au moins une tranche tarifaire.");
      }

      const response = await fetch(bulk ? "/api/admin/partners/prices" : `/api/admin/partners/${partnerId}/prices`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ranges,
          expectedRanges,
          ...(bulk ? { revision: bulk.revision, confirmAll: true } : {}),
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        ranges?: PriceRange[];
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "L’enregistrement a échoué.");
      }

      if (Array.isArray(result.ranges)) { setRanges(result.ranges); setExpectedRanges(result.ranges); }
      setSuccessMessage(bulk ? `Tarifs appliqués aux ${bulk.count} partenaires. La modification individuelle reste disponible.` : "Tarifs du partenaire enregistrés avec succès.");

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setLoading(false);
      onSavingChange?.(false);
    }
  }

  return (
    <fieldset disabled={loading} className="min-w-0 space-y-4">
      {bulk && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Cette action remplacera les grilles de tous les partenaires existants, y compris leurs tarifs personnalisés. Une confirmation sera demandée avant l’application.</p>}
      {ranges.length === 0 && (
        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-brand-ice px-6 py-8 text-center">
          <p className="text-sm font-semibold text-brand-navy">
            Aucun tarif configuré
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Ajoutez la première tranche tarifaire.
          </p>
        </div>
      )}

      {ranges.map((range, index) => (
        <div
          key={range.id ?? `new-${index}`}
          className="grid gap-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 md:grid-cols-2 xl:grid-cols-7"
        >
          <Field
            label="Âge minimum"
            value={range.minimumAge}
            onChange={(value) => updateRange(index, "minimumAge", value)}
          />

          <Field
            label="Âge maximum"
            value={range.maximumAge}
            onChange={(value) => updateRange(index, "maximumAge", value)}
          />

          <Field
            label="Prix 1 an"
            value={range.oneYearPrice}
            onChange={(value) => updateRange(index, "oneYearPrice", value)}
          />

          <Field
            label="Prix 2 ans"
            value={range.twoYearPrice}
            onChange={(value) => updateRange(index, "twoYearPrice", value)}
          />

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Statut</p>

            <label
              className={`flex h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 transition ${
                range.isActive
                  ? "border-brand-border bg-brand-ice"
                  : "border-slate-200 bg-white"
              }`}
            >
              <span
                className={`text-sm font-semibold ${
                  range.isActive ? "text-brand-navy" : "text-slate-600"
                }`}
              >
                {range.isActive ? "Actif" : "Inactif"}
              </span>

              <input
                type="checkbox"
                checked={range.isActive}
                onChange={(event) =>
                  updateRange(index, "isActive", event.target.checked)
                }
                className="h-4 w-4 accent-brand-navy"
              />
            </label>
          </div>

          <div className="flex items-end">
            <div className="flex h-12 w-full items-center rounded-xl border border-slate-100 bg-brand-ice px-4">
              <span className="text-sm font-semibold text-slate-500">
                Tranche {index + 1}
              </span>
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => removeRange(index)}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Supprimer
            </button>
          </div>
        </div>
      ))}

      {errorMessage && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          className="rounded-xl border border-brand-border bg-brand-ice px-4 py-3 text-sm font-medium text-brand-navy"
          role="status"
        >
          {successMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addRange}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Ajouter une tranche
        </button>

        <button
          type="button"
          onClick={save}
          disabled={loading || ranges.length === 0}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-lime px-6 text-sm font-black text-brand-navy transition hover:bg-brand-lime/85 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? "Enregistrement..." : bulk ? `Appliquer aux ${bulk.count} partenaires` : "Enregistrer les tarifs"}
        </button>
      </div>
    </fieldset>
  );
}

type FieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function Field({ label, value, onChange }: FieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        type="number"
        aria-label={label}
        min={0}
        step={label.startsWith("Prix") ? "0.01" : "1"}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-brand-navy outline-none transition focus:border-brand-navy focus:ring-4 focus:ring-brand-navy/10"
      />
    </div>
  );
}
