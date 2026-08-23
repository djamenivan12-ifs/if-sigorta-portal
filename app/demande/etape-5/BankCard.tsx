"use client";

import {
  useEffect,
  useState,
} from "react";

type Language =
  | "fr"
  | "en"
  | "tr";

type BankInformation = {
  beneficiary: string;
  bankName: string;
  iban: string;
};

type BankCardProps = {
  requestCode: string;
};

const translations = {
  fr: {
    title:
      "Coordonnées bancaires",

    beneficiary:
      "Bénéficiaire",

    bank:
      "Banque",

    iban:
      "IBAN",

    transferReference:
      "Référence obligatoire du virement",

    copyBeneficiary:
      "Copier le bénéficiaire",

    copyIban:
      "Copier l’IBAN",

    copyReference:
      "Copier la référence",

    beneficiaryCopied:
      "Nom du bénéficiaire copié.",

    ibanCopied:
      "IBAN copié.",

    referenceCopied:
      "Référence du virement copiée.",

    copyFailed:
      "La copie automatique a échoué. Vous pouvez copier le texte manuellement.",

    warning:
      "Indiquez exactement le code du dossier dans la description ou la référence du virement.",

    loading:
      "Chargement des coordonnées bancaires...",

    unavailable:
      "Les coordonnées bancaires ne sont pas disponibles pour le moment.",
  },

  en: {
    title:
      "Bank details",

    beneficiary:
      "Beneficiary",

    bank:
      "Bank",

    iban:
      "IBAN",

    transferReference:
      "Required transfer reference",

    copyBeneficiary:
      "Copy beneficiary",

    copyIban:
      "Copy IBAN",

    copyReference:
      "Copy reference",

    beneficiaryCopied:
      "Beneficiary name copied.",

    ibanCopied:
      "IBAN copied.",

    referenceCopied:
      "Transfer reference copied.",

    copyFailed:
      "Automatic copying failed. You can copy the text manually.",

    warning:
      "Enter the exact request code in the description or reference of the bank transfer.",

    loading:
      "Loading bank details...",

    unavailable:
      "Bank details are currently unavailable.",
  },

  tr: {
    title:
      "Banka bilgileri",

    beneficiary:
      "Alıcı",

    bank:
      "Banka",

    iban:
      "IBAN",

    transferReference:
      "Zorunlu havale açıklaması",

    copyBeneficiary:
      "Alıcıyı kopyala",

    copyIban:
      "IBAN’ı kopyala",

    copyReference:
      "Açıklamayı kopyala",

    beneficiaryCopied:
      "Alıcı adı kopyalandı.",

    ibanCopied:
      "IBAN kopyalandı.",

    referenceCopied:
      "Havale açıklaması kopyalandı.",

    copyFailed:
      "Otomatik kopyalama başarısız oldu. Metni manuel olarak kopyalayabilirsiniz.",

    warning:
      "Başvuru kodunu banka havalesinin açıklama veya referans alanına aynen yazın.",

    loading:
      "Banka bilgileri yükleniyor...",

    unavailable:
      "Banka bilgileri şu anda kullanılamıyor.",
  },
};

