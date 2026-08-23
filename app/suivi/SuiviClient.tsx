"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import PolicyDownloadButton from "./PolicyDownloadButton";

type Language = "fr" | "en" | "tr";

type SuiviClientProps = {
  initialCode: string;
  initialCountry: string;
  initialPhone: string;
};

type TrackingResult = {
  success?: boolean;
  request: {
    requestCode: string;
    status: string;
    calculatedPrice: number;
    durationYears: number;
    createdAt: string;
    updatedAt: string;
  };
  client: {
    firstName: string;
    lastName: string;
  };
  payment: {
    status: string;
    submittedAt: string | null;
    verifiedAt: string | null;
    rejectionReason: string | null;
  } | null;
  policy: {
    available: boolean;
    policyNumber: string | null;
    issueDate: string | null;
    expirationDate: string | null;
    uploadedAt: string | null;
  };
};

type ErrorResult = { error?: string };

const countryCodes = [
  { flag: "🇹🇷", code: "+90" },
  { flag: "🇨🇲", code: "+237" },
  { flag: "🇳🇬", code: "+234" },
  { flag: "🇬🇭", code: "+233" },
  { flag: "🇸🇳", code: "+221" },
  { flag: "🇨🇮", code: "+225" },
  { flag: "🇹🇩", code: "+235" },
  { flag: "🇬🇦", code: "+241" },
  { flag: "🇨🇬", code: "+242" },
  { flag: "🇨🇩", code: "+243" },
];

