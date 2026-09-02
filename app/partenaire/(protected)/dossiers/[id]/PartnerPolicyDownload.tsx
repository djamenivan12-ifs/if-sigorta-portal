"use client";

import { useState } from "react";

type PolicyYear = 1 | 2;

type PartnerPolicyDownloadProps = {
  requestId: string;
  duration: 1 | 2;
};

type DownloadResponse = {
  success?: boolean;
  error?: string;
  downloadUrl?: string;
  fileName?: string;
  policyYear?: PolicyYear;
};

export default function PartnerPolicyDownload({
  requestId,
  duration,
}: PartnerPolicyDownloadProps) {
  const [downloadingYear, setDownloadingYear] =
    useState<PolicyYear | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(policyYear: PolicyYear) {
    if (downloadingYear !== null) return;

    setError(null);
    setDownloadingYear(policyYear);

    try {
      const response = await fetch(
        `/api/partner/requests/${requestId}/policy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ policyYear }),
        },
      );

      const data = (await response.json()) as DownloadResponse;

      if (!response.ok || !data.success || !data.downloadUrl) {
        throw new Error(
          data.error ??
            "Le téléchargement de l’assurance est impossible.",
        );
      }

      window.location.assign(data.downloadUrl);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Une erreur est survenue pendant le téléchargement.",
      );
    } finally {
      setDownloadingYear(null);
    }
  }

  const isDownloading = downloadingYear !== null;

  return (
    <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
            Assurance
          </p>
          <h2 className="mt-2 text-xl font-black tracking-[-0.02em] text-emerald-950">
            Assurance disponible
          </h2>
          <p className="mt-3 text-sm leading-6 text-emerald-800">
            L&apos;assurance de votre client est prête.
            Téléchargez le document puis transmettez-le directement à
            votre client.
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
      </div>

      {duration === 1 ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-[#102B20]">
                Police d&apos;assurance
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Assurance valable pour une durée d&apos;un an.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleDownload(1)}
              disabled={isDownloading}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#0B5D3B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloadingYear === 1
                ? "Préparation..."
                : "Télécharger l'assurance"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <PolicyCard
            year={1}
            title="Assurance — Année 1"
            description="Première police de l'assurance."
            downloadingYear={downloadingYear}
            disabled={isDownloading}
            onDownload={handleDownload}
          />
          <PolicyCard
            year={2}
            title="Assurance — Année 2"
            description="Deuxième police de l'assurance."
            downloadingYear={downloadingYear}
            disabled={isDownloading}
            onDownload={handleDownload}
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p className="font-semibold text-red-800">
            Téléchargement impossible
          </p>
          <p className="mt-1 text-sm leading-6 text-red-700">
            {error}
          </p>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-emerald-200 bg-white/70 px-4 py-3">
        <p className="text-xs leading-5 text-emerald-800">
          Le lien de téléchargement est généré de manière sécurisée et
          temporaire. Seul votre compte partenaire peut accéder aux
          assurances de vos propres dossiers.
        </p>
      </div>
    </section>
  );
}

type PolicyCardProps = {
  year: PolicyYear;
  title: string;
  description: string;
  downloadingYear: PolicyYear | null;
  disabled: boolean;
  onDownload: (year: PolicyYear) => Promise<void>;
};

function PolicyCard({
  year,
  title,
  description,
  downloadingYear,
  disabled,
  onDownload,
}: PolicyCardProps) {
  const isCurrentDownload = downloadingYear === year;

  return (
    <article className="rounded-2xl border border-emerald-200 bg-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F8F2] text-sm font-black text-[#0B5D3B]">
        {year}
      </div>
      <h3 className="mt-4 font-black text-[#102B20]">{title}</h3>
      <p className="mt-1 min-h-12 text-sm leading-6 text-slate-500">
        {description}
      </p>
      <button
        type="button"
        onClick={() => void onDownload(year)}
        disabled={disabled}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0B5D3B] px-4 py-3 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCurrentDownload
          ? "Préparation..."
          : `Télécharger année ${year}`}
      </button>
    </article>
  );
}
