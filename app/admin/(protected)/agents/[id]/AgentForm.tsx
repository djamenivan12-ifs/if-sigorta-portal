"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Role =
  | "agent"
  | "admin";

type AgentFormProps = {
  agentId: string;
  initialFirstName: string;
  initialLastName: string;
  initialEmail: string;
  initialRole: Role;
  initialDisabled: boolean;
};

export default function AgentForm({
  agentId,
  initialFirstName,
  initialLastName,
  initialEmail,
  initialRole,
  initialDisabled,
}: AgentFormProps) {
  const router =
    useRouter();

  const [
    firstName,
    setFirstName,
  ] =
    useState(
      initialFirstName,
    );

  const [
    lastName,
    setLastName,
  ] =
    useState(
      initialLastName,
    );

  const [
    email,
    setEmail,
  ] =
    useState(
      initialEmail,
    );

  const [
    role,
    setRole,
  ] =
    useState<Role>(
      initialRole,
    );

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    disabled,
    setDisabled,
  ] =
    useState(
      initialDisabled,
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

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/agents/${agentId}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                firstName,
                lastName,
                email,
                role,
                password:
                  password ||
                  undefined,
                disabled,
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
            "La modification de l’agent a échoué.",
        );
      }

      setPassword("");

      setSuccessMessage(
        "Agent mis à jour avec succès.",
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

  const inputClassName =
    "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#102B20] outline-none transition placeholder:text-slate-400 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 disabled:cursor-not-allowed disabled:bg-slate-100";

  return (
    <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-8"
      >
        <div>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
              Informations personnelles
            </p>

            <h3 className="mt-2 text-lg font-semibold text-[#102B20]">
              Identité de l’utilisateur
            </h3>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="agent-first-name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Prénom
              </label>

              <input
                id="agent-first-name"
                value={
                  firstName
                }
                onChange={(
                  event,
                ) => {
                  setFirstName(
                    event.target.value,
                  );

                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                required
                className={
                  inputClassName
                }
              />
            </div>

            <div>
              <label
                htmlFor="agent-last-name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nom
              </label>

              <input
                id="agent-last-name"
                value={
                  lastName
                }
                onChange={(
                  event,
                ) => {
                  setLastName(
                    event.target.value,
                  );

                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                required
                className={
                  inputClassName
                }
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
              Connexion
            </p>

            <h3 className="mt-2 text-lg font-semibold text-[#102B20]">
              Identifiants du compte
            </h3>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="agent-email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email
              </label>

              <input
                id="agent-email"
                type="email"
                value={
                  email
                }
                onChange={(
                  event,
                ) => {
                  setEmail(
                    event.target.value,
                  );

                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                required
                className={
                  inputClassName
                }
              />
            </div>

            <div>
              <label
                htmlFor="agent-password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nouveau mot de passe
              </label>

              <input
                id="agent-password"
                type="password"
                value={
                  password
                }
                onChange={(
                  event,
                ) => {
                  setPassword(
                    event.target.value,
                  );

                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                minLength={8}
                placeholder="Laisser vide pour ne pas modifier"
                className={
                  inputClassName
                }
              />

              <p className="mt-2 text-xs text-slate-400">
                Minimum 8 caractères si vous souhaitez le modifier.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
              Autorisations
            </p>

            <h3 className="mt-2 text-lg font-semibold text-[#102B20]">
              Rôle de l’utilisateur
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Sélectionnez le niveau d’accès à l’espace de gestion.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setRole(
                  "agent",
                );

                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`relative rounded-2xl border p-5 text-left transition ${
                role ===
                "agent"
                  ? "border-[#0B5D3B] bg-[#F3F8F2] ring-4 ring-[#0B5D3B]/5"
                  : "border-slate-200 bg-white hover:border-[#CFE3CF] hover:bg-[#FAFCFA]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="block font-semibold text-[#102B20]">
                    Agent
                  </span>

                  <span className="mt-2 block text-sm leading-6 text-slate-500">
                    Peut traiter les dossiers et effectuer les opérations autorisées.
                  </span>
                </div>

                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    role ===
                    "agent"
                      ? "border-[#0B5D3B] bg-[#0B5D3B]"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {role ===
                    "agent" && (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  )}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole(
                  "admin",
                );

                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`relative rounded-2xl border p-5 text-left transition ${
                role ===
                "admin"
                  ? "border-[#0B5D3B] bg-[#F3F8F2] ring-4 ring-[#0B5D3B]/5"
                  : "border-slate-200 bg-white hover:border-[#CFE3CF] hover:bg-[#FAFCFA]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="block font-semibold text-[#102B20]">
                    Administrateur
                  </span>

                  <span className="mt-2 block text-sm leading-6 text-slate-500">
                    Dispose de l’accès complet, y compris la gestion des agents.
                  </span>
                </div>

                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    role ===
                    "admin"
                      ? "border-[#0B5D3B] bg-[#0B5D3B]"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {role ===
                    "admin" && (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  )}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
              État du compte
            </p>

            <h3 className="mt-2 text-lg font-semibold text-[#102B20]">
              Accès à la plateforme
            </h3>
          </div>

          <label
            className={`flex cursor-pointer items-center justify-between gap-5 rounded-2xl border p-5 transition ${
              disabled
                ? "border-red-200 bg-red-50"
                : "border-[#CFE3CF] bg-[#F3F8F2]"
            }`}
          >
            <div>
              <p
                className={`font-semibold ${
                  disabled
                    ? "text-red-800"
                    : "text-[#102B20]"
                }`}
              >
                {disabled
                  ? "Compte désactivé"
                  : "Compte actif"}
              </p>

              <p
                className={`mt-1 text-sm leading-6 ${
                  disabled
                    ? "text-red-600"
                    : "text-slate-500"
                }`}
              >
                {disabled
                  ? "L’utilisateur ne peut actuellement plus se connecter."
                  : "L’utilisateur peut actuellement accéder à son espace."}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden text-xs font-semibold text-slate-500 sm:inline">
                Désactiver
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={
                  disabled
                }
                onClick={() => {
                  setDisabled(
                    !disabled,
                  );

                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className={`relative h-7 w-12 rounded-full transition ${
                  disabled
                    ? "bg-red-500"
                    : "bg-[#0B5D3B]"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                    disabled
                      ? "left-6"
                      : "left-1"
                  }`}
                />
              </button>
            </div>
          </label>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {
              errorMessage
            }
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-4 py-3 text-sm font-semibold text-[#0B5D3B]">
            {
              successMessage
            }
          </div>
        )}

        <div className="border-t border-slate-100 pt-6">
          <button
            type="submit"
            disabled={
              loading
            }
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#B8E83D] px-5 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {loading
              ? "Enregistrement..."
              : "Enregistrer les modifications"}
          </button>
        </div>
      </form>
    </section>
  );
}