const translations = {
  fr: {
    backHome: "← Retour à l’accueil",
    title: "Suivi de votre demande",
    intro: "Saisissez votre code de dossier et le numéro WhatsApp utilisé lors de votre demande.",
    requestCode: "Code du dossier",
    whatsapp: "Numéro WhatsApp",
    phoneCode: "Indicatif téléphonique",
    search: "Suivre mon dossier",
    searching: "Recherche...",
    loadingTitle: "Recherche de votre dossier...",
    loadingText: "Vérification de vos informations.",
    client: "Client",
    currentStatus: "État actuel",
    amount: "Montant",
    duration: "Durée",
    year: "an",
    years: "ans",
    payment: "Paiement",
    status: "Statut",
    submittedAt: "Déposé le",
    verifiedAt: "Vérifié le",
    rejectionReason: "Motif du refus",
    policyAvailable: "Assurance disponible",
    policyReady: "Votre police d’assurance est prête.",
    policyNumber: "Numéro de police",
    issueDate: "Date d’émission",
    expiration: "Expiration",
    policyUnavailable: "Assurance indisponible",
    policyUnavailableText: "Votre police d’assurance n’a pas encore été déposée par IF Sigorta.",
    history: "Historique",
    createdAt: "Créé le",
    updatedAt: "Dernière mise à jour",
    unavailable: "Non disponible",
    missingCode: "Saisissez votre code de dossier.",
    missingPhone: "Saisissez votre numéro WhatsApp.",
    genericError: "Une erreur inattendue est survenue.",
    trackingError: "Le dossier n’a pas pu être recherché.",
    incompleteResponse: "La réponse du serveur est incomplète.",
    genericStatus: "Statut actuel du dossier.",
    rejectedHelp: "Votre paiement a été refusé. Corrigez le problème indiqué puis envoyez un nouveau justificatif de paiement.",
    newReceipt: "Nouveau justificatif de paiement",
    chooseReceipt: "Choisir un fichier",
    acceptedFormats: "PDF, JPG, JPEG ou PNG — 10 Mo maximum.",
    sendReceipt: "Envoyer le nouveau justificatif",
    sendingReceipt: "Envoi en cours...",
    receiptSent: "Votre nouveau justificatif a été envoyé. Le paiement est de nouveau en vérification.",
    receiptRequired: "Sélectionnez un nouveau justificatif de paiement.",
    receiptTooLarge: "Le fichier ne doit pas dépasser 10 Mo.",
    receiptInvalidType: "Format non accepté. Utilisez PDF, JPG, JPEG ou PNG.",
  },
  en: {
    backHome: "← Back to home",
    title: "Track your request",
    intro: "Enter your request code and the WhatsApp number used when you applied.",
    requestCode: "Request code",
    whatsapp: "WhatsApp number",
    phoneCode: "Country calling code",
    search: "Track my request",
    searching: "Searching...",
    loadingTitle: "Searching for your request...",
    loadingText: "Checking your information.",
    client: "Client",
    currentStatus: "Current status",
    amount: "Amount",
    duration: "Duration",
    year: "year",
    years: "years",
    payment: "Payment",
    status: "Status",
    submittedAt: "Submitted on",
    verifiedAt: "Verified on",
    rejectionReason: "Rejection reason",
    policyAvailable: "Insurance available",
    policyReady: "Your insurance policy is ready.",
    policyNumber: "Policy number",
    issueDate: "Issue date",
    expiration: "Expiration",
    policyUnavailable: "Insurance unavailable",
    policyUnavailableText: "Your insurance policy has not yet been uploaded by IF Sigorta.",
    history: "History",
    createdAt: "Created on",
    updatedAt: "Last updated",
    unavailable: "Not available",
    missingCode: "Enter your request code.",
    missingPhone: "Enter your WhatsApp number.",
    genericError: "An unexpected error occurred.",
    trackingError: "The request could not be found.",
    incompleteResponse: "The server response is incomplete.",
    genericStatus: "Current request status.",
    rejectedHelp: "Your payment was rejected. Correct the issue shown below and upload a new payment receipt.",
    newReceipt: "New payment receipt",
    chooseReceipt: "Choose a file",
    acceptedFormats: "PDF, JPG, JPEG or PNG — 10 MB maximum.",
    sendReceipt: "Send the new receipt",
    sendingReceipt: "Uploading...",
    receiptSent: "Your new receipt has been sent. The payment is under review again.",
    receiptRequired: "Select a new payment receipt.",
    receiptTooLarge: "The file must not exceed 10 MB.",
    receiptInvalidType: "Unsupported format. Use PDF, JPG, JPEG or PNG.",
  },
  tr: {
    backHome: "← Ana sayfaya dön",
    title: "Başvuru takibi",
    intro: "Başvuru kodunuzu ve başvuruda kullandığınız WhatsApp numarasını girin.",
    requestCode: "Başvuru kodu",
    whatsapp: "WhatsApp numarası",
    phoneCode: "Telefon ülke kodu",
    search: "Başvurumu takip et",
    searching: "Aranıyor...",
    loadingTitle: "Başvurunuz aranıyor...",
    loadingText: "Bilgileriniz kontrol ediliyor.",
    client: "Müşteri",
    currentStatus: "Mevcut durum",
    amount: "Tutar",
    duration: "Süre",
    year: "yıl",
    years: "yıl",
    payment: "Ödeme",
    status: "Durum",
    submittedAt: "Gönderilme tarihi",
    verifiedAt: "Doğrulanma tarihi",
    rejectionReason: "Ret nedeni",
    policyAvailable: "Sigorta hazır",
    policyReady: "Sigorta poliçeniz hazır.",
    policyNumber: "Poliçe numarası",
    issueDate: "Düzenlenme tarihi",
    expiration: "Bitiş tarihi",
    policyUnavailable: "Sigorta henüz hazır değil",
    policyUnavailableText: "Sigorta poliçeniz henüz IF Sigorta tarafından yüklenmedi.",
    history: "Geçmiş",
    createdAt: "Oluşturulma tarihi",
    updatedAt: "Son güncelleme",
    unavailable: "Mevcut değil",
    missingCode: "Başvuru kodunuzu girin.",
    missingPhone: "WhatsApp numaranızı girin.",
    genericError: "Beklenmeyen bir hata oluştu.",
    trackingError: "Başvuru bulunamadı.",
    incompleteResponse: "Sunucu yanıtı eksik.",
    genericStatus: "Başvurunun mevcut durumu.",
    rejectedHelp: "Ödemeniz reddedildi. Aşağıda belirtilen sorunu düzelttikten sonra yeni bir ödeme dekontu yükleyin.",
    newReceipt: "Yeni ödeme dekontu",
    chooseReceipt: "Dosya seç",
    acceptedFormats: "PDF, JPG, JPEG veya PNG — en fazla 10 MB.",
    sendReceipt: "Yeni dekontu gönder",
    sendingReceipt: "Gönderiliyor...",
    receiptSent: "Yeni dekontunuz gönderildi. Ödemeniz tekrar kontrol ediliyor.",
    receiptRequired: "Yeni bir ödeme dekontu seçin.",
    receiptTooLarge: "Dosya boyutu 10 MB'ı geçmemelidir.",
    receiptInvalidType: "Desteklenmeyen format. PDF, JPG, JPEG veya PNG kullanın.",
  },
};

