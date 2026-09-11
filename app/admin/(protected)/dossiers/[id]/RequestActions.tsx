"use client";

import {
  useRouter,
} from "next/navigation";

import {
  useEffect,
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

type InsuranceOption = {
  id: string;
  name: string;
};

type InsuranceOptionsResponse = {
  success?: boolean;
  insurers?: InsuranceOption[];
  error?: string;
};

type ActionResponse = {
  success?: boolean;
  error?: string;
};

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

  const [
    insurerModalOpen,
    setInsurerModalOpen,
  ] =
    useState(false);

  const [
    insurers,
    setInsurers,
  ] =
    useState<
      InsuranceOption[]
    >([]);

  const [
    selectedInsurerId,
    setSelectedInsurerId,
  ] =
    useState("");

  const [
    insurersLoading,
    setInsurersLoading,
  ] =
    useState(false);

  const [
    insurerError,
    setInsurerError,
  ] =
    useState("");

  useEffect(() => {
    if (
      !insurerModalOpen
    ) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
          "Escape" &&
        loadingAction !==
          "start_policy"
      ) {
        setInsurerModalOpen(
          false,
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    insurerModalOpen,
    loadingAction,
  ]);

  async function performAction(
    action: Action,
    rejectionReason?: string,
    insuranceCompanyId?: string,
  ) {
    setLoadingAction(
      action,
    );

    setErrorMessage(
      "",
    );

    if (
      action ===
      "start_policy"
    ) {
      setInsurerError(
        "",
      );
    }

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
                insuranceCompanyId,
              }),
          },
        );

      const result =
        (await response.json()) as ActionResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "La modification du dossier a échoué.",
        );
      }

      if (
        action ===
        "start_policy"
      ) {
        setInsurerModalOpen(
          false,
        );

        setSelectedInsurerId(
          "",
        );
      }

      router.refresh();
    } catch (
      error
    ) {
      const message =
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.";

      if (
        action ===
        "start_policy"
      ) {
        setInsurerError(
          message,
        );
      } else {
        setErrorMessage(
          message,
        );
      }
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

  async function openInsurerModal() {
    setErrorMessage(
      "",
    );

    setInsurerError(
      "",
    );

    setSelectedInsurerId(
      "",
    );

    setInsurers(
      [],
    );

    setInsurerModalOpen(
      true,
    );

    setInsurersLoading(
      true,
    );

    try {
      const response =
        await fetch(
          `/api/admin/requests/${requestId}/insurance-options`,
          {
            method:
              "GET",

            cache:
              "no-store",
          },
        );

      const result =
        (await response.json()) as InsuranceOptionsResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Impossible de charger les assureurs disponibles.",
        );
      }

      setInsurers(
        result.insurers ??
          [],
      );
    } catch (
      error
    ) {
      setInsurerError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les assureurs disponibles.",
      );
    } finally {
      setInsurersLoading(
        false,
      );
    }
  }

  function closeInsurerModal() {
    if (
      loadingAction ===
      "start_policy"
    ) {
      return;
    }

    setInsurerModalOpen(
      false,
    );

    setSelectedInsurerId(
      "",
    );

    setInsurerError(
      "",
    );
  }

  function confirmInsurerSelection() {
    if (
      !selectedInsurerId
    ) {
      setInsurerError(
        "Veuillez sélectionner un assureur.",
      );

      return;
    }

    void performAction(
      "start_policy",
      undefined,
      selectedInsurerId,
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
    <>
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
                void openInsurerModal()
              }
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#B8E83D] px-5 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Commencer l’assurance
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

      {insurerModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              loadingAction !==
                "start_policy"
            ) {
              closeInsurerModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="insurer-selection-title"
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-[1.75rem] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                  Préparation
                </p>

                <h2
                  id="insurer-selection-title"
                  className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#102B20] sm:text-2xl"
                >
                  Choisir l’assureur
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sélectionnez l’assureur avant de commencer la préparation de l’assurance.
                </p>
              </div>

              <button
                type="button"
                aria-label="Fermer"
                disabled={
                  loadingAction ===
                  "start_policy"
                }
                onClick={
                  closeInsurerModal
                }
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              {insurersLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-[#FAFCFA] px-4 py-5 text-center text-sm font-medium text-slate-500">
                  Chargement des assureurs disponibles...
                </div>
              ) : insurers.length >
                0 ? (
                <div className="space-y-3">
                  {insurers.map(
                    (
                      insurer,
                    ) => {
                      const selected =
                        selectedInsurerId ===
                        insurer.id;

                      return (
                        <button
                          key={
                            insurer.id
                          }
                          type="button"
                          disabled={
                            loadingAction ===
                            "start_policy"
                          }
                          onClick={() => {
                            setSelectedInsurerId(
                              insurer.id,
                            );

                            setInsurerError(
                              "",
                            );
                          }}
                          className={`flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition sm:px-5 ${
                            selected
                              ? "border-[#0B5D3B] bg-[#F2F8F4] ring-1 ring-[#0B5D3B]"
                              : "border-slate-200 bg-white hover:border-[#8EB7A3] hover:bg-[#FAFCFA]"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-[#102B20] sm:text-base">
                              {
                                insurer.name
                              }
                            </span>

                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              Tarif disponible pour ce dossier
                            </span>
                          </span>

                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? "border-[#0B5D3B] bg-[#0B5D3B]"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {selected && (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              ) : (
                !insurerError && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
                    Aucun assureur ne possède actuellement un tarif applicable à ce dossier.
                  </div>
                )
              )}
            </div>

            {insurerError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {
                  insurerError
                }
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={
                  loadingAction ===
                  "start_policy"
                }
                onClick={
                  closeInsurerModal
                }
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={
                  insurersLoading ||
                  !selectedInsurerId ||
                  loadingAction ===
                    "start_policy"
                }
                onClick={
                  confirmInsurerSelection
                }
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0B5D3B] px-5 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {loadingAction ===
                "start_policy"
                  ? "Démarrage en cours..."
                  : "Confirmer et commencer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}