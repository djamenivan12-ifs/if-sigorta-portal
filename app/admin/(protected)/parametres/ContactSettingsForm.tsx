"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type ContactSettingsFormProps = {
  initialCountryCode: string;
  initialWhatsappNumber: string;
};

export default function ContactSettingsForm({
  initialCountryCode,
  initialWhatsappNumber,
}: ContactSettingsFormProps) {
  const router =
    useRouter();

  const [
    countryCode,
    setCountryCode,
  ] =
    useState(
      initialCountryCode,
    );

  const [
    whatsappNumber,
    setWhatsappNumber,
  ] =
    useState(
      initialWhatsappNumber,
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
          "/api/admin/settings/contact",
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                whatsappCountryCode:
                  countryCode,

                whatsappNumber,
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
        "Numéro WhatsApp enregistré avec succès.",
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
      <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <label
            htmlFor="whatsapp-country-code"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Indicatif
          </label>

          <input
            id="whatsapp-country-code"
            type="text"
            value={
              countryCode
            }
            onChange={(
              event,
            ) => {
              setCountryCode(
                event.target.value,
              );

              setErrorMessage("");
              setSuccessMessage("");
            }}
            placeholder="+90"
            className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
          />
        </div>

        <div>
          <label
            htmlFor="whatsapp-number"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Numéro WhatsApp
          </label>

          <input
            id="whatsapp-number"
            type="tel"
            inputMode="numeric"
            value={
              whatsappNumber
            }
            onChange={(
              event,
            ) => {
              setWhatsappNumber(
                event.target.value.replace(
                  /\D/g,
                  "",
                ),
              );

              setErrorMessage("");
              setSuccessMessage("");
            }}
            placeholder="5XXXXXXXXX"
            className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
        Numéro utilisé par les clients pour contacter IF Sigorta sur WhatsApp.
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {
            errorMessage
          }
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
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
        className="mt-5 rounded-xl bg-[#2F2963] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#24204F] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Enregistrement..."
          : "Enregistrer le numéro WhatsApp"}
      </button>
    </div>
  );
}