"use client";
import Link from "next/link";
export default function PageError({ reset,dashboardHref="/admin/dashboard" }: { reset: () => void;dashboardHref?:string }) {
  return (
    <section
      role="alert"
      className="m-4 rounded-xl border border-red-200 bg-white p-6 sm:m-8"
    >
      <h1 className="text-xl font-bold text-slate-900">
        Cette page n’a pas pu être chargée
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Les données sont temporairement indisponibles. Réessayez pour reprendre
        votre travail.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-emerald-900 px-4 py-3 text-sm font-semibold text-white"
        >
          Réessayer
        </button>
        <Link
          href={dashboardHref}
          className="rounded-lg border border-slate-200 px-4 py-3 text-sm"
        >
          Tableau de bord
        </Link>
      </div>
    </section>
  );
}
