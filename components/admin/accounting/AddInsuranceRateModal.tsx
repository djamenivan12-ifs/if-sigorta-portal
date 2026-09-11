"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

type InsuranceCompany = {
  id: string;
  name: string;
  is_active: boolean;
};

type RateRow = {
  id: string;
  minAge: string;
  maxAge: string;
  oneYearCost: string;
  twoYearCost: string;
};

type AddInsuranceRateModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function createEmptyRow(): RateRow {
  return {
    id: crypto.randomUUID(),
    minAge: "",
    maxAge: "",
    oneYearCost: "",
    twoYearCost: "",
  };
}

export default function AddInsuranceRateModal({
  isOpen,
  onClose,
}: AddInsuranceRateModalProps) {
  const [
    companies,
    setCompanies,
  ] = useState<
    InsuranceCompany[]
  >([]);

  const [
    selectedCompanyId,
    setSelectedCompanyId,
  ] = useState("");

  const [
    effectiveFrom,
    setEffectiveFrom,
  ] = useState("");

  const [rows, setRows] =
    useState<RateRow[]>([
      createEmptyRow(),
    ]);

  const [
    isLoadingCompanies,
    setIsLoadingCompanies,
  ] = useState(false);

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    async function loadCompanies() {
      try {
        setIsLoadingCompanies(
          true,
        );

        setError(null);

        const response =
          await fetch(
            "/api/admin/accounting/insurance-companies",
          );

        const result =
          (await response.json()) as {
            success?: boolean;
            companies?: InsuranceCompany[];
            error?: string;
          };

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ??
              "Impossible de charger les assureurs.",
          );
        }

        const activeCompanies =
          (
            result.companies ??
            []
          ).filter(
            (company) =>
              company.is_active,
          );

        setCompanies(
          activeCompanies,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Une erreur est survenue.",
        );
      } finally {
        setIsLoadingCompanies(
          false,
        );
      }
    }

    loadCompanies();
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function updateRow(
    id: string,
    field:
      | "minAge"
      | "maxAge"
      | "oneYearCost"
      | "twoYearCost",
    value: string,
  ) {
    setRows((currentRows) =>
      currentRows.map(
        (row) =>
          row.id === id
            ? {
                ...row,
                [field]:
                  value,
              }
            : row,
      ),
    );
  }

  function addRow() {
    setRows(
      (currentRows) => [
        ...currentRows,
        createEmptyRow(),
      ],
    );
  }

  function removeRow(
    id: string,
  ) {
    setRows(
      (currentRows) => {
        if (
          currentRows.length ===
          1
        ) {
          return currentRows;
        }

        return currentRows.filter(
          (row) =>
            row.id !== id,
        );
      },
    );
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setSuccess(null);
    setSelectedCompanyId("");
    setEffectiveFrom("");
    setRows([
      createEmptyRow(),
    ]);

    onClose();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (
      !selectedCompanyId
    ) {
      setError(
        "Veuillez sélectionner un assureur.",
      );

      return;
    }

    if (!effectiveFrom) {
      setError(
        "Veuillez choisir la date d’entrée en vigueur.",
      );

      return;
    }

    const normalizedRows =
      rows.map((row) => ({
        minAge: Number(
          row.minAge,
        ),
        maxAge: Number(
          row.maxAge,
        ),
        oneYearCost: Number(
          row.oneYearCost,
        ),
        twoYearCost: Number(
          row.twoYearCost,
        ),
      }));

    const hasInvalidRow =
      normalizedRows.some(
        (row) =>
          !Number.isInteger(
            row.minAge,
          ) ||
          !Number.isInteger(
            row.maxAge,
          ) ||
          row.minAge < 0 ||
          row.maxAge <
            row.minAge ||
          !Number.isFinite(
            row.oneYearCost,
          ) ||
          !Number.isFinite(
            row.twoYearCost,
          ) ||
          row.oneYearCost <
            0 ||
          row.twoYearCost <
            0,
      );

    if (hasInvalidRow) {
      setError(
        "Vérifiez les tranches d’âge et les montants saisis.",
      );

      return;
    }

    try {
      setIsSubmitting(true);

      const response =
        await fetch(
          "/api/admin/accounting/insurance-rates",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              {
                insuranceCompanyId:
                  selectedCompanyId,

                effectiveFrom,

                rows:
                  normalizedRows,
              },
            ),
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
            "Impossible d’enregistrer la grille tarifaire.",
        );
      }

      setSuccess(
        "Grille tarifaire enregistrée avec succès.",
      );

      window.setTimeout(
        () => {
          handleClose();
        },
        900,
      );
    } catch (submitError) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-w-4xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Ajouter une grille tarifaire
            </h2>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Définissez plusieurs tranches d’âge pour un assureur précis.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6 px-5 py-6 sm:px-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800">
                Assureur
              </label>

              <select
                value={
                  selectedCompanyId
                }
                onChange={(event) =>
                  setSelectedCompanyId(
                    event.target
                      .value,
                  )
                }
                disabled={
                  isLoadingCompanies ||
                  isSubmitting
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
              >
                <option value="">
                  {isLoadingCompanies
                    ? "Chargement..."
                    : "Sélectionner un assureur"}
                </option>

                {companies.map(
                  (company) => (
                    <option
                      key={
                        company.id
                      }
                      value={
                        company.id
                      }
                    >
                      {
                        company.name
                      }
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800">
                Date d’entrée en vigueur
              </label>

              <input
                type="date"
                value={
                  effectiveFrom
                }
                onChange={(event) =>
                  setEffectiveFrom(
                    event.target
                      .value,
                  )
                }
                disabled={
                  isSubmitting
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-black text-slate-950">
                  Tranches d’âge
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Chaque ligne contient les prix réels 1 an et 2 ans.
                </p>
              </div>

              <button
                type="button"
                onClick={addRow}
                disabled={
                  isSubmitting
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#0B5D3B] px-4 py-2.5 text-sm font-bold text-[#0B5D3B] transition hover:bg-[#F3F8F2] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />

                Ajouter une tranche
              </button>
            </div>

            <div className="space-y-3">
              {rows.map(
                (
                  row,
                  index,
                ) => (
                  <div
                    key={
                      row.id
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-800">
                        Tranche{" "}
                        {index +
                          1}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeRow(
                            row.id,
                          )
                        }
                        disabled={
                          rows.length ===
                            1 ||
                          isSubmitting
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Supprimer la tranche"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <InputField
                        label="Âge minimum"
                        value={
                          row.minAge
                        }
                        onChange={(
                          value,
                        ) =>
                          updateRow(
                            row.id,
                            "minAge",
                            value,
                          )
                        }
                        disabled={
                          isSubmitting
                        }
                      />

                      <InputField
                        label="Âge maximum"
                        value={
                          row.maxAge
                        }
                        onChange={(
                          value,
                        ) =>
                          updateRow(
                            row.id,
                            "maxAge",
                            value,
                          )
                        }
                        disabled={
                          isSubmitting
                        }
                      />

                      <InputField
                        label="Coût réel 1 an (TL)"
                        value={
                          row.oneYearCost
                        }
                        onChange={(
                          value,
                        ) =>
                          updateRow(
                            row.id,
                            "oneYearCost",
                            value,
                          )
                        }
                        disabled={
                          isSubmitting
                        }
                        step="0.01"
                      />

                      <InputField
                        label="Coût réel 2 ans (TL)"
                        value={
                          row.twoYearCost
                        }
                        onChange={(
                          value,
                        ) =>
                          updateRow(
                            row.id,
                            "twoYearCost",
                            value,
                          )
                        }
                        disabled={
                          isSubmitting
                        }
                        step="0.01"
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
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
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0B5D3B] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#084C31] disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {isSubmitting
                ? "Enregistrement..."
                : "Enregistrer la grille"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  disabled,
  step = "1",
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  disabled: boolean;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-600">
        {label}
      </label>

      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 disabled:bg-slate-100"
      />
    </div>
  );
}