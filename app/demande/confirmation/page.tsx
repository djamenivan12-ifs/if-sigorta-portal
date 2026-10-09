"use client";
import BrandLogo from "@/components/brand/BrandLogo";

import { useLanguage } from "@/lib/useLanguage";

import {Suspense} from "react";

import Link from "next/link";

import {
  useSearchParams,
} from "next/navigation";



const translations = {
  fr: {
    unavailableCode:
      "Code indisponible",

    copied:
      "Code du dossier copié.",

    copyFailed:
      "La copie automatique a échoué.",

    title:
      "Demande envoyée",

    description:
      "Votre dossier et votre dekont ont été enregistrés. Le paiement est maintenant en attente de vérification par IF Sigorta.",

    requestCode:
      "Code de votre dossier",

    copyCode:
      "Copier le code",

    warning:
      "Conservez ce code. Il sera nécessaire pour suivre votre dossier et télécharger votre assurance lorsqu’elle sera prête.",

    backHome:
      "Retour à l’accueil",

    trackRequest:
      "Suivre ma demande",

    loading:
      "Chargement de la confirmation...",

    status:
      "Paiement en attente de vérification",

    statusText:
      "Un agent IF Sigorta vérifiera votre paiement avant de poursuivre le traitement de votre dossier.",

    nextTitle:
      "Que se passe-t-il maintenant ?",

    next1:
      "Votre paiement est vérifié.",

    next2:
      "Votre assurance est préparée.",

    next3:
      "Vous êtes informé dès qu’elle est disponible.",
  },

  en: {
    unavailableCode:
      "Code unavailable",

    copied:
      "Request code copied.",

    copyFailed:
      "Automatic copying failed.",

    title:
      "Request submitted",

    description:
      "Your request and payment receipt have been saved. The payment is now awaiting verification by IF Sigorta.",

    requestCode:
      "Your request code",

    copyCode:
      "Copy code",

    warning:
      "Keep this code. You will need it to track your request and download your insurance once it is ready.",

    backHome:
      "Back to home",

    trackRequest:
      "Track my request",

    loading:
      "Loading confirmation...",

    status:
      "Payment awaiting verification",

    statusText:
      "An IF Sigorta agent will verify your payment before continuing the processing of your request.",

    nextTitle:
      "What happens next?",

    next1:
      "Your payment is reviewed.",

    next2:
      "Your insurance is prepared.",

    next3:
      "You are notified as soon as it is available.",
  },

  tr: {
    unavailableCode:
      "Kod mevcut değil",

    copied:
      "Başvuru kodu kopyalandı.",

    copyFailed:
      "Otomatik kopyalama başarısız oldu.",

    title:
      "Başvuru gönderildi",

    description:
      "Başvurunuz ve dekontunuz kaydedildi. Ödemeniz artık IF Sigorta tarafından kontrol edilmeyi bekliyor.",

    requestCode:
      "Başvuru kodunuz",

    copyCode:
      "Kodu kopyala",

    warning:
      "Bu kodu saklayın. Başvurunuzu takip etmek ve sigortanız hazır olduğunda indirmek için bu koda ihtiyacınız olacaktır.",

    backHome:
      "Ana sayfaya dön",

    trackRequest:
      "Başvurumu takip et",

    loading:
      "Onay sayfası yükleniyor...",

    status:
      "Ödeme kontrol bekliyor",

    statusText:
      "IF Sigorta temsilcisi başvurunuz işleme devam etmeden önce ödemenizi kontrol edecektir.",

    nextTitle:
      "Şimdi ne olacak?",

    next1:
      "Ödemeniz kontrol edilir.",

    next2:
      "Sigortanız hazırlanır.",

    next3:
      "Hazır olduğunda size bilgi verilir.",
  },
};

function ConfirmationContent() {
  const searchParams =
    useSearchParams();

  const [language] =
    useLanguage();



  const t =
    translations[
      language
    ];

  const requestCode =
    searchParams.get(
      "code",
    ) ||
    t.unavailableCode;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(
        requestCode,
      );

      alert(
        t.copied,
      );
    } catch {
      alert(
        t.copyFailed,
      );
    }
  }

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-brand-ice">
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Link
            href="/"
            className="flex items-center"
            aria-label="IF Sigorta"
          >
            <BrandLogo />
          </Link>

          <Link
            href="/suivi"
            className="shrink-0 text-right text-xs font-semibold text-slate-500 transition hover:text-brand-navy sm:text-sm"
          >
            {t.trackRequest}
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-16">
        <div className="min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.24)] sm:rounded-[2rem]">
          <div className="grid min-w-0 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="relative min-w-0 overflow-hidden bg-brand-navy px-5 py-8 text-white sm:px-8 sm:py-10 lg:px-12 lg:py-14">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-lime/10" />
              <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-white/5" />

              <div className="relative z-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-lime text-2xl font-black text-brand-navy">
                  ✓
                </div>

                <h1 className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-[-0.04em] sm:mt-6 sm:text-4xl">
                  {t.title}
                </h1>

                <p className="mt-4 max-w-md text-sm leading-7 text-white/70 sm:text-base">
                  {t.description}
                </p>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm sm:mt-8 sm:p-5">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-lime">
                    {t.status}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {t.statusText}
                  </p>
                </div>
              </div>
            </section>

            <section className="min-w-0 p-4 sm:p-8 lg:p-10">
              <div className="min-w-0 rounded-[1.25rem] border border-brand-border bg-brand-ice p-4 sm:rounded-[1.5rem] sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-navy">
                  {t.requestCode}
                </p>

                <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="min-w-0 break-all rounded-xl bg-white px-3 py-3 font-mono text-lg font-black tracking-wide text-brand-navy sm:px-4 sm:text-2xl">
                    {requestCode}
                  </p>

                  <button
                    type="button"
                    onClick={
                      copyCode
                    }
                    className="min-h-11 w-full shrink-0 rounded-xl border border-brand-border bg-white px-4 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-ice sm:w-auto"
                  >
                    {t.copyCode}
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-6 text-amber-800">
                {t.warning}
              </div>

              <div className="mt-8">
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-brand-navy">
                  {t.nextTitle}
                </h2>

                <div className="mt-5 space-y-4">
                  <StepItem
                    number="1"
                    text={t.next1}
                  />

                  <StepItem
                    number="2"
                    text={t.next2}
                  />

                  <StepItem
                    number="3"
                    text={t.next3}
                  />
                </div>
              </div>

              <div className="mt-7 flex min-w-0 flex-col gap-3 sm:mt-8 sm:flex-row">
                <Link
                  href="/"
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {t.backHome}
                </Link>

                <Link
                  href={`/suivi?code=${encodeURIComponent(
                    requestCode,
                  )}`}
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-brand-lime px-6 text-sm font-black text-brand-navy shadow-lg shadow-brand-navy/10 transition hover:-translate-y-0.5 hover:bg-brand-lime/85"
                >
                  {t.trackRequest}
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function StepItem({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-ice text-sm font-black text-brand-navy">
        {number}
      </div>

      <p className="min-w-0 text-sm leading-6 text-slate-600">
        {text}
      </p>
    </div>
  );
}

function ConfirmationFallback() {
  const [language] =
    useLanguage();



  const t =
    translations[
      language
    ];

  return (
    <main className="flex min-h-screen min-w-0 items-center justify-center overflow-x-hidden bg-brand-ice px-4 sm:px-5">
      <div className="w-full min-w-0 max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-brand-border border-t-brand-navy" />

        <p className="mt-4 text-sm text-slate-500">
          {t.loading}
        </p>
      </div>
    </main>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <ConfirmationFallback />
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}