"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

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
  ] = useState(
    initialFirstName,
  );

  const [
    lastName,
    setLastName,
  ] = useState(
    initialLastName,
  );

  const [
    email,
    setEmail,
  ] = useState(
    initialEmail,
  );

  const [
    role,
    setRole,
  ] = useState<Role>(
    initialRole,
  );

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    disabled,
    setDisabled,
  ] = useState(
    initialDisabled,
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

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

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-6"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Prénom
            </label>

            <input
              value={
                firstName
              }
              onChange={(
                event,
              ) =>
                setFirstName(
                  event.target.value,
                )
              }
              required
              className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Nom
            </label>

            <input
              value={
                lastName
              }
              onChange={(
                event,
              ) =>
                setLastName(
                  event.target.value,
                )
              }
              required
              className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            Email
          </label>

          <input
            type="email"
            value={
              email
            }
            onChange={(
              event,
            ) =>
              setEmail(
                event.target.value,
              )
            }
            required
            className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            Rôle
          </label>

          <select
            value={role}
            onChange={(
              event,
            ) =>
              setRole(
                event.target
                  .value as Role,
              )
            }
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
          >
            <option value="agent">
              Agent
            </option>

            <option value="admin">
              Administrateur
            </option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            Nouveau mot de passe
          </label>

          <input
            type="password"
            value={
              password
            }
            onChange={(
              event,
            ) =>
              setPassword(
                event.target.value,
              )
            }
            minLength={8}
            placeholder="Laisser vide pour ne pas modifier"
            className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
          />
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
          <div>
            <p className="font-semibold text-slate-900">
              Désactiver le compte
            </p>

            <p className="mt-1 text-sm text-slate-500">
              L’utilisateur ne pourra plus se connecter.
            </p>
          </div>

          <input
            type="checkbox"
            checked={
              disabled
            }
            onChange={(
              event,
            ) =>
              setDisabled(
                event.target.checked,
              )
            }
            className="h-5 w-5"
          />
        </label>

        {errorMessage && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading
          }
          className="w-full rounded-xl bg-[#18C100] px-5 py-3 font-semibold text-white transition hover:bg-[#14A300] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Enregistrement..."
            : "Enregistrer les modifications"}
        </button>
      </form>
    </section>
  );
}