export default function BankCard({
  requestCode,
}: BankCardProps) {
  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "fr",
    );

  const [
    bankInformation,
    setBankInformation,
  ] =
    useState<BankInformation | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  /*
   * ============================
   * LANGUE
   * ============================
   */

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

  /*
   * ============================
   * COORDONNÉES BANCAIRES
   * ============================
   */

  useEffect(() => {
    let cancelled =
      false;

    async function loadBankInformation() {
      setLoading(true);
      setErrorMessage("");

      try {
        const response =
          await fetch(
            "/api/bank-settings",
            {
              method:
                "GET",

              cache:
                "no-store",
            },
          );

        const result =
          (await response.json()) as {
            beneficiary?: string;
            bankName?: string;
            iban?: string;
            error?: string;
          };

        if (
          !response.ok
        ) {
          throw new Error(
            result.error ||
              "Impossible de récupérer les coordonnées bancaires.",
          );
        }

        if (
          !result.beneficiary ||
          !result.bankName ||
          !result.iban
        ) {
          throw new Error(
            "Les coordonnées bancaires sont incomplètes.",
          );
        }

        if (
          cancelled
        ) {
          return;
        }

        setBankInformation({
          beneficiary:
            result.beneficiary,

          bankName:
            result.bankName,

          iban:
            result.iban,
        });
      } catch (error) {
        if (
          cancelled
        ) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de récupérer les coordonnées bancaires.",
        );
      } finally {
        if (
          !cancelled
        ) {
          setLoading(false);
        }
      }
    }

    void loadBankInformation();

    return () => {
      cancelled =
        true;
    };
  }, []);

  const t =
    translations[
      language
    ];

  /*
   * ============================
   * COPIE
   * ============================
   */

  async function copyText(
    value: string,
    successMessage: string,
  ) {
    try {
      await navigator.clipboard.writeText(
        value,
      );

      alert(
        successMessage,
      );
    } catch {
      alert(
        t.copyFailed,
      );
    }
  }

  /*
   * ============================
   * CHARGEMENT
   * ============================
   */

  if (
    loading
  ) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">
          {
            t.title
          }
        </h2>

        <div className="mt-6 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
          {
            t.loading
          }
        </div>
      </section>
    );
  }

  /*
   * ============================
   * ERREUR
   * ============================
   */

  if (
    !bankInformation
  ) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">
          {
            t.title
          }
        </h2>

        <div className="mt-6 rounded-xl bg-red-50 px-4 py-4 text-sm text-red-700">
          {errorMessage ||
            t.unavailable}
        </div>
      </section>
    );
  }

  /*
   * ============================
   * AFFICHAGE
   * ============================
   */

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold text-slate-900">
        {
          t.title
        }
      </h2>

      <dl className="mt-6 space-y-5">
        {/* BÉNÉFICIAIRE */}

        <div>
          <dt className="text-sm text-slate-500">
            {
              t.beneficiary
            }
          </dt>

          <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="break-words font-semibold text-slate-900">
              {
                bankInformation.beneficiary
              }
            </span>

            <button
              type="button"
              onClick={() =>
                copyText(
                  bankInformation.beneficiary,
                  t.beneficiaryCopied,
                )
              }
              className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {
                t.copyBeneficiary
              }
            </button>
          </dd>
        </div>

        {/* BANQUE */}

        <div>
          <dt className="text-sm text-slate-500">
            {
              t.bank
            }
          </dt>

          <dd className="mt-1 font-semibold text-slate-900">
            {
              bankInformation.bankName
            }
          </dd>
        </div>

        {/* IBAN */}

        <div>
          <dt className="text-sm text-slate-500">
            {
              t.iban
            }
          </dt>

          <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="break-all font-mono font-semibold text-slate-900">
              {
                bankInformation.iban
              }
            </span>

            <button
              type="button"
              onClick={() =>
                copyText(
                  bankInformation.iban.replace(
                    /\s/g,
                    "",
                  ),
                  t.ibanCopied,
                )
              }
              className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {
                t.copyIban
              }
            </button>
          </dd>
        </div>

        {/* RÉFÉRENCE DU VIREMENT */}

        <div className="border-t border-slate-200 pt-5">
          <dt className="text-sm text-slate-500">
            {
              t.transferReference
            }
          </dt>

          <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="break-all font-semibold text-blue-700">
              {
                requestCode
              }
            </span>

            <button
              type="button"
              disabled={
                !requestCode
              }
              onClick={() =>
                copyText(
                  requestCode,
                  t.referenceCopied,
                )
              }
              className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {
                t.copyReference
              }
            </button>
          </dd>
        </div>
      </dl>

      {/* AVERTISSEMENT */}

      <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
        {
          t.warning
        }
      </div>
    </section>
  );
}