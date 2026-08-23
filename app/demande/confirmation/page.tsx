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
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl font-black text-green-700">
            ✓
          </div>

          <h1 className="mt-6 text-3xl font-bold text-slate-900">
            {
              t.title
            }
          </h1>

          <p className="mt-3 leading-7 text-slate-600">
            {
              t.description
            }
          </p>

          <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              {
                t.requestCode
              }
            </p>

            <p className="mt-3 break-all text-2xl font-bold text-slate-900">
              {
                requestCode
              }
            </p>

            <button
              type="button"
              onClick={
                copyCode
              }
              className="mt-5 rounded-xl border border-blue-200 bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-100"
            >
              {
                t.copyCode
              }
            </button>
          </section>

          <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            {
              t.warning
            }
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              {
                t.backHome
              }
            </Link>

            <Link
              href={`/suivi?code=${encodeURIComponent(
                requestCode,
              )}`}
              className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
            >
              {
                t.trackRequest
              }
            </Link>
          </div>
        </div>
      </div>
    </main>
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
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />

          <p className="mt-4 text-slate-600">
            {
              t.loading
            }
          </p>
        </div>
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