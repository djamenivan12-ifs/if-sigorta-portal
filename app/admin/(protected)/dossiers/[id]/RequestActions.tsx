"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const router = useRouter();

  const [loadingAction, setLoadingAction] =
    useState<Action | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function performAction(
    action: Action,
    rejectionReason?: string,
  ) {
    setLoadingAction(action);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/admin/requests/${requestId}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            rejectionReason,
          }),
        },
      );

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "La modification du dossier a échoué.",
        );
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  function rejectPayment() {
    const rejectionReason = window.prompt(
      "Indiquez le motif du refus du paiement :",
    );

    if (!rejectionReason?.trim()) {
      return;
    }

    void performAction(
      "reject_payment",
      rejectionReason.trim(),
    );
  }

  function cancelRequest() {
    const confirmed = window.confirm(
      "Voulez-vous vraiment annuler ce dossier ?",
    );

    if (!confirmed) {
      return;
    }

    void performAction("cancel_request");
  }

  const paymentCanBeReviewed =
    currentStatus === "payment_review";

  const policyCanStart =
    currentStatus === "payment_confirmed";

  const requestCanBeCancelled =
    currentStatus !== "policy_available" &&
    currentStatus !== "cancelled";

  const noActionAvailable =
    !paymentCanBeReviewed &&
    !policyCanStart &&
    !requestCanBeCancelled;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">
        Actions du dossier
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Modifiez le statut selon l’avancement du traitement.
      </p>

      <div className="mt-6 space-y-3">
        {paymentCanBeReviewed && (
          <>
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() =>
                void performAction("confirm_payment")
              }
              className="w-full rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingAction === "confirm_payment"
                ? "Validation en cours..."
                : "✓ Valider le paiement"}
            </button>

            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={rejectPayment}
              className="w-full rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingAction === "reject_payment"
                ? "Refus en cours..."
                : "Refuser le paiement"}
            </button>
          </>
        )}

        {policyCanStart && (
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={() =>
              void performAction("start_policy")
            }
            className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingAction === "start_policy"
              ? "Mise à jour en cours..."
              : "Commencer la préparation"}
          </button>
        )}

        {requestCanBeCancelled && (
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={cancelRequest}
            className="w-full rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingAction === "cancel_request"
              ? "Annulation en cours..."
              : "Annuler le dossier"}
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {errorMessage}
        </div>
      )}

      {noActionAvailable && (
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Aucune action n’est disponible pour ce dossier.
        </p>
      )}
    </section>
  );
}