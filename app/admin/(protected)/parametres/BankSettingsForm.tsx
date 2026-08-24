"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type BankSettingsFormProps = {
  initialBeneficiary: string;
  initialBankName: string;
  initialIban: string;
};

export default function BankSettingsForm({
  initialBeneficiary,
  initialBankName,
  initialIban,
}: BankSettingsFormProps) {
  const router =
    useRouter();

  const [
    beneficiary,
    setBeneficiary,
  ] =
    useState(
      initialBeneficiary,
    );

  const [
    bankName,
    setBankName,
  ] =
    useState(
      initialBankName,
    );

  const [
    iban,
    setIban,
  ] =
    useState(
      initialIban,
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

  async function save() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/settings/bank",
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                beneficiary,
                bankName,
                iban,
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
        "Coordonnées bancaires enregistrées avec succès.",
      );

      router.refresh();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClassName =
    "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#102B20] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10";

  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label
            htmlFor="beneficiary"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Bénéficiaire
          </label>

          <input
            id="beneficiary"
            type="text"
            value={
              beneficiary
            }
            onChange={(
              event,
            ) => {
              setBeneficiary(
                event.target.value,
              );

              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={
              inputClassName
            }
          />
        </div>

        <div>
          <label
            htmlFor="bank-name"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Banque
          </label>

          <input
            id="bank-name"
            type="text"
            value={
              bankName
            }
            onChange={(
              event,
            ) => {
              setBankName(
                event.target.value,
              );

              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={
              inputClassName
            }
          />
        </div>

        <div>
          <label
            htmlFor="iban"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            IBAN
          </label>

          <input
            id="iban"
            type="text"
            value={
              iban
            }
            onChange={(
              event,
            ) => {
              setIban(
                event.target.value.toUpperCase(),
              );

              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={`${inputClassName} font-mono`}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {
            errorMessage
          }
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-4 py-3 text-sm font-medium text-[#0B5D3B]">
          {
            successMessage
          }
        </div>
      )}

      <button
        type="button"
        onClick={
          save
        }
        disabled={
          loading
        }
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0B5D3B] px-6 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading
          ? "Enregistrement..."
          : "Enregistrer les coordonnées bancaires"}
      </button>
    </div>
  );
}