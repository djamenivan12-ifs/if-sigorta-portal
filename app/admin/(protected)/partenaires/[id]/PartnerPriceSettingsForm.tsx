"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type PriceRange = {
  id?: number;
  minimumAge: number;
  maximumAge: number;
  oneYearPrice: number;
  twoYearPrice: number;
  isActive: boolean;
};

type PartnerPriceSettingsFormProps = {
  partnerId: string;
  initialRanges: PriceRange[];
};

export default function PartnerPriceSettingsForm({
  partnerId,
  initialRanges,
}: PartnerPriceSettingsFormProps) {
  const router =
    useRouter();

  const [
    ranges,
    setRanges,
  ] =
    useState<PriceRange[]>(
      initialRanges,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
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
    setRanges(
      (current) =>
        current.map(
          (
            range,
            rangeIndex,
          ) =>
            rangeIndex ===
            index
              ? {
                  ...range,
                  [field]:
                    value,
                }
              : range,
        ),
    );

    setErrorMessage("");
    setSuccessMessage("");
  }

  function addRange() {
    setRanges(
      (current) => [
        ...current,
        {
          minimumAge: 0,
          maximumAge: 0,
          oneYearPrice: 0,
          twoYearPrice: 0,
          isActive: true,
        },
      ],
    );

    setErrorMessage("");
    setSuccessMessage("");
  }

  function removeRange(
    index: number,
  ) {
    setRanges(
      (current) =>
        current.filter(
          (
            _,
            rangeIndex,
          ) =>
            rangeIndex !==
            index,
        ),
    );

    setErrorMessage("");
    setSuccessMessage("");
  }

  async function save() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (
        ranges.length ===
        0
      ) {
        throw new Error(
          "Ajoutez au moins une tranche tarifaire.",
        );
      }

      const response =
        await fetch(
          `/api/admin/partners/${partnerId}/prices`,
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
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
        "Tarifs du partenaire enregistrés avec succès.",
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
      {ranges.length ===
        0 && (
        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-[#FAFCFA] px-6 py-8 text-center">
          <p className="text-sm font-semibold text-[#102B20]">
            Aucun tarif configuré
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Ajoutez la première tranche
            tarifaire de ce partenaire.
          </p>
        </div>
      )}

      {ranges.map(
        (
          range,
          index,
        ) => (
          <div
            key={
              range.id ??
              `new-${index}`
            }
            className="grid gap-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 md:grid-cols-2 xl:grid-cols-7"
          >
            <Field
              label="Âge minimum"
              value={
                range.minimumAge
              }
              onChange={(
                value,
              ) =>
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
              onChange={(
                value,
              ) =>
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
              onChange={(
                value,
              ) =>
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
              onChange={(
                value,
              ) =>
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

              <label
                className={`flex h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 transition ${
                  range.isActive
                    ? "border-[#CFE3CF] bg-[#F3F8F2]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span
                  className={`text-sm font-semibold ${
                    range.isActive
                      ? "text-[#0B5D3B]"
                      : "text-slate-600"
                  }`}
                >
                  {range.isActive
                    ? "Actif"
                    : "Inactif"}
                </span>

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
                  className="h-4 w-4 accent-[#0B5D3B]"
                />
              </label>
            </div>

            <div className="flex items-end">
              <div className="flex h-12 w-full items-center rounded-xl border border-slate-100 bg-[#FAFCFA] px-4">
                <span className="text-sm font-semibold text-slate-500">
                  Tranche{" "}
                  {index + 1}
                </span>
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() =>
                  removeRange(
                    index,
                  )
                }
                disabled={
                  loading
                }
                className="flex h-12 w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Supprimer
              </button>
            </div>
          </div>
        ),
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-4 py-3 text-sm font-medium text-[#0B5D3B]">
          {successMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={
            addRange
          }
          disabled={
            loading
          }
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Ajouter une tranche
        </button>

        <button
          type="button"
          onClick={
            save
          }
          disabled={
            loading ||
            ranges.length ===
              0
          }
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0B5D3B] px-6 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:bg-slate-300"
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
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            Number(
              event.target.value,
            ),
          )
        }
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#102B20] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
      />
    </div>
  );
}