"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type AgentItem = {
  id: string;
  name: string;
  email: string;
  role:
    | "agent"
    | "admin";
};

type AssignAgentProps = {
  requestId: string;

  currentAgentId:
    | string
    | null;

  agents:
    AgentItem[];

  canAssign?: boolean;

  currentUserId?: string;

  currentUserRole?:
    | "agent"
    | "admin";
};

export default function AssignAgent({
  requestId,
  currentAgentId,
  agents,
  canAssign = true,
  currentUserId,
  currentUserRole,
}: AssignAgentProps) {
  const router =
    useRouter();

  const [
    selectedAgentId,
    setSelectedAgentId,
  ] =
    useState(
      currentAgentId ??
      "",
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

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const selectedAgent =
    agents.find(
      (
        agent,
      ) =>
        agent.id ===
        selectedAgentId,
    );

  const currentAgent =
    agents.find(
      (
        agent,
      ) =>
        agent.id ===
        currentAgentId,
    );

  const isCurrentUserAssigned =
    Boolean(
      currentAgentId &&
      currentUserId &&
      currentAgentId ===
        currentUserId,
    );

  const canClaim =
    currentUserRole ===
      "agent" &&
    !currentAgentId;

  async function claimRequest() {
    if (!canClaim) {
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/requests/${requestId}/claim`,
          {
            method:
              "POST",
          },
        );

      const result =
        (await response.json()) as {
          success?: boolean;
          alreadyClaimed?: boolean;
          agentName?: string;
          error?: string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "La prise en charge du dossier a échoué.",
        );
      }

      setSuccessMessage(
        result.alreadyClaimed
          ? "Ce dossier vous est déjà attribué."
          : `Dossier pris en charge par ${result.agentName ?? "vous"}.`,
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

  async function saveAssignment() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/requests/${requestId}/assign`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                agentId:
                  selectedAgentId ||
                  null,
              }),
          },
        );

      const result =
        (await response.json()) as {
          success?: boolean;
          agentName?: string | null;
          error?: string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "L’attribution du dossier a échoué.",
        );
      }

      setSuccessMessage(
        selectedAgentId
          ? `Dossier attribué à ${result.agentName ?? "l’agent"}.`
          : "L’attribution du dossier a été supprimée.",
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
    <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
          Responsable
        </p>

        <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
          Agent responsable
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Gérez la prise en charge et l’attribution de ce dossier.
        </p>
      </div>

      {currentAgentId && (
        <div className="mt-5 rounded-2xl border border-[#CFE3CF] bg-[#F3F8F2] p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#0B5D3B]">
            Actuellement attribué
          </p>

          <p className="mt-1 font-semibold text-[#102B20]">
            {currentAgent?.name ??
              "Agent"}
          </p>

          {isCurrentUserAssigned && (
            <p className="mt-2 text-sm font-semibold text-[#0B5D3B]">
              ✓ Ce dossier vous est attribué.
            </p>
          )}
        </div>
      )}

      {!currentAgentId && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-700">
          Ce dossier n’est actuellement attribué à aucun agent.
        </div>
      )}

      {canClaim && (
        <button
          type="button"
          onClick={
            claimRequest
          }
          disabled={
            loading
          }
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#B8E83D] px-5 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Prise en charge..."
            : "Prendre en charge ce dossier"}
        </button>
      )}

      {canAssign ? (
        <>
          <div className="mt-5">
            <label
              htmlFor="assigned-agent"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Sélectionner un agent
            </label>

            <select
              id="assigned-agent"
              value={
                selectedAgentId
              }
              onChange={(
                event,
              ) => {
                setSelectedAgentId(
                  event.target.value,
                );

                setErrorMessage("");
                setSuccessMessage("");
              }}
              disabled={
                loading
              }
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                Aucun agent
              </option>

              {agents.map(
                (
                  agent,
                ) => (
                  <option
                    key={
                      agent.id
                    }
                    value={
                      agent.id
                    }
                  >
                    {agent.name} —{" "}
                    {agent.role ===
                    "admin"
                      ? "Administrateur"
                      : "Agent"}
                  </option>
                ),
              )}
            </select>
          </div>

          {selectedAgent && (
            <div className="mt-3 rounded-xl border border-slate-100 bg-[#FAFCFA] px-4 py-3">
              <p className="font-semibold text-[#102B20]">
                {selectedAgent.name}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {selectedAgent.email}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={
              saveAssignment
            }
            disabled={
              loading
            }
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0B5D3B] px-5 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Enregistrement..."
              : "Enregistrer l’attribution"}
          </button>
        </>
      ) : (
        <>
          {!canClaim && (
            <p className="mt-4 text-sm text-slate-500">
              Seul un administrateur peut modifier l’agent responsable.
            </p>
          )}
        </>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}
    </section>
  );
}