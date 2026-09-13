export default function PageLoading() {
  return (
    <section role="status" aria-live="polite" className="p-5 sm:p-8">
      <p className="text-sm font-semibold text-slate-600">
        Chargement de la page…
      </p>
      <div
        aria-hidden="true"
        className="mt-5 space-y-4 motion-safe:animate-pulse"
      >
        <div className="h-28 rounded-xl bg-slate-200/60" />
        <div className="h-16 rounded-xl bg-slate-200/60" />
        <div className="h-72 rounded-xl bg-slate-200/60" />
      </div>
    </section>
  );
}
