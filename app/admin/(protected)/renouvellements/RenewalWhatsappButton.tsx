"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

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
  const router =
    useRouter();

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
    if (!whatsapp) {
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
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-5 text-sm font-black text-[#0B5D3B] transition hover:bg-[#EAF4E8] disabled:cursor-not-allowed disabled:opacity-50"
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