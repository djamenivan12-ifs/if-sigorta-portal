"use client";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

type RequestActionsProps = {
  requestId: string;
  currentStatus: string;
};

type Action =
  | "confirm_payment"
  | "reject_payment"
  | "start_policy"
  | "cancel_request";

export default function RequestActions({
  requestId,
  currentStatus,
}: RequestActionsProps) {
  const router =
    useRouter();

  const [
    loadingAction,
    setLoadingAction,
  ] =
    useState<Action | null>(
      null,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  async function performAction(
    action: Action,
    rejectionReason?: string,
  ) {
    setLoadingAction(
      action,
    );

    setErrorMessage(
      "",
    );

    try {
      const response =
        await fetch(
          `/api/admin/requests/${requestId}/status`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action,
                rejectionReason,
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
            "La modification du dossier a échoué.",
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
      setLoadingAction(
        null,
      );
    }
  }

  function rejectPayment() {
    const rejectionReason =
      window.prompt(
        "Indiquez le motif du refus du paiement :",
      );

    if (
      !rejectionReason?.trim()
    ) {
      return;
    }

    void performAction(
      "reject_payment",
      rejectionReason.trim(),
    );
  }

  function cancelRequest() {
    const confirmed =
      window.confirm(
        "Voulez-vous vraiment annuler ce dossier ?",
      );

    if (!confirmed) {
      return;
    }

    void performAction(
      "cancel_request",
    );
  }

  const paymentCanBeReviewed =
    currentStatus ===
    "payment_review";

  const policyCanStart =
    currentStatus ===
    "payment_confirmed";

  const requestCanBeCancelled =
    currentStatus !==
      "policy_available" &&
    currentStatus !==
      "cancelled";

  const noActionAvailable =
    !paymentCanBeReviewed &&
    !policyCanStart &&
    !requestCanBeCancelled;

  return (
    <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
          Traitement
        </p>

        <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
          Actions du dossier
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Modifiez le statut selon l’avancement du traitement.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {paymentCanBeReviewed && (
          <>
            <button
              type="button"
              disabled={
                loadingAction !==
                null
              }
              onClick={() =>
                void performAction(
                  "confirm_payment",
                )
              }
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0B5D3B] px-5 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingAction ===
              "confirm_payment"
                ? "Validation en cours..."
                : "✓ Valider le paiement"}
            </button>

            <button
              type="button"
              disabled={
                loadingAction !==
                null
              }
              onClick={
                rejectPayment
              }
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingAction ===
              "reject_payment"
                ? "Refus en cours..."
                : "Refuser le paiement"}
            </button>
          </>
        )}

        {policyCanStart && (
          <button
            type="button"
            disabled={
              loadingAction !==
              null
            }
            onClick={() =>
              void performAction(
                "start_policy",
              )
            }
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#B8E83D] px-5 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingAction ===
            "start_policy"
              ? "Mise à jour en cours..."
              : "Commencer la préparation"}
          </button>
        )}

        {requestCanBeCancelled && (
          <button
            type="button"
            disabled={
              loadingAction !==
              null
            }
            onClick={
              cancelRequest
            }
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingAction ===
            "cancel_request"
              ? "Annulation en cours..."
              : "Annuler le dossier"}
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {errorMessage}
        </div>
      )}

      {noActionAvailable && (
        <div className="mt-5 rounded-xl border border-slate-100 bg-[#FAFCFA] px-4 py-3 text-sm text-slate-500">
          Aucune action n’est disponible pour ce dossier.
        </div>
      )}
    </section>
  );
}