const paymentStatusLabels: Record<
  Language,
  Record<string, string>
> = {
  fr: {
    submitted: "Déposé",
    pending: "En attente",
    payment_review: "En vérification",
    review: "En vérification",
    verified: "Vérifié",
    confirmed: "Confirmé",
    payment_confirmed: "Confirmé",
    rejected: "Refusé",
    payment_rejected: "Refusé",
  },

  en: {
    submitted: "Submitted",
    pending: "Pending",
    payment_review: "Under review",
    review: "Under review",
    verified: "Verified",
    confirmed: "Confirmed",
    payment_confirmed: "Confirmed",
    rejected: "Rejected",
    payment_rejected: "Rejected",
  },

  tr: {
    submitted: "Gönderildi",
    pending: "Bekliyor",
    payment_review: "Kontrol ediliyor",
    review: "Kontrol ediliyor",
    verified: "Doğrulandı",
    confirmed: "Onaylandı",
    payment_confirmed: "Onaylandı",
    rejected: "Reddedildi",
    payment_rejected: "Reddedildi",
  },
};

const statusLabels: Record<Language, Record<string, { label: string; description: string; className: string }>> = {
  fr: {
    draft: { label: "Dossier en préparation", description: "Votre demande n’a pas encore été finalisée.", className: "bg-slate-100 text-slate-700" },
    waiting_payment: { label: "En attente de paiement", description: "Le paiement n’a pas encore été déclaré.", className: "bg-amber-100 text-amber-800" },
    payment_review: { label: "Paiement en vérification", description: "Votre dekont a été reçu et sera vérifié par un agent.", className: "bg-orange-100 text-orange-800" },
    payment_confirmed: { label: "Paiement confirmé", description: "Votre paiement a été validé.", className: "bg-green-100 text-green-800" },
    policy_preparation: { label: "Assurance en préparation", description: "Votre police d’assurance est en cours de création.", className: "bg-blue-100 text-blue-800" },
    policy_available: { label: "Assurance disponible", description: "Votre assurance est prête au téléchargement.", className: "bg-emerald-100 text-emerald-800" },
    payment_rejected: { label: "Paiement refusé", description: "Le paiement n’a pas pu être validé. Contactez IF Sigorta.", className: "bg-red-100 text-red-800" },
    cancelled: { label: "Dossier annulé", description: "Cette demande a été annulée.", className: "bg-slate-200 text-slate-800" },
  },
  en: {
    draft: { label: "Request being prepared", description: "Your request has not yet been finalized.", className: "bg-slate-100 text-slate-700" },
    waiting_payment: { label: "Awaiting payment", description: "Payment has not yet been declared.", className: "bg-amber-100 text-amber-800" },
    payment_review: { label: "Payment under review", description: "Your payment receipt has been received and will be reviewed by an agent.", className: "bg-orange-100 text-orange-800" },
    payment_confirmed: { label: "Payment confirmed", description: "Your payment has been validated.", className: "bg-green-100 text-green-800" },
    policy_preparation: { label: "Insurance being prepared", description: "Your insurance policy is being prepared.", className: "bg-blue-100 text-blue-800" },
    policy_available: { label: "Insurance available", description: "Your insurance is ready to download.", className: "bg-emerald-100 text-emerald-800" },
    payment_rejected: { label: "Payment rejected", description: "Your payment could not be validated. Contact IF Sigorta.", className: "bg-red-100 text-red-800" },
    cancelled: { label: "Request cancelled", description: "This request has been cancelled.", className: "bg-slate-200 text-slate-800" },
  },
  tr: {
    draft: { label: "Başvuru hazırlanıyor", description: "Başvurunuz henüz tamamlanmadı.", className: "bg-slate-100 text-slate-700" },
    waiting_payment: { label: "Ödeme bekleniyor", description: "Ödeme henüz bildirilmedi.", className: "bg-amber-100 text-amber-800" },
    payment_review: { label: "Ödeme kontrol ediliyor", description: "Dekontunuz alındı ve bir temsilci tarafından kontrol edilecek.", className: "bg-orange-100 text-orange-800" },
    payment_confirmed: { label: "Ödeme onaylandı", description: "Ödemeniz doğrulandı.", className: "bg-green-100 text-green-800" },
    policy_preparation: { label: "Sigorta hazırlanıyor", description: "Sigorta poliçeniz hazırlanıyor.", className: "bg-blue-100 text-blue-800" },
    policy_available: { label: "Sigorta hazır", description: "Sigortanız indirilmeye hazır.", className: "bg-emerald-100 text-emerald-800" },
    payment_rejected: { label: "Ödeme reddedildi", description: "Ödemeniz doğrulanamadı. IF Sigorta ile iletişime geçin.", className: "bg-red-100 text-red-800" },
    cancelled: { label: "Başvuru iptal edildi", description: "Bu başvuru iptal edildi.", className: "bg-slate-200 text-slate-800" },
  },
};

