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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
          Responsable
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Agent responsable
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Gestion de la prise en charge du dossier.
        </p>
      </div>

      {currentAgentId && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Actuellement attribué
          </p>

          <p className="mt-1 font-bold text-slate-900">
            {currentAgent?.name ??
              "Agent"}
          </p>

          {isCurrentUserAssigned && (
            <p className="mt-2 text-sm font-semibold text-green-700">
              ✓ Ce dossier vous est attribué.
            </p>
          )}
        </div>
      )}

      {!currentAgentId && (
        <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-700">
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
          className="mt-5 w-full rounded-xl bg-[#18C100] px-5 py-3 font-semibold text-white transition hover:bg-[#14A300] disabled:cursor-not-allowed disabled:opacity-50"
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
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
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
            <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
              <p className="font-semibold text-slate-900">
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
            className="mt-5 w-full rounded-xl bg-[#2F2963] px-5 py-3 font-semibold text-white transition hover:bg-[#24204F] disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}
    </section>
  );
}