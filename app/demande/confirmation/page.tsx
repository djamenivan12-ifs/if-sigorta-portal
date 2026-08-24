"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useSearchParams,
} from "next/navigation";

type Language =
  | "fr"
  | "en"
  | "tr";

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

  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "fr",
    );

  useEffect(() => {
    const savedLanguage =
      window.localStorage.getItem(
        "if-sigorta-language",
      );

    if (
      savedLanguage === "fr" ||
      savedLanguage === "en" ||
      savedLanguage === "tr"
    ) {
      setLanguage(
        savedLanguage,
      );
    }

    function handleLanguageChange(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          language:
            Language;
        }>;

      const nextLanguage =
        customEvent.detail?.language;

      if (
        nextLanguage === "fr" ||
        nextLanguage === "en" ||
        nextLanguage === "tr"
      ) {
        setLanguage(
          nextLanguage,
        );
      }
    }

    window.addEventListener(
      "if-sigorta-language-change",
      handleLanguageChange,
    );

    return () => {
      window.removeEventListener(
        "if-sigorta-language-change",
        handleLanguageChange,
      );
    };
  }, []);

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
    <main className="min-h-screen bg-[#F6F8F5]">
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center"
            aria-label="IF Sigorta"
          >
            <img
              src="/if-sigorta-logo-light.png"
              alt="IF Sigorta"
              className="h-[72px] w-auto object-contain object-left sm:h-[82px]"
            />
          </Link>

          <Link
            href="/suivi"
            className="text-sm font-semibold text-slate-500 transition hover:text-[#0B5D3B]"
          >
            {t.trackRequest}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.24)]">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <section className="relative overflow-hidden bg-[#123F2C] px-6 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#B8E83D]/10" />
              <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-white/5" />

              <div className="relative z-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#B8E83D] text-2xl font-black text-[#15311F]">
                  ✓
                </div>

                <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  {t.title}
                </h1>

                <p className="mt-4 max-w-md text-sm leading-7 text-white/70 sm:text-base">
                  {t.description}
                </p>

                <div className="mt-8 rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#B8E83D]">
                    {t.status}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {t.statusText}
                  </p>
                </div>
              </div>
            </section>

            <section className="p-6 sm:p-8 lg:p-10">
              <div className="rounded-[1.5rem] border border-[#DCE9DD] bg-[#F3F8F2] p-5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                  {t.requestCode}
                </p>

                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-all rounded-xl bg-white px-4 py-3 font-mono text-xl font-black tracking-wide text-[#0B5D3B] sm:text-2xl">
                    {requestCode}
                  </p>

                  <button
                    type="button"
                    onClick={
                      copyCode
                    }
                    className="shrink-0 rounded-xl border border-[#CFE3CF] bg-white px-4 py-2.5 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#EAF3E9]"
                  >
                    {t.copyCode}
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-6 text-amber-800">
                {t.warning}
              </div>

              <div className="mt-8">
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
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

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[#0B5D3B] px-6 text-sm font-black text-white shadow-lg shadow-[#0B5D3B]/10 transition hover:-translate-y-0.5 hover:bg-[#084A2F]"
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
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF6EC] text-sm font-black text-[#0B5D3B]">
        {number}
      </div>

      <p className="text-sm leading-6 text-slate-600">
        {text}
      </p>
    </div>
  );
}

function ConfirmationFallback() {
  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "fr",
    );

  useEffect(() => {
    const savedLanguage =
      window.localStorage.getItem(
        "if-sigorta-language",
      );

    if (
      savedLanguage === "fr" ||
      savedLanguage === "en" ||
      savedLanguage === "tr"
    ) {
      setLanguage(
        savedLanguage,
      );
    }
  }, []);

  const t =
    translations[
      language
    ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8F5] px-5">
      <div className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#DCE9DD] border-t-[#0B5D3B]" />

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