function localeFor(language: Language) {
  return language === "en" ? "en-US" : language === "tr" ? "tr-TR" : "fr-FR";
}

function formatDate(value: string | null, language: Language) {
  if (!value) return translations[language].unavailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return translations[language].unavailable;
  return new Intl.DateTimeFormat(localeFor(language), { dateStyle: "long", timeStyle: "short" }).format(date);
}

function isTrackingResult(value: unknown): value is TrackingResult {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<TrackingResult>;
  return Boolean(
    data.request && typeof data.request.requestCode === "string" && typeof data.request.status === "string" &&
    data.client && typeof data.client.firstName === "string" && typeof data.client.lastName === "string" &&
    data.policy && typeof data.policy.available === "boolean"
  );
}

export default function SuiviClient({ initialCode, initialCountry, initialPhone }: SuiviClientProps) {
  const [language, setLanguage] = useState<Language>("fr");
  const t = translations[language];

  const [requestCode, setRequestCode] = useState(initialCode);
  const [whatsappCountryCode, setWhatsappCountryCode] = useState(initialCountry || "+90");
  const [whatsappNumber, setWhatsappNumber] = useState(initialPhone);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [newReceiptFile, setNewReceiptFile] =
    useState<File | null>(null);

  const [uploadingReceipt, setUploadingReceipt] =
    useState(false);

  const [receiptMessage, setReceiptMessage] =
    useState("");

  const [receiptError, setReceiptError] =
    useState("");

  const automaticSearchStarted = useRef(false);
  const hasTrackingData = initialCode.trim().length > 0 && initialPhone.trim().length > 0;

  useEffect(() => {
    function readSavedLanguage() {
      const saved =
        window.localStorage.getItem(
          "if-sigorta-language",
        );

      if (
        saved === "fr" ||
        saved === "en" ||
        saved === "tr"
      ) {
        setLanguage(saved);
      }
    }

    readSavedLanguage();

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
        setLanguage(nextLanguage);
        return;
      }

      readSavedLanguage();
    }

    window.addEventListener(
      "if-sigorta-language-change",
      handleLanguageChange,
    );

    window.addEventListener(
      "storage",
      readSavedLanguage,
    );

    window.addEventListener(
      "focus",
      readSavedLanguage,
    );

    return () => {
      window.removeEventListener(
        "if-sigorta-language-change",
        handleLanguageChange,
      );

      window.removeEventListener(
        "storage",
        readSavedLanguage,
      );

      window.removeEventListener(
        "focus",
        readSavedLanguage,
      );
    };
  }, []);

  async function searchTracking(code: string, country: string, phone: string) {
    const cleanedCode = code.trim().toUpperCase();
    const cleanedCountry = country.trim() || "+90";
    const cleanedPhone = phone.replace(/\D/g, "");

    if (!cleanedCode) return setErrorMessage(t.missingCode);
    if (!cleanedPhone) return setErrorMessage(t.missingPhone);

    setLoading(true);
    setErrorMessage("");
    setResult(null);

    try {
      const response = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestCode: cleanedCode, whatsappCountryCode: cleanedCountry, whatsappNumber: cleanedPhone }),
      });

      const data = (await response.json()) as unknown;
      if (!response.ok) throw new Error((data as ErrorResult).error || t.trackingError);
      if (!isTrackingResult(data)) throw new Error(t.incompleteResponse);

      setRequestCode(cleanedCode);
      setWhatsappCountryCode(cleanedCountry);
      setWhatsappNumber(cleanedPhone);
      setResult(data);
    } catch (error) {
      setResult(null);
      setErrorMessage(error instanceof Error ? error.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasTrackingData || automaticSearchStarted.current) return;
    automaticSearchStarted.current = true;
    void searchTracking(initialCode, initialCountry, initialPhone);
  }, [hasTrackingData, initialCode, initialCountry, initialPhone]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void searchTracking(requestCode, whatsappCountryCode, whatsappNumber);
  }

  async function handleReceiptUpload(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setReceiptMessage("");
    setReceiptError("");

    if (!newReceiptFile) {
      setReceiptError(t.receiptRequired);
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(newReceiptFile.type)) {
      setReceiptError(t.receiptInvalidType);
      return;
    }

    if (newReceiptFile.size > 10 * 1024 * 1024) {
      setReceiptError(t.receiptTooLarge);
      return;
    }

    if (!result) {
      setReceiptError(t.genericError);
      return;
    }

    setUploadingReceipt(true);

    try {
      const formData = new FormData();

      formData.append(
        "requestCode",
        result.request.requestCode,
      );

      formData.append(
        "whatsappCountryCode",
        whatsappCountryCode,
      );

      formData.append(
        "whatsappNumber",
        whatsappNumber.replace(/\D/g, ""),
      );

      formData.append(
        "paymentReceiptFile",
        newReceiptFile,
      );

      const response = await fetch(
        "/api/tracking/payment-receipt",
        {
          method: "POST",
          body: formData,
        },
      );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || t.genericError,
        );
      }

      setNewReceiptFile(null);
      setReceiptMessage(t.receiptSent);

      await searchTracking(
        result.request.requestCode,
        whatsappCountryCode,
        whatsappNumber,
      );
    } catch (error) {
      setReceiptError(
        error instanceof Error
          ? error.message
          : t.genericError,
      );
    } finally {
      setUploadingReceipt(false);
    }
  }

  const currentStatus = result?.request.status ?? null;
  const statusInformation = currentStatus
    ? statusLabels[language][currentStatus] ?? { label: currentStatus, description: t.genericStatus, className: "bg-slate-100 text-slate-700" }
    : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="mb-6 inline-block font-medium text-blue-700 hover:underline">{t.backHome}</a>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-3xl font-bold text-slate-900">{t.title}</h1>

          {!hasTrackingData && !result && (
            <>
              <p className="mt-2 text-slate-600">{t.intro}</p>
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="requestCode" className="mb-2 block font-medium text-slate-800">{t.requestCode}</label>
                  <input id="requestCode" type="text" value={requestCode} onChange={(e) => { setRequestCode(e.target.value.toUpperCase()); setErrorMessage(""); }} placeholder="IFS-260808-DF56" autoComplete="off" required className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
                </div>

                <div>
                  <label htmlFor="trackingPhone" className="mb-2 block font-medium text-slate-800">{t.whatsapp}</label>
                  <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-100">
                    <select value={whatsappCountryCode} onChange={(e) => setWhatsappCountryCode(e.target.value)} aria-label={t.phoneCode} className="border-r border-slate-300 bg-slate-50 px-3 outline-none">
                      {countryCodes.map((item) => <option key={item.code} value={item.code}>{item.flag} {item.code}</option>)}
                    </select>
                    <input id="trackingPhone" type="tel" inputMode="numeric" value={whatsappNumber} onChange={(e) => { setWhatsappNumber(e.target.value.replace(/\D/g, "")); setErrorMessage(""); }} placeholder="5XXXXXXXXX" autoComplete="tel" required className="min-w-0 flex-1 px-4 py-3 outline-none" />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#2F2963] px-5 py-4 font-semibold text-white transition hover:bg-[#25204f] disabled:cursor-not-allowed disabled:bg-slate-400">
                  {loading ? t.searching : t.search}
                </button>
              </form>
            </>
          )}

          {loading && hasTrackingData && (
            <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6">
              <p className="font-semibold text-blue-900">{t.loadingTitle}</p>
              <p className="mt-1 text-sm text-blue-700">{t.loadingText}</p>
            </div>
          )}

          {errorMessage && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">{errorMessage}</div>}

          {result && statusInformation && (
            <section className="mt-8 space-y-6">
              <InfoCard label={t.requestCode} value={result.request.requestCode} />
              <InfoCard label={t.client} value={`${result.client.firstName} ${result.client.lastName}`} />

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500">{t.currentStatus}</p>
                <span className={`mt-3 inline-block rounded-full px-4 py-2 text-sm font-semibold ${statusInformation.className}`}>{statusInformation.label}</span>
                <p className="mt-3 leading-6 text-slate-600">{statusInformation.description}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500">{t.amount}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{Number(result.request.calculatedPrice).toLocaleString(localeFor(language))} TL</p>
                <p className="mt-3 text-sm text-slate-500">{t.duration}: {result.request.durationYears} {result.request.durationYears > 1 ? t.years : t.year}</p>
              </div>

              {result.payment && (
                <div className="rounded-2xl border border-slate-200 p-5">
                  <h2 className="text-xl font-bold text-slate-900">{t.payment}</h2>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <p><strong>{t.status}:</strong> {paymentStatusLabels[language][result.payment.status] ?? result.payment.status}</p>
                    <p><strong>{t.submittedAt}:</strong> {formatDate(result.payment.submittedAt, language)}</p>
                    <p><strong>{t.verifiedAt}:</strong> {formatDate(result.payment.verifiedAt, language)}</p>
                    {result.payment.rejectionReason && <div className="rounded-xl bg-red-50 p-4 text-red-700"><strong>{t.rejectionReason}:</strong><br />{result.payment.rejectionReason}</div>}
                  </div>
                </div>
              )}

              {currentStatus === "payment_rejected" && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <h2 className="text-xl font-bold text-red-900">
                    {t.newReceipt}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-red-700">
                    {t.rejectedHelp}
                  </p>

                  <form
                    onSubmit={handleReceiptUpload}
                    className="mt-5 space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="newPaymentReceipt"
                        className="mb-2 block text-sm font-semibold text-slate-800"
                      >
                        {t.chooseReceipt}
                      </label>

                      <input
                        id="newPaymentReceipt"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        onChange={(event) => {
                          const file =
                            event.target.files?.[0] ??
                            null;

                          setNewReceiptFile(file);
                          setReceiptError("");
                          setReceiptMessage("");
                        }}
                        className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#2F2963] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-[#25204f]"
                      />

                      <p className="mt-2 text-xs text-slate-500">
                        {t.acceptedFormats}
                      </p>

                      {newReceiptFile && (
                        <p className="mt-2 break-all text-sm font-medium text-slate-700">
                          {newReceiptFile.name}
                        </p>
                      )}
                    </div>

                    {receiptError && (
                      <div className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700">
                        {receiptError}
                      </div>
                    )}

                    {receiptMessage && (
                      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {receiptMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        uploadingReceipt ||
                        !newReceiptFile
                      }
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#2F2963] px-5 text-sm font-semibold text-white transition hover:bg-[#25204f] disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {uploadingReceipt
                        ? t.sendingReceipt
                        : t.sendReceipt}
                    </button>
                  </form>
                </div>
              )}

              {result.policy.available ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                  <p className="text-xl font-bold text-green-800">{t.policyAvailable}</p>
                  <p className="mt-2 text-sm text-green-700">{t.policyReady}</p>
                  {result.policy.policyNumber && <p className="mt-3 text-sm text-green-700">{t.policyNumber}: <strong>{result.policy.policyNumber}</strong></p>}
                  {result.policy.issueDate && <p className="mt-2 text-sm text-green-700">{t.issueDate}: {formatDate(result.policy.issueDate, language)}</p>}
                  {result.policy.expirationDate && <p className="mt-2 text-sm text-green-700">{t.expiration}: {formatDate(result.policy.expirationDate, language)}</p>}
                  <div className="mt-6">
                    <PolicyDownloadButton requestCode={result.request.requestCode} whatsappCountryCode={whatsappCountryCode} whatsappNumber={whatsappNumber} durationYears={result.request.durationYears === 2 ? 2 : 1} />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="font-semibold text-slate-800">{t.policyUnavailable}</p>
                  <p className="mt-2 text-sm text-slate-600">{t.policyUnavailableText}</p>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 p-5">
                <h2 className="text-lg font-bold text-slate-900">{t.history}</h2>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p><strong>{t.createdAt}:</strong> {formatDate(result.request.createdAt, language)}</p>
                  <p><strong>{t.updatedAt}:</strong> {formatDate(result.request.updatedAt, language)}</p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 break-all text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}