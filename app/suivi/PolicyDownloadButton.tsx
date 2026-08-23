"use client";

import {
  useEffect,
  useState,
} from "react";

type Language =
  | "fr"
  | "en"
  | "tr";

type PolicyYear =
  | 1
  | 2;

type PolicyDownloadButtonProps = {
  requestCode: string;
  whatsappCountryCode: string;
  whatsappNumber: string;
  durationYears: 1 | 2;
};

type DownloadResponse = {
  success?: boolean;
  downloadUrl?: string;
  fileName?: string;
  policyYear?: PolicyYear;
  error?: string;
};

const translations = {
  fr: {
    routeError:
      "La route de téléchargement a renvoyé une erreur",

    downloadError:
      "Impossible de télécharger la police année",

    unavailable:
      "La police de l’année n’est pas disponible.",

    unexpected:
      "Une erreur inattendue est survenue pendant le téléchargement.",

    preparingYear1:
      "Préparation du PDF année 1...",

    preparingYear2:
      "Préparation du PDF année 2...",

    downloadInsurance:
      "Télécharger mon assurance",

    downloadYear1:
      "Télécharger la police — Année 1",

    downloadYear2:
      "Télécharger la police — Année 2",

    secureInfo:
      "Chaque bouton télécharge un fichier PDF sécurisé. Le lien de téléchargement est temporaire.",

    fileName:
      "assurance-annee",
  },

  en: {
    routeError:
      "The download route returned an error",

    downloadError:
      "Unable to download policy year",

    unavailable:
      "The policy for this year is not available.",

    unexpected:
      "An unexpected error occurred during the download.",

    preparingYear1:
      "Preparing year 1 PDF...",

    preparingYear2:
      "Preparing year 2 PDF...",

    downloadInsurance:
      "Download my insurance",

    downloadYear1:
      "Download policy — Year 1",

    downloadYear2:
      "Download policy — Year 2",

    secureInfo:
      "Each button downloads a secure PDF file. The download link is temporary.",

    fileName:
      "insurance-year",
  },

  tr: {
    routeError:
      "İndirme adresi bir hata döndürdü",

    downloadError:
      "Poliçe indirilemedi. Yıl",

    unavailable:
      "Bu yıla ait poliçe mevcut değil.",

    unexpected:
      "İndirme sırasında beklenmeyen bir hata oluştu.",

    preparingYear1:
      "1. yıl PDF’i hazırlanıyor...",

    preparingYear2:
      "2. yıl PDF’i hazırlanıyor...",

    downloadInsurance:
      "Sigortamı indir",

    downloadYear1:
      "Poliçeyi indir — 1. Yıl",

    downloadYear2:
      "Poliçeyi indir — 2. Yıl",

    secureInfo:
      "Her buton güvenli bir PDF dosyası indirir. İndirme bağlantısı geçicidir.",

    fileName:
      "sigorta-yil",
  },
};

function getSavedLanguage(): Language {
  if (
    typeof window ===
    "undefined"
  ) {
    return "fr";
  }

  const saved =
    window.localStorage.getItem(
      "if-sigorta-language",
    );

  if (
    saved === "fr" ||
    saved === "en" ||
    saved === "tr"
  ) {
    return saved;
  }

  return "fr";
}

export default function PolicyDownloadButton({
  requestCode,
  whatsappCountryCode,
  whatsappNumber,
  durationYears,
}: PolicyDownloadButtonProps) {
  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "fr",
    );

  const [
    loadingYear,
    setLoadingYear,
  ] =
    useState<PolicyYear | null>(
      null,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  useEffect(() => {
    function refreshLanguage() {
      setLanguage(
        getSavedLanguage(),
      );
    }

    refreshLanguage();

    function handleLanguageChange(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          language?: Language;
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

        return;
      }

      refreshLanguage();
    }

    window.addEventListener(
      "if-sigorta-language-change",
      handleLanguageChange,
    );

    window.addEventListener(
      "storage",
      refreshLanguage,
    );

    window.addEventListener(
      "focus",
      refreshLanguage,
    );

    return () => {
      window.removeEventListener(
        "if-sigorta-language-change",
        handleLanguageChange,
      );

      window.removeEventListener(
        "storage",
        refreshLanguage,
      );

      window.removeEventListener(
        "focus",
        refreshLanguage,
      );
    };
  }, []);

  const t =
    translations[
      language
    ];

  async function downloadPolicy(
    policyYear:
      PolicyYear,
  ) {
    if (
      loadingYear !==
      null
    ) {
      return;
    }

    setLoadingYear(
      policyYear,
    );

    setErrorMessage(
      "",
    );

    try {
      const response =
        await fetch(
          "/api/tracking/policy",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                requestCode,
                whatsappCountryCode,
                whatsappNumber,
                policyYear,
              }),
          },
        );

      const contentType =
        response.headers.get(
          "content-type",
        ) ?? "";

      if (
        !contentType.includes(
          "application/json",
        )
      ) {
        const responseText =
          await response.text();

        console.error(
          "Réponse non JSON reçue :",
          {
            status:
              response.status,

            response:
              responseText,
          },
        );

        throw new Error(
          `${t.routeError} (${response.status}).`,
        );
      }

      const result =
        (await response.json()) as DownloadResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            `${t.downloadError} ${policyYear}.`,
        );
      }

      if (
        !result.success ||
        !result.downloadUrl
      ) {
        throw new Error(
          result.error ??
            t.unavailable,
        );
      }

      const fileName =
        result.fileName ??
        `${requestCode}-${t.fileName}-${policyYear}.pdf`;

      const downloadLink =
        document.createElement(
          "a",
        );

      downloadLink.href =
        result.downloadUrl;

      downloadLink.download =
        fileName;

      downloadLink.target =
        "_blank";

      downloadLink.rel =
        "noopener noreferrer";

      document.body.appendChild(
        downloadLink,
      );

      downloadLink.click();

      document.body.removeChild(
        downloadLink,
      );
    } catch (
      error
    ) {
      console.error(
        "Erreur de téléchargement de la police :",
        error,
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : t.unexpected,
      );
    } finally {
      setLoadingYear(
        null,
      );
    }
  }

  const isDownloading =
    loadingYear !==
    null;

  return (
    <div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            void downloadPolicy(
              1,
            );
          }}
          disabled={
            isDownloading
          }
          className="w-full rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loadingYear ===
          1
            ? t.preparingYear1
            : durationYears ===
                1
              ? t.downloadInsurance
              : t.downloadYear1}
        </button>

        {durationYears ===
          2 && (
          <button
            type="button"
            onClick={() => {
              void downloadPolicy(
                2,
              );
            }}
            disabled={
              isDownloading
            }
            className="w-full rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loadingYear ===
            2
              ? t.preparingYear2
              : t.downloadYear2}
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {
            errorMessage
          }
        </div>
      )}

      <p className="mt-3 text-xs leading-5 text-green-700">
        {
          t.secureInfo
        }
      </p>
    </div>
  );
}