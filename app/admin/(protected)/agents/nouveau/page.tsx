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
    "h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-[#102B20] outline-none transition placeholder:text-slate-400 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:h-12 sm:px-4 sm:text-sm";

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-4xl">
        <Link
          href="/admin/agents"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] sm:text-sm"
        >
          <span aria-hidden="true">
            ←
          </span>

          Retour aux agents
        </Link>

        <div className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white sm:mt-6 sm:rounded-[1.75rem]">
          <div className="border-b border-slate-100 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F8F2] text-lg font-black text-[#0B5D3B] sm:h-12 sm:w-12 sm:rounded-2xl sm:text-xl">
                +
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
                  Administration
                </p>

                <h1 className="mt-2 break-words text-xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-2xl lg:text-3xl">
                  Ajouter un utilisateur interne
                </h1>

                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-500 sm:mt-3 sm:text-sm sm:leading-7">
                  Créez un compte agent ou administrateur
                  pour l’espace de gestion IF Sigorta.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="min-w-0 p-4 sm:p-6 lg:p-8"
          >
            <div>
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                  Informations personnelles
                </p>

                <h2 className="mt-2 text-lg font-semibold text-[#102B20]">
                  Identité de l’utilisateur
                </h2>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
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
                    value={firstName}
                    onChange={(event) => {
                      setFirstName(
                        event.target.value,
                      );

                      setErrorMessage("");
                    }}
                    required
                    className={inputClassName}
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
                    value={lastName}
                    onChange={(event) => {
                      setLastName(
                        event.target.value,
                      );

                      setErrorMessage("");
                    }}
                    required
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6 sm:mt-8 sm:pt-8">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                  Connexion
                </p>

                <h2 className="mt-2 text-lg font-semibold text-[#102B20]">
                  Identifiants du compte
                </h2>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
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
                    value={email}
                    onChange={(event) => {
                      setEmail(
                        event.target.value,
                      );

                      setErrorMessage("");
                    }}
                    autoComplete="email"
                    required
                    className={inputClassName}
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
                    value={password}
                    onChange={(event) => {
                      setPassword(
                        event.target.value,
                      );

                      setErrorMessage("");
                    }}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className={inputClassName}
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Minimum 8 caractères.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6 sm:mt-8 sm:pt-8">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                  Autorisations
                </p>

                <h2 className="mt-2 text-lg font-semibold text-[#102B20]">
                  Rôle de l’utilisateur
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Sélectionnez le niveau d’accès à
                  l’espace de gestion.
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setRole("agent")
                  }
                  className={`relative min-w-0 rounded-xl border p-4 text-left transition sm:rounded-2xl sm:p-5 ${
                    role === "agent"
                      ? "border-[#0B5D3B] bg-[#F3F8F2] ring-4 ring-[#0B5D3B]/5"
                      : "border-slate-200 bg-white hover:border-[#CFE3CF] hover:bg-[#FAFCFA]"
                  }`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
                    <div>
                      <span className="block font-semibold text-[#102B20]">
                        Agent
                      </span>

                      <span className="mt-2 block text-[12px] leading-5 text-slate-500 sm:text-sm sm:leading-6">
                        Peut traiter les dossiers clients
                        et gérer les opérations qui lui
                        sont autorisées.
                      </span>
                    </div>

                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        role === "agent"
                          ? "border-[#0B5D3B] bg-[#0B5D3B]"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {role === "agent" && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setRole("admin")
                  }
                  className={`relative min-w-0 rounded-xl border p-4 text-left transition sm:rounded-2xl sm:p-5 ${
                    role === "admin"
                      ? "border-[#0B5D3B] bg-[#F3F8F2] ring-4 ring-[#0B5D3B]/5"
                      : "border-slate-200 bg-white hover:border-[#CFE3CF] hover:bg-[#FAFCFA]"
                  }`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
                    <div>
                      <span className="block font-semibold text-[#102B20]">
                        Administrateur
                      </span>

                      <span className="mt-2 block text-[12px] leading-5 text-slate-500 sm:text-sm sm:leading-6">
                        Dispose de l’accès complet, y
                        compris la gestion des agents.
                      </span>
                    </div>

                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        role === "admin"
                          ? "border-[#0B5D3B] bg-[#0B5D3B]"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {role === "admin" && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mt-6 rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-4 py-3 text-sm font-semibold text-[#0B5D3B]">
                {successMessage}
              </div>
            )}

            <div className="mt-6 flex min-w-0 flex-col-reverse gap-2.5 border-t border-slate-100 pt-5 sm:mt-8 sm:flex-row sm:justify-end sm:gap-3 sm:pt-6">
              <Link
                href="/admin/agents"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 sm:min-h-12 sm:w-auto sm:px-6 sm:text-sm"
              >
                Annuler
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#B8E83D] px-4 text-[13px] font-black text-[#15311F] transition hover:bg-[#C7F34E] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:min-h-12 sm:w-auto sm:px-6 sm:text-sm"
              >
                {loading
                  ? "Création..."
                  : role === "admin"
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