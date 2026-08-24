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

  if (loading) {
    return (
      <section className="rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC] p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">03</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{t.title}</h2>
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
          {t.loading}
        </div>
      </section>
    );
  }

  if (!bankInformation) {
    return (
      <section className="rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC] p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">03</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{t.title}</h2>
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {errorMessage || t.unavailable}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC] p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">03</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-900">{t.title}</h2>

      <dl className="mt-6 divide-y divide-slate-100">
        <div className="py-4 first:pt-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{t.beneficiary}</dt>
          <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="break-words text-sm font-semibold text-slate-900">
              {bankInformation.beneficiary}
            </span>
            <button
              type="button"
              onClick={() => copyText(bankInformation.beneficiary, t.beneficiaryCopied)}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {t.copyBeneficiary}
            </button>
          </dd>
        </div>

        <div className="py-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{t.bank}</dt>
          <dd className="mt-2 text-sm font-semibold text-slate-900">{bankInformation.bankName}</dd>
        </div>

        <div className="py-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{t.iban}</dt>
          <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="break-all font-mono text-sm font-semibold text-slate-900">
              {bankInformation.iban}
            </span>
            <button
              type="button"
              onClick={() =>
                copyText(bankInformation.iban.replace(/\s/g, ""), t.ibanCopied)
              }
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {t.copyIban}
            </button>
          </dd>
        </div>

        <div className="pt-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{t.transferReference}</dt>
          <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="break-all rounded-xl bg-[#EEF6EC] px-3 py-2 font-mono text-sm font-black text-[#0B5D3B]">
              {requestCode}
            </span>
            <button
              type="button"
              disabled={!requestCode}
              onClick={() => copyText(requestCode, t.referenceCopied)}
              className="shrink-0 rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-4 py-2 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#EAF3E9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.copyReference}
            </button>
          </dd>
        </div>
      </dl>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-6 text-amber-800">
        {t.warning}
      </div>
    </section>
  );
}