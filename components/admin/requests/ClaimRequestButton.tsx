"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

type UserRole =
  | "agent"
  | "admin";

type ClaimRequestButtonProps = {
  requestId: string;

  assignedAgentId:
    | string
    | null;

  assignedAgentName?:
    | string
    | null;

  currentUserId: string;

  currentUserRole:
    UserRole;
};

export default function ClaimRequestButton({
  requestId,
  assignedAgentId,
  assignedAgentName,
  currentUserId,
  currentUserRole,
}: ClaimRequestButtonProps) {
  const router =
    useRouter();

  /*
   * État local de l'attribution.
   *
   * Cela permet au bouton de changer
   * immédiatement après le clic,
   * sans attendre le refresh serveur.
   */
  const [
    localAssignedAgentId,
    setLocalAssignedAgentId,
  ] =
    useState<
      string | null
    >(
      assignedAgentId,
    );

  const [
    localAssignedAgentName,
    setLocalAssignedAgentName,
  ] =
    useState<
      string | null
    >(
      assignedAgentName ??
        null,
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

  /*
   * Si les données serveur changent
   * après router.refresh(),
   * on synchronise l'état local.
   */
  useEffect(() => {
    setLocalAssignedAgentId(
      assignedAgentId,
    );

    setLocalAssignedAgentName(
      assignedAgentName ??
        null,
    );
  }, [
    assignedAgentId,
    assignedAgentName,
  ]);

  /*
   * Le dossier appartient
   * à l'utilisateur connecté.
   */
  const alreadyMine =
    localAssignedAgentId ===
    currentUserId;

  /*
   * Le dossier appartient
   * à un autre agent.
   */
  const assignedToSomeoneElse =
    Boolean(
      localAssignedAgentId &&
        localAssignedAgentId !==
          currentUserId,
    );

  /*
   * Aucun responsable.
   */
  const isAvailable =
    !localAssignedAgentId;

  async function claimRequest() {
    if (
      loading ||
      !isAvailable
    ) {
      return;
    }

    setLoading(
      true,
    );

    setErrorMessage(
      "",
    );

    try {
      const response =
        await fetch(
          `/api/admin/requests/${requestId}/claim`,
          {
            method:
              "POST",

            cache:
              "no-store",
          },
        );

      const result =
        (await response.json()) as {
          success?: boolean;

          alreadyClaimed?: boolean;

          requestId?: string;

          agentId?: string;

          agentName?: string;

          message?: string;

          error?: string;
        };

      /*
       * Un autre agent a été
       * plus rapide.
       */
      if (
        response.status ===
        409
      ) {
        /*
         * On recharge les données
         * pour connaître le nouveau
         * responsable.
         */
        router.refresh();

        return;
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "La prise en charge du dossier a échoué.",
        );
      }

      /*
       * IMPORTANT :
       *
       * On change immédiatement
       * le bouton en "Ouvrir".
       */
      setLocalAssignedAgentId(
        result.agentId ??
          currentUserId,
      );

      setLocalAssignedAgentName(
        result.agentName ??
          "Vous",
      );

      /*
       * Puis on synchronise
       * avec la base de données.
       */
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
      setLoading(
        false,
      );
    }
  }

  /*
   * =========================================
   * DOSSIER À MOI
   *
   * "Prendre en charge"
   * devient "Ouvrir"
   * =========================================
   */
  if (alreadyMine) {
    return (
      <Link
        href={`/admin/dossiers/${requestId}`}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#18C100] px-5 text-sm font-semibold text-white transition hover:bg-[#14A300]"
      >
        Ouvrir
      </Link>
    );
  }

  /*
   * =========================================
   * DOSSIER PRIS PAR QUELQU'UN D'AUTRE
   * =========================================
   */
  if (
    assignedToSomeoneElse
  ) {
    /*
     * ADMIN
     */
    if (
      currentUserRole ===
      "admin"
    ) {
      return (
        <div className="space-y-2">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center">
            <p className="text-xs font-medium text-slate-500">
              Pris en charge par
            </p>

            <p className="mt-1 text-sm font-bold text-[#2F2963]">
              {localAssignedAgentName ||
                "Agent"}
            </p>
          </div>

          <Link
            href={`/admin/dossiers/${requestId}`}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#2F2963]/20 bg-white px-4 text-sm font-semibold text-[#2F2963] transition hover:bg-[#2F2963]/5"
          >
            Ouvrir
          </Link>
        </div>
      );
    }

    /*
     * AUTRE AGENT
     */
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-600">
        Déjà pris en charge
      </div>
    );
  }

  /*
   * =========================================
   * DOSSIER LIBRE
   * =========================================
   */
  return (
    <div>
      <button
        type="button"
        onClick={
          claimRequest
        }
        disabled={
          loading
        }
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#2F2963] px-5 text-sm font-semibold text-white transition hover:bg-[#24204F] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Prise en charge..."
          : "Prendre en charge"}
      </button>

      {errorMessage && (
        <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}
    </div>
  );
}