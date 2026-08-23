"use client";

import {
  useState,
} from "react";

type RenewalWhatsappButtonProps = {
  renewalId: string;
  whatsapp: string;
  message: string;
};

export default function RenewalWhatsappButton({
  renewalId,
  whatsapp,
  message,
}: RenewalWhatsappButtonProps) {
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

  async function handleClick() {
    if (
      !whatsapp
    ) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/renewals/${renewalId}/contact`,
          {
            method:
              "POST",
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
            "Impossible d’enregistrer le contact.",
        );
      }

      const cleanWhatsapp =
        whatsapp.replace(
          /\D/g,
          "",
        );

      const whatsappUrl =
        `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
          message,
        )}`;

      window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer",
      );
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

  return (
    <div>
      <button
        type="button"
        onClick={
          handleClick
        }
        disabled={
          loading ||
          !whatsapp
        }
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#18C100] px-5 text-sm font-semibold text-white transition hover:bg-[#13a300] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Ouverture..."
          : "Contacter sur WhatsApp"}
      </button>

      {errorMessage && (
        <p className="mt-2 text-xs font-medium text-red-600">
          {
            errorMessage
          }
        </p>
      )}
    </div>
  );
}