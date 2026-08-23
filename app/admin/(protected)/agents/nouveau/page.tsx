"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Role =
  | "agent"
  | "admin";

type ApiResponse = {
  success?: boolean;
  agentId?: string;
  email?: string;
  role?: Role;
  error?: string;
};

export default function NouveauAgentPage() {
  const router =
    useRouter();

  const [
    firstName,
    setFirstName,
  ] =
    useState("");

  const [
    lastName,
    setLastName,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    role,
    setRole,
  ] =
    useState<Role>(
      "agent",
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

    setErrorMessage("");
    setSuccessMessage("");

    const cleanedFirstName =
      firstName.trim();

    const cleanedLastName =
      lastName.trim();

    const cleanedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanedFirstName ||
      !cleanedLastName ||
      !cleanedEmail ||
      !password
    ) {
      setErrorMessage(
        "Tous les champs sont obligatoires.",
      );

      return;
    }

    if (
      password.length < 8
    ) {
      setErrorMessage(
        "Le mot de passe doit contenir au moins 8 caractères.",
      );

      return;
    }

    setLoading(
      true,
    );

    try {
      const response =
        await fetch(
          "/api/admin/agents",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                firstName:
                  cleanedFirstName,

                lastName:
                  cleanedLastName,

                email:
                  cleanedEmail,

                password,

                role,
              }),
          },
        );

      const result =
        (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Le compte n’a pas pu être créé.",
        );
      }

      setSuccessMessage(
        role === "admin"
          ? "Le compte administrateur a été créé."
          : "Le compte agent a été créé.",
      );

      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setRole(
        "agent",
      );

      setTimeout(() => {
        router.push(
          "/admin/agents",
        );

        router.refresh();
      }, 1000);
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  const inputClassName =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/agents"
          className="inline-flex items-center text-sm font-semibold text-[#2F2963] hover:underline"
        >
          ← Retour aux agents
        </Link>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
              Administration
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Ajouter un utilisateur interne
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Créez un compte agent ou administrateur pour l’espace de gestion IF Sigorta.
            </p>
          </div>

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-8 space-y-6"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Prénom
                </label>

                <input
                  id="firstName"
                  type="text"
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
                  }}
                  required
                  className={
                    inputClassName
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Nom
                </label>

                <input
                  id="lastName"
                  type="text"
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
                  }}
                  required
                  className={
                    inputClassName
                  }
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Adresse e-mail
              </label>

              <input
                id="email"
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
                }}
                autoComplete="email"
                required
                className={
                  inputClassName
                }
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Mot de passe
              </label>

              <input
                id="password"
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
                }}
                autoComplete="new-password"
                required
                minLength={8}
                className={
                  inputClassName
                }
              />

              <p className="mt-2 text-xs text-slate-500">
                Minimum 8 caractères.
              </p>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-700">
                Rôle
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    setRole(
                      "agent",
                    )
                  }
                  className={`rounded-xl border p-5 text-left transition ${
                    role === "agent"
                      ? "border-[#2F2963] bg-violet-50 ring-2 ring-violet-100"
                      : "border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="block font-bold text-slate-900">
                    Agent
                  </span>

                  <span className="mt-1 block text-sm leading-6 text-slate-600">
                    Peut traiter les dossiers clients et gérer les opérations qui lui sont autorisées.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setRole(
                      "admin",
                    )
                  }
                  className={`rounded-xl border p-5 text-left transition ${
                    role === "admin"
                      ? "border-[#2F2963] bg-violet-50 ring-2 ring-violet-100"
                      : "border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="block font-bold text-slate-900">
                    Administrateur
                  </span>

                  <span className="mt-1 block text-sm leading-6 text-slate-600">
                    Dispose de l’accès complet, y compris la gestion des agents.
                  </span>
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {
                  errorMessage
                }
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                {
                  successMessage
                }
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/admin/agents"
                className="rounded-xl border border-slate-300 px-6 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Annuler
              </Link>

              <button
                type="submit"
                disabled={
                  loading
                }
                className="rounded-xl bg-[#18C100] px-6 py-3 font-semibold text-white transition hover:bg-[#14A300] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading
                  ? "Création..."
                  : role ===
                      "admin"
                    ? "Créer l’administrateur"
                    : "Créer l’agent"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}