"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  Landmark,
  X,
} from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type InsuranceCompany = {
  id: string;
  name: string;
  is_active: boolean;
};

export default function AddInsuranceDepositModal({
  isOpen,
  onClose,
}: Props) {
  const router = useRouter();

  const [
    companies,
    setCompanies,
  ] = useState<
    InsuranceCompany[]
  >([]);

  const [
    insuranceCompanyId,
    setInsuranceCompanyId,
  ] = useState("");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    depositDate,
    setDepositDate,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("");

  const [
    reference,
    setReference,
  ] = useState("");

  const [
    note,
    setNote,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingCompanies,
    setLoadingCompanies,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    async function loadCompanies() {
      try {
        setLoadingCompanies(
          true,
        );

        setError("");

        const response =
          await fetch(
            "/api/admin/accounting/insurance-companies",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ??
              "Impossible de charger les assureurs.",
          );
        }

        const activeCompanies =
          (
            data.companies ??
            []
          ).filter(
            (
              company: InsuranceCompany,
            ) =>
              company.is_active,
          );

        setCompanies(
          activeCompanies,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les assureurs.",
        );
      } finally {
        setLoadingCompanies(
          false,
        );
      }
    }

    loadCompanies();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const now = new Date();

    const turkeyDateParts =
      new Intl.DateTimeFormat(
        "en-GB",
        {
          timeZone: "Europe/Istanbul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        },
      ).formatToParts(now);

    const year =
      turkeyDateParts.find(
        (part) =>
          part.type === "year",
      )?.value ?? "";

    const month =
      turkeyDateParts.find(
        (part) =>
          part.type === "month",
      )?.value ?? "";

    const day =
      turkeyDateParts.find(
        (part) =>
          part.type === "day",
      )?.value ?? "";

    const today =
      `${year}-${month}-${day}`;

    setDepositDate(
      today,
    );

    setInsuranceCompanyId(
      "",
    );

    setAmount("");

    setPaymentMethod(
      "",
    );

    setReference("");

    setNote("");

    setMessage("");

    setError("");
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    const numericAmount =
      Number(amount);

    if (
      !insuranceCompanyId
    ) {
      setError(
        "Veuillez sélectionner un assureur.",
      );

      return;
    }

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      setError(
        "Le montant du dépôt est invalide.",
      );

      return;
    }

    if (!depositDate) {
      setError(
        "Veuillez sélectionner la date du dépôt.",
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/admin/accounting/insurance-deposits",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              insuranceCompanyId,

              amount:
                numericAmount,

              depositDate,

              paymentMethod:
                paymentMethod.trim() ||
                null,

              reference:
                reference.trim() ||
                null,

              note:
                note.trim() ||
                null,
            }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Impossible d’enregistrer le dépôt.",
        );
      }

      setMessage(
        "Dépôt enregistré avec succès.",
      );

      router.refresh();

      window.setTimeout(
        () => {
          onClose();
        },
        700,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Impossible d’enregistrer le dépôt.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-[#0B5D3B]" />

              <h2 className="text-lg font-black text-slate-950">
                Enregistrer un dépôt
              </h2>
            </div>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Ajoutez un montant déposé
              auprès d’un assureur.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-5 px-5 py-5 sm:px-6 sm:py-6"
        >
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Assureur
            </label>

            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select
                value={
                  insuranceCompanyId
                }
                onChange={(
                  event,
                ) =>
                  setInsuranceCompanyId(
                    event.target
                      .value,
                  )
                }
                disabled={
                  loadingCompanies ||
                  loading
                }
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10 disabled:bg-slate-50"
              >
                <option value="">
                  {loadingCompanies
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
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Montant du dépôt
            </label>

            <div className="relative">
              <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(
                  event,
                ) =>
                  setAmount(
                    event.target
                      .value,
                  )
                }
                disabled={
                  loading
                }
                placeholder="Ex. 10 000"
                className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-14 text-sm font-semibold outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                TL
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Date du dépôt
            </label>

            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="date"
                value={
                  depositDate
                }
                onChange={(
                  event,
                ) =>
                  setDepositDate(
                    event.target
                      .value,
                  )
                }
                disabled={
                  loading
                }
                className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Mode de paiement
            </label>

            <select
              value={
                paymentMethod
              }
              onChange={(
                event,
              ) =>
                setPaymentMethod(
                  event.target
                    .value,
                )
              }
              disabled={
                loading
              }
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
            >
              <option value="">
                Non précisé
              </option>

              <option value="bank_transfer">
                Virement bancaire
              </option>

              <option value="card">
                Carte bancaire
              </option>

              <option value="cash">
                Espèces
              </option>

              <option value="other">
                Autre
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Référence
            </label>

            <input
              type="text"
              value={
                reference
              }
              onChange={(
                event,
              ) =>
                setReference(
                  event.target
                    .value,
                )
              }
              disabled={
                loading
              }
              placeholder="Ex. référence du virement"
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Note
            </label>

            <textarea
              value={note}
              onChange={(
                event,
              ) =>
                setNote(
                  event.target
                    .value,
                )
              }
              disabled={
                loading
              }
              rows={3}
              placeholder="Informations complémentaires..."
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {message}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={
                loading
              }
              className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                loadingCompanies
              }
              className="min-h-11 rounded-xl bg-[#0B5D3B] px-5 text-sm font-bold text-white transition hover:bg-[#084B30] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Enregistrement..."
                : "Enregistrer le dépôt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}