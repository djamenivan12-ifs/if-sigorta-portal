"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const [beneficiary, setBeneficiary] =
    useState(initialBeneficiary);

  const [bankName, setBankName] =
    useState(initialBankName);

  const [iban, setIban] =
    useState(initialIban);

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  async function save() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        "/api/admin/settings/bank",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
            value={beneficiary}
            onChange={(event) => {
              setBeneficiary(
                event.target.value,
              );

              setErrorMessage("");
              setSuccessMessage("");
            }}
            className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
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
            value={bankName}
            onChange={(event) => {
              setBankName(
                event.target.value,
              );

              setErrorMessage("");
              setSuccessMessage("");
            }}
            className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
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
            value={iban}
            onChange={(event) => {
              setIban(
                event.target.value.toUpperCase(),
              );

              setErrorMessage("");
              setSuccessMessage("");
            }}
            className="h-11 w-full rounded-xl border border-slate-300 px-4 font-mono text-sm outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {successMessage}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="mt-5 rounded-xl bg-[#2F2963] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#24204F] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Enregistrement..."
          : "Enregistrer les coordonnées bancaires"}
      </button>
    </div>
  );
}