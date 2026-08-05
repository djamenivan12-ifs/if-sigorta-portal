"use client";

type RequestCodeCardProps = {
  requestCode: string;
};

export default function RequestCodeCard({
  requestCode,
}: RequestCodeCardProps) {
  async function copyRequestCode() {
    try {
      await navigator.clipboard.writeText(requestCode);
      alert("Code du dossier copié.");
    } catch {
      alert("Impossible de copier automatiquement le code.");
    }
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
        Code du dossier
      </p>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="break-all text-2xl font-bold text-slate-900">
          {requestCode || "Génération du code..."}
        </p>

        {requestCode && (
          <button
            type="button"
            onClick={copyRequestCode}
            className="shrink-0 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Copier le code
          </button>
        )}
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        Conservez ce code. Il servira de référence pour le virement et
        permettra de suivre votre demande avec votre numéro WhatsApp.
      </p>
    </section>
  );
}