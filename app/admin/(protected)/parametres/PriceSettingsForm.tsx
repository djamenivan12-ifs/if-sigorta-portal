"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PriceRange = {
  id?: number;
  minimumAge: number;
  maximumAge: number;
  oneYearPrice: number;
  twoYearPrice: number;
  isActive: boolean;
};

type PriceSettingsFormProps = {
  initialRanges: PriceRange[];
};

export default function PriceSettingsForm({
  initialRanges,
}: PriceSettingsFormProps) {
  const router = useRouter();

  const [ranges, setRanges] =
    useState<PriceRange[]>(
      initialRanges,
    );

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

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
      current.map(
        (range, rangeIndex) =>
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

  async function save() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        "/api/admin/settings/prices",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ranges,
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
          result.error ||
            "L’enregistrement a échoué.",
        );
      }

      setSuccessMessage(
        "Tarifs enregistrés avec succès.",
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {ranges.map(
        (range, index) => (
          <div
            key={
              range.id ??
              `new-${index}`
            }
            className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-6"
          >
            <Field
              label="Âge minimum"
              value={
                range.minimumAge
              }
              onChange={(value) =>
                updateRange(
                  index,
                  "minimumAge",
                  value,
                )
              }
            />

            <Field
              label="Âge maximum"
              value={
                range.maximumAge
              }
              onChange={(value) =>
                updateRange(
                  index,
                  "maximumAge",
                  value,
                )
              }
            />

            <Field
              label="Prix 1 an"
              value={
                range.oneYearPrice
              }
              onChange={(value) =>
                updateRange(
                  index,
                  "oneYearPrice",
                  value,
                )
              }
            />

            <Field
              label="Prix 2 ans"
              value={
                range.twoYearPrice
              }
              onChange={(value) =>
                updateRange(
                  index,
                  "twoYearPrice",
                  value,
                )
              }
            />

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Statut
              </p>

              <label className="flex h-11 items-center gap-3 rounded-xl border border-slate-300 px-4">
                <input
                  type="checkbox"
                  checked={
                    range.isActive
                  }
                  onChange={(
                    event,
                  ) =>
                    updateRange(
                      index,
                      "isActive",
                      event.target.checked,
                    )
                  }
                />

                <span className="text-sm font-medium text-slate-700">
                  Actif
                </span>
              </label>
            </div>

            <div className="flex items-end">
              <span className="text-sm text-slate-500">
                Tranche{" "}
                {index + 1}
              </span>
            </div>
          </div>
        ),
      )}

      {errorMessage && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {successMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addRange}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          + Ajouter une tranche
        </button>

        <button
          type="button"
          onClick={save}
          disabled={loading}
          className="rounded-xl bg-[#2F2963] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#24204F] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Enregistrement..."
            : "Enregistrer les tarifs"}
        </button>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: number;
  onChange: (
    value: number,
  ) => void;
};

function Field({
  label,
  value,
  onChange,
}: FieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) =>
          onChange(
            Number(
              event.target.value,
            ),
          )
        }
        className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
      />
    </div>
  );
}