"use client";

import {
  useEffect,
  useState,
} from "react";

type Language =
  | "fr"
  | "en"
  | "tr";

type RequestCodeCardProps = {
  requestCode: string;
};

const translations = {
  fr: {
    title:
      "Code du dossier",

    generating:
      "Génération du code...",

    copy:
      "Copier le code",

    copied:
      "Code du dossier copié.",

    copyFailed:
      "Impossible de copier automatiquement le code. Vous pouvez le copier manuellement.",

    description:
      "Conservez ce code. Il servira de référence pour le virement et permettra ensuite de suivre votre demande.",
  },

  en: {
    title:
      "Request code",

    generating:
      "Generating code...",

    copy:
      "Copy code",

    copied:
      "Request code copied.",

    copyFailed:
      "Unable to copy the code automatically. You can copy it manually.",

    description:
      "Keep this code. It will be used as the bank transfer reference and will allow you to track your request later.",
  },

  tr: {
    title:
      "Başvuru kodu",

    generating:
      "Kod oluşturuluyor...",

    copy:
      "Kodu kopyala",

    copied:
      "Başvuru kodu kopyalandı.",

    copyFailed:
      "Kod otomatik olarak kopyalanamadı. Kodu manuel olarak kopyalayabilirsiniz.",

    description:
      "Bu kodu saklayın. Banka havalesinde referans olarak kullanılacak ve daha sonra başvurunuzu takip etmenizi sağlayacaktır.",
  },
};

export default function RequestCodeCard({
  requestCode,
}: RequestCodeCardProps) {
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
          language: Language;
        }>;

      const nextLanguage =
        customEvent.detail
          ?.language;

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

  async function copyRequestCode() {
    if (!requestCode) {
      return;
    }

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
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700">
        {t.title}
      </h2>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="break-all text-2xl font-bold text-slate-900">
          {requestCode ||
            t.generating}
        </p>

        <button
          type="button"
          disabled={!requestCode}
          onClick={
            copyRequestCode
          }
          className="shrink-0 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t.copy}
        </button>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {t.description}
      </p>
    </section>
  );
}