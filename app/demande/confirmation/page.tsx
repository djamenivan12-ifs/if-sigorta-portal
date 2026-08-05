"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ConfirmationContent() {
  const searchParams = useSearchParams();

  const requestCode =
    searchParams.get("code") || "Code indisponible";

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(
        requestCode,
      );

      alert("Code du dossier copié.");
    } catch {
      alert(
        "La copie automatique a échoué.",
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
          ✓
        </div>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          Demande envoyée
        </h1>

        <p className="mt-3 leading-7 text-slate-600">
          Votre dossier et votre dekont ont été
          enregistrés. Le paiement est maintenant
          en attente de vérification par IF Sigorta.
        </p>

        <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Code de votre dossier
          </p>

          <p className="mt-3 break-all text-2xl font-bold text-slate-900">
            {requestCode}
          </p>

          <button
            type="button"
            onClick={copyCode}
            className="mt-5 rounded-xl border border-blue-200 bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-100"
          >
            Copier le code
          </button>
        </section>

        <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          Conservez ce code. Il sera nécessaire
          pour suivre votre dossier et télécharger
          votre assurance lorsqu’elle sera prête.
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Retour à l’accueil
          </Link>

          <Link
            href="/suivi"
            className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Suivre ma demande
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-slate-600">
            Chargement de la confirmation...
          </p>
        </main>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}