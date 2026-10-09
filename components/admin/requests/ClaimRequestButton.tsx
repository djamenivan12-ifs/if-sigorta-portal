"use client";

import { useState } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

type UserRole = "agent" | "admin";

type ClaimRequestButtonProps = {
  requestId: string;

  assignedAgentId: string | null;

  assignedAgentName?: string | null;

  currentUserId: string;

  currentUserRole: UserRole;
};

function ClaimRequestButtonContent({
  requestId,
  assignedAgentId,
  assignedAgentName,
  currentUserId,
  currentUserRole,
}: ClaimRequestButtonProps) {
  const router = useRouter();

  const [localAssignedAgentId, setLocalAssignedAgentId] = useState<
    string | null
  >(assignedAgentId);

  const [localAssignedAgentName, setLocalAssignedAgentName] = useState<
    string | null
  >(assignedAgentName ?? null);

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const alreadyMine = localAssignedAgentId === currentUserId;

  const assignedToSomeoneElse = Boolean(
    localAssignedAgentId && localAssignedAgentId !== currentUserId,
  );

  const isAvailable = !localAssignedAgentId;

  async function claimRequest() {
    if (loading || !isAvailable) {
      return;
    }

    setLoading(true);

    setErrorMessage("");

    try {
      const response = await fetch(`/api/admin/requests/${requestId}/claim`, {
        method: "POST",

        cache: "no-store",
      });

      const result = (await response.json()) as {
        success?: boolean;

        alreadyClaimed?: boolean;

        requestId?: string;

        agentId?: string;

        agentName?: string;

        message?: string;

        error?: string;
      };

      if (response.status === 409) {
        setErrorMessage(
          result.error ||
            "Ce dossier vient d’être pris en charge ou a changé de statut.",
        );
        router.refresh();
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "La prise en charge du dossier a échoué.",
        );
      }

      setLocalAssignedAgentId(result.agentId ?? currentUserId);

      setLocalAssignedAgentName(result.agentName ?? "Vous");

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

  if (alreadyMine) {
    return (
      <Link
        href={`/admin/dossiers/${requestId}`}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-lime px-5 text-sm font-black text-brand-navy transition hover:bg-brand-lime/85"
      >
        Ouvrir
      </Link>
    );
  }

  if (assignedToSomeoneElse) {
    if (currentUserRole === "admin") {
      return (
        <div className="space-y-2">
          <div className="rounded-xl border border-brand-border bg-brand-ice px-4 py-3 text-center">
            <p className="text-xs font-medium text-slate-500">
              Pris en charge par
            </p>

            <p className="mt-1 text-sm font-semibold text-brand-navy">
              {localAssignedAgentName || "Agent"}
            </p>
          </div>

          <Link
            href={`/admin/dossiers/${requestId}`}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-navy transition hover:bg-brand-ice"
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
        onClick={claimRequest}
        disabled={loading}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-lime px-5 text-sm font-black text-brand-navy transition hover:bg-brand-lime disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Prise en charge..." : "Prendre en charge"}
      </button>

      {errorMessage && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
export default function ClaimRequestButton(props: ClaimRequestButtonProps) {
  return (
    <ClaimRequestButtonContent
      key={[
        props.requestId,
        props.assignedAgentId,
        props.assignedAgentName,
      ].join(":")}
      {...props}
    />
  );
}
