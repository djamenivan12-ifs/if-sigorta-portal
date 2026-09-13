"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="m-6 rounded-2xl border border-slate-200 bg-white p-8">
      <h1 className="text-2xl font-bold text-slate-950">
        Tableau de bord temporairement indisponible
      </h1>
      <p className="my-4 text-slate-600">
        Les dossiers n’ont pas pu être chargés. Les indicateurs ne sont pas
        remplacés par des zéros.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-emerald-900 px-4 py-3 text-white"
      >
        Réessayer
      </button>
    </main>
  );
}
