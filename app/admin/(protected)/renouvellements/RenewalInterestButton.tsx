"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type RenewalInterestButtonProps = {
  renewalId: string;
};

export default function RenewalInterestButton({
  renewalId,
}: RenewalInterestButtonProps) {
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
    setLoading(true);
    setErrorMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/renewals/${renewalId}/interest`,
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
            "Impossible de mettre à jour le renouvellement.",
        );
      }

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
          loading
        }
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-green-200 bg-green-50 px-5 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Mise à jour..."
          : "Marquer comme intéressé"}
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