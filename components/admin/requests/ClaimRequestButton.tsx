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

  const alreadyMine =
    localAssignedAgentId ===
    currentUserId;

  const assignedToSomeoneElse =
    Boolean(
      localAssignedAgentId &&
        localAssignedAgentId !==
          currentUserId,
    );

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

      if (
        response.status ===
        409
      ) {
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

      setLocalAssignedAgentId(
        result.agentId ??
          currentUserId,
      );

      setLocalAssignedAgentName(
        result.agentName ??
          "Vous",
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
      setLoading(
        false,
      );
    }
  }

  if (alreadyMine) {
    return (
      <Link
        href={`/admin/dossiers/${requestId}`}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0B5D3B] px-5 text-sm font-black text-white transition hover:bg-[#084A2F]"
      >
        Ouvrir
      </Link>
    );
  }

  if (
    assignedToSomeoneElse
  ) {
    if (
      currentUserRole ===
      "admin"
    ) {
      return (
        <div className="space-y-2">
          <div className="rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-4 py-3 text-center">
            <p className="text-xs font-medium text-slate-500">
              Pris en charge par
            </p>

            <p className="mt-1 text-sm font-semibold text-[#0B5D3B]">
              {localAssignedAgentName ||
                "Agent"}
            </p>
          </div>

          <Link
            href={`/admin/dossiers/${requestId}`}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#CFE3CF] bg-white px-4 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#F3F8F2]"
          >
            Ouvrir
          </Link>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-500">
        Déjà pris en charge
      </div>
    );
  }

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
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#B8E83D] px-5 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Prise en charge..."
          : "Prendre en charge"}
      </button>

      {errorMessage && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}
    </div>
  );
}