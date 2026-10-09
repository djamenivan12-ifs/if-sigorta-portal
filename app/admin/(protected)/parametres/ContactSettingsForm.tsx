"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

type ContactSettingsFormProps = {
  initialCountryCode: string;
  initialWhatsappNumber: string;
};

export default function ContactSettingsForm({
  initialCountryCode,
  initialWhatsappNumber,
}: ContactSettingsFormProps) {
  const router = useRouter();

  const [countryCode, setCountryCode] = useState(initialCountryCode);

  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsappNumber);

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  async function save() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/settings/contact", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          whatsappCountryCode: countryCode,

          whatsappNumber,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "L’enregistrement a échoué.");
      }

      setSuccessMessage("Numéro WhatsApp enregistré avec succès.");

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

  const inputClassName =
    "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-brand-navy outline-none transition placeholder:text-slate-400 focus:border-brand-navy focus:ring-4 focus:ring-brand-navy/10";

  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
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
            value={countryCode}
            onChange={(event) => {
              setCountryCode(event.target.value);

              setErrorMessage("");
              setSuccessMessage("");
            }}
            placeholder="+90"
            className={inputClassName}
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
            value={whatsappNumber}
            onChange={(event) => {
              setWhatsappNumber(event.target.value.replace(/\D/g, ""));

              setErrorMessage("");
              setSuccessMessage("");
            }}
            placeholder="5XXXXXXXXX"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-brand-border bg-brand-ice px-4 py-3 text-sm leading-6 text-brand-muted">
        Numéro utilisé par les clients pour contacter IF Sigorta sur WhatsApp.
      </div>

      {errorMessage && (
        <div
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          className="mt-4 rounded-xl border border-brand-border bg-brand-ice px-4 py-3 text-sm font-medium text-brand-navy"
          role="status"
        >
          {successMessage}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-lime px-6 text-sm font-black text-brand-navy transition hover:bg-brand-lime/85 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? "Enregistrement..." : "Enregistrer le numéro WhatsApp"}
      </button>
    </div>
  );
}
