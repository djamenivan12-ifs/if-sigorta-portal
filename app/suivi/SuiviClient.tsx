"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import PolicyDownloadButton from "./PolicyDownloadButton";

import { countryCodes } from "@/lib/countryCodes";

type Language =
  | "fr"
  | "en"
  | "tr";

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

type ErrorResult = {
  error?: string;
};

const translations = {
  fr: {
    backHome:
      "← Retour à l’accueil",

    title:
      "Suivi de votre demande",

    intro:
      "Saisissez votre code de dossier et le numéro WhatsApp utilisé lors de votre demande.",

    requestCode:
      "Code du dossier",

    whatsapp:
      "Numéro WhatsApp",

    phoneCode:
      "Indicatif téléphonique",

    search:
      "Suivre mon dossier",

    searching:
      "Recherche...",

    loadingTitle:
      "Recherche de votre dossier...",

    loadingText:
      "Vérification de vos informations.",

    client:
      "Client",

    currentStatus:
      "État actuel",

    amount:
      "Montant",

    duration:
      "Durée",

    year:
      "an",

    years:
      "ans",

    payment:
      "Paiement",

    status:
      "Statut",

    submittedAt:
      "Déposé le",

    verifiedAt:
      "Vérifié le",

    rejectionReason:
      "Motif du refus",

    policyAvailable:
      "Assurance disponible",

    policyReady:
      "Votre police d’assurance est prête.",

    policyNumber:
      "Numéro de police",

    issueDate:
      "Date d’émission",

    expiration:
      "Expiration",

    policyUnavailable:
      "Assurance indisponible",

    policyUnavailableText:
      "Votre police d’assurance n’a pas encore été déposée par IF Sigorta.",

    history:
      "Historique",

    createdAt:
      "Créé le",

    updatedAt:
      "Dernière mise à jour",

    unavailable:
      "Non disponible",

    missingCode:
      "Saisissez votre code de dossier.",

    missingPhone:
      "Saisissez votre numéro WhatsApp.",

    genericError:
      "Une erreur inattendue est survenue.",

    trackingError:
      "Le dossier n’a pas pu être recherché.",

    incompleteResponse:
      "La réponse du serveur est incomplète.",

    genericStatus:
      "Statut actuel du dossier.",

    rejectedHelp:
      "Votre paiement a été refusé. Corrigez le problème indiqué puis envoyez un nouveau justificatif de paiement.",

    newReceipt:
      "Nouveau justificatif de paiement",

    chooseReceipt:
      "Choisir un fichier",

    acceptedFormats:
      "PDF, JPG, JPEG ou PNG — 10 Mo maximum.",

    sendReceipt:
      "Envoyer le nouveau justificatif",

    sendingReceipt:
      "Envoi en cours...",

    receiptSent:
      "Votre nouveau justificatif a été envoyé. Le paiement est de nouveau en vérification.",

    receiptRequired:
      "Sélectionnez un nouveau justificatif de paiement.",

    receiptTooLarge:
      "Le fichier ne doit pas dépasser 10 Mo.",

    receiptInvalidType:
      "Format non accepté. Utilisez PDF, JPG, JPEG ou PNG.",
  },

  en: {
    backHome:
      "← Back to home",

    title:
      "Track your request",

    intro:
      "Enter your request code and the WhatsApp number used when you applied.",

    requestCode:
      "Request code",

    whatsapp:
      "WhatsApp number",

    phoneCode:
      "Country calling code",

    search:
      "Track my request",

    searching:
      "Searching...",

    loadingTitle:
      "Searching for your request...",

    loadingText:
      "Checking your information.",

    client:
      "Client",

    currentStatus:
      "Current status",

    amount:
      "Amount",

    duration:
      "Duration",

    year:
      "year",

    years:
      "years",

    payment:
      "Payment",

    status:
      "Status",

    submittedAt:
      "Submitted on",

    verifiedAt:
      "Verified on",

    rejectionReason:
      "Rejection reason",

    policyAvailable:
      "Insurance available",

    policyReady:
      "Your insurance policy is ready.",

    policyNumber:
      "Policy number",

    issueDate:
      "Issue date",

    expiration:
      "Expiration",

    policyUnavailable:
      "Insurance unavailable",

    policyUnavailableText:
      "Your insurance policy has not yet been uploaded by IF Sigorta.",

    history:
      "History",

    createdAt:
      "Created on",

    updatedAt:
      "Last updated",

    unavailable:
      "Not available",

    missingCode:
      "Enter your request code.",

    missingPhone:
      "Enter your WhatsApp number.",

    genericError:
      "An unexpected error occurred.",

    trackingError:
      "The request could not be found.",

    incompleteResponse:
      "The server response is incomplete.",

    genericStatus:
      "Current request status.",

    rejectedHelp:
      "Your payment was rejected. Correct the issue shown below and upload a new payment receipt.",

    newReceipt:
      "New payment receipt",

    chooseReceipt:
      "Choose a file",

    acceptedFormats:
      "PDF, JPG, JPEG or PNG — 10 MB maximum.",

    sendReceipt:
      "Send the new receipt",

    sendingReceipt:
      "Uploading...",

    receiptSent:
      "Your new receipt has been sent. The payment is under review again.",

    receiptRequired:
      "Select a new payment receipt.",

    receiptTooLarge:
      "The file must not exceed 10 MB.",

    receiptInvalidType:
      "Unsupported format. Use PDF, JPG, JPEG or PNG.",
  },

  tr: {
    backHome:
      "← Ana sayfaya dön",

    title:
      "Başvuru takibi",

    intro:
      "Başvuru kodunuzu ve başvuruda kullandığınız WhatsApp numarasını girin.",

    requestCode:
      "Başvuru kodu",

    whatsapp:
      "WhatsApp numarası",

    phoneCode:
      "Telefon ülke kodu",

    search:
      "Başvurumu takip et",

    searching:
      "Aranıyor...",

    loadingTitle:
      "Başvurunuz aranıyor...",

    loadingText:
      "Bilgileriniz kontrol ediliyor.",

    client:
      "Müşteri",

    currentStatus:
      "Mevcut durum",

    amount:
      "Tutar",

    duration:
      "Süre",

    year:
      "yıl",

    years:
      "yıl",

    payment:
      "Ödeme",

    status:
      "Durum",

    submittedAt:
      "Gönderilme tarihi",

    verifiedAt:
      "Doğrulanma tarihi",

    rejectionReason:
      "Ret nedeni",

    policyAvailable:
      "Sigorta hazır",

    policyReady:
      "Sigorta poliçeniz hazır.",

    policyNumber:
      "Poliçe numarası",

    issueDate:
      "Düzenlenme tarihi",

    expiration:
      "Bitiş tarihi",

    policyUnavailable:
      "Sigorta henüz hazır değil",

    policyUnavailableText:
      "Sigorta poliçeniz henüz IF Sigorta tarafından yüklenmedi.",

    history:
      "Geçmiş",

    createdAt:
      "Oluşturulma tarihi",

    updatedAt:
      "Son güncelleme",

    unavailable:
      "Mevcut değil",

    missingCode:
      "Başvuru kodunuzu girin.",

    missingPhone:
      "WhatsApp numaranızı girin.",

    genericError:
      "Beklenmeyen bir hata oluştu.",

    trackingError:
      "Başvuru bulunamadı.",

    incompleteResponse:
      "Sunucu yanıtı eksik.",

    genericStatus:
      "Başvurunun mevcut durumu.",

    rejectedHelp:
      "Ödemeniz reddedildi. Aşağıda belirtilen sorunu düzelttikten sonra yeni bir ödeme dekontu yükleyin.",

    newReceipt:
      "Yeni ödeme dekontu",

    chooseReceipt:
      "Dosya seç",

    acceptedFormats:
      "PDF, JPG, JPEG veya PNG — en fazla 10 MB.",

    sendReceipt:
      "Yeni dekontu gönder",

    sendingReceipt:
      "Gönderiliyor...",

    receiptSent:
      "Yeni dekontunuz gönderildi. Ödemeniz tekrar kontrol ediliyor.",

    receiptRequired:
      "Yeni bir ödeme dekontu seçin.",

    receiptTooLarge:
      "Dosya boyutu 10 MB'ı geçmemelidir.",

    receiptInvalidType:
      "Desteklenmeyen format. PDF, JPG, JPEG veya PNG kullanın.",
  },
};

const paymentStatusLabels: Record<
  Language,
  Record<string, string>
> = {
  fr: {
    submitted: "Déposé",
    pending: "En attente",
    payment_review:
      "En vérification",
    review:
      "En vérification",
    verified:
      "Vérifié",
    confirmed:
      "Confirmé",
    payment_confirmed:
      "Confirmé",
    rejected:
      "Refusé",
    payment_rejected:
      "Refusé",
  },

  en: {
    submitted:
      "Submitted",
    pending:
      "Pending",
    payment_review:
      "Under review",
    review:
      "Under review",
    verified:
      "Verified",
    confirmed:
      "Confirmed",
    payment_confirmed:
      "Confirmed",
    rejected:
      "Rejected",
    payment_rejected:
      "Rejected",
  },

  tr: {
    submitted:
      "Gönderildi",
    pending:
      "Bekliyor",
    payment_review:
      "Kontrol ediliyor",
    review:
      "Kontrol ediliyor",
    verified:
      "Doğrulandı",
    confirmed:
      "Onaylandı",
    payment_confirmed:
      "Onaylandı",
    rejected:
      "Reddedildi",
    payment_rejected:
      "Reddedildi",
  },
};

const statusLabels: Record<
  Language,
  Record<
    string,
    {
      label: string;
      description: string;
      className: string;
    }
  >
> = {
  fr: {
    draft: {
      label:
        "Dossier en préparation",
      description:
        "Votre demande n’a pas encore été finalisée.",
      className:
        "bg-slate-100 text-slate-700",
    },

    waiting_payment: {
      label:
        "En attente de paiement",
      description:
        "Le paiement n’a pas encore été déclaré.",
      className:
        "bg-amber-100 text-amber-800",
    },

    payment_review: {
      label:
        "Paiement en vérification",
      description:
        "Votre dekont a été reçu et sera vérifié par un agent.",
      className:
        "bg-orange-100 text-orange-800",
    },

    payment_confirmed: {
      label:
        "Paiement confirmé",
      description:
        "Votre paiement a été validé.",
      className:
        "bg-green-100 text-green-800",
    },

    policy_preparation: {
      label:
        "Assurance en préparation",
      description:
        "Votre police d’assurance est en cours de création.",
      className:
        "bg-[#EAF4ED] text-[#0B5D3B]",
    },

    policy_available: {
      label:
        "Assurance disponible",
      description:
        "Votre assurance est prête au téléchargement.",
      className:
        "bg-emerald-100 text-emerald-800",
    },

    payment_rejected: {
      label:
        "Paiement refusé",
      description:
        "Le paiement n’a pas pu être validé. Contactez IF Sigorta.",
      className:
        "bg-red-100 text-red-800",
    },

    cancelled: {
      label:
        "Dossier annulé",
      description:
        "Cette demande a été annulée.",
      className:
        "bg-slate-200 text-slate-800",
    },
  },

  en: {
    draft: {
      label:
        "Request being prepared",
      description:
        "Your request has not yet been finalized.",
      className:
        "bg-slate-100 text-slate-700",
    },

    waiting_payment: {
      label:
        "Awaiting payment",
      description:
        "Payment has not yet been declared.",
      className:
        "bg-amber-100 text-amber-800",
    },

    payment_review: {
      label:
        "Payment under review",
      description:
        "Your payment receipt has been received and will be reviewed by an agent.",
      className:
        "bg-orange-100 text-orange-800",
    },

    payment_confirmed: {
      label:
        "Payment confirmed",
      description:
        "Your payment has been validated.",
      className:
        "bg-green-100 text-green-800",
    },

    policy_preparation: {
      label:
        "Insurance being prepared",
      description:
        "Your insurance policy is being prepared.",
      className:
        "bg-[#EAF4ED] text-[#0B5D3B]",
    },

    policy_available: {
      label:
        "Insurance available",
      description:
        "Your insurance is ready to download.",
      className:
        "bg-emerald-100 text-emerald-800",
    },

    payment_rejected: {
      label:
        "Payment rejected",
      description:
        "Your payment could not be validated. Contact IF Sigorta.",
      className:
        "bg-red-100 text-red-800",
    },

    cancelled: {
      label:
        "Request cancelled",
      description:
        "This request has been cancelled.",
      className:
        "bg-slate-200 text-slate-800",
    },
  },

  tr: {
    draft: {
      label:
        "Başvuru hazırlanıyor",
      description:
        "Başvurunuz henüz tamamlanmadı.",
      className:
        "bg-slate-100 text-slate-700",
    },

    waiting_payment: {
      label:
        "Ödeme bekleniyor",
      description:
        "Ödeme henüz bildirilmedi.",
      className:
        "bg-amber-100 text-amber-800",
    },

    payment_review: {
      label:
        "Ödeme kontrol ediliyor",
      description:
        "Dekontunuz alındı ve bir temsilci tarafından kontrol edilecek.",
      className:
        "bg-orange-100 text-orange-800",
    },

    payment_confirmed: {
      label:
        "Ödeme onaylandı",
      description:
        "Ödemeniz doğrulandı.",
      className:
        "bg-green-100 text-green-800",
    },

    policy_preparation: {
      label:
        "Sigorta hazırlanıyor",
      description:
        "Sigorta poliçeniz hazırlanıyor.",
      className:
        "bg-[#EAF4ED] text-[#0B5D3B]",
    },

    policy_available: {
      label:
        "Sigorta hazır",
      description:
        "Sigortanız indirilmeye hazır.",
      className:
        "bg-emerald-100 text-emerald-800",
    },

    payment_rejected: {
      label:
        "Ödeme reddedildi",
      description:
        "Ödemeniz doğrulanamadı. IF Sigorta ile iletişime geçin.",
      className:
        "bg-red-100 text-red-800",
    },

    cancelled: {
      label:
        "Başvuru iptal edildi",
      description:
        "Bu başvuru iptal edildi.",
      className:
        "bg-slate-200 text-slate-800",
    },
  },
};

function localeFor(
  language: Language,
) {
  return language === "en"
    ? "en-US"
    : language === "tr"
      ? "tr-TR"
      : "fr-FR";
}

function formatDate(
  value: string | null,
  language: Language,
) {
  if (!value) {
    return translations[
      language
    ].unavailable;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return translations[
      language
    ].unavailable;
  }

  return new Intl.DateTimeFormat(
    localeFor(language),
    {
      dateStyle: "long",
      timeStyle: "short",
    },
  ).format(date);
}

function isTrackingResult(
  value: unknown,
): value is TrackingResult {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return false;
  }

  const data =
    value as Partial<TrackingResult>;

  return Boolean(
    data.request &&
      typeof data.request
        .requestCode ===
        "string" &&
      typeof data.request
        .status ===
        "string" &&
      data.client &&
      typeof data.client
        .firstName ===
        "string" &&
      typeof data.client
        .lastName ===
        "string" &&
      data.policy &&
      typeof data.policy
        .available ===
        "boolean",
  );
}

export default function SuiviClient({
  initialCode,
  initialCountry,
  initialPhone,
}: SuiviClientProps) {
  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "fr",
    );

  const t =
    translations[
      language
    ];

  const [
    requestCode,
    setRequestCode,
  ] =
    useState(
      initialCode,
    );

  const [
    whatsappCountryCode,
    setWhatsappCountryCode,
  ] =
    useState(
      initialCountry ||
        "+90",
    );

  const [
    whatsappNumber,
    setWhatsappNumber,
  ] =
    useState(
      initialPhone,
    );

  const [
    result,
    setResult,
  ] =
    useState<TrackingResult | null>(
      null,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    newReceiptFile,
    setNewReceiptFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    uploadingReceipt,
    setUploadingReceipt,
  ] =
    useState(false);

  const [
    receiptMessage,
    setReceiptMessage,
  ] =
    useState("");

  const [
    receiptError,
    setReceiptError,
  ] =
    useState("");

  const automaticSearchStarted =
    useRef(false);

  const hasTrackingData =
    initialCode
      .trim()
      .length >
      0 &&
    initialPhone
      .trim()
      .length >
      0;

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
        setLanguage(
          saved,
        );
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
        customEvent.detail
          ?.language;

      if (
        nextLanguage ===
          "fr" ||
        nextLanguage ===
          "en" ||
        nextLanguage ===
          "tr"
      ) {
        setLanguage(
          nextLanguage,
        );

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

  async function searchTracking(
    code: string,
    country: string,
    phone: string,
  ) {
    const cleanedCode =
      code
        .trim()
        .toUpperCase();

    const cleanedCountry =
      country.trim() ||
      "+90";

    const cleanedPhone =
      phone.replace(
        /\D/g,
        "",
      );

    if (!cleanedCode) {
      return setErrorMessage(
        t.missingCode,
      );
    }

    if (!cleanedPhone) {
      return setErrorMessage(
        t.missingPhone,
      );
    }

    setLoading(true);
    setErrorMessage("");
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/tracking",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                requestCode:
                  cleanedCode,

                whatsappCountryCode:
                  cleanedCountry,

                whatsappNumber:
                  cleanedPhone,
              }),
          },
        );

      const data =
        (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(
          (
            data as ErrorResult
          ).error ||
            t.trackingError,
        );
      }

      if (
        !isTrackingResult(
          data,
        )
      ) {
        throw new Error(
          t.incompleteResponse,
        );
      }

      setRequestCode(
        cleanedCode,
      );

      setWhatsappCountryCode(
        cleanedCountry,
      );

      setWhatsappNumber(
        cleanedPhone,
      );

      setResult(
        data,
      );
    } catch (error) {
      setResult(null);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : t.genericError,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      !hasTrackingData ||
      automaticSearchStarted.current
    ) {
      return;
    }

    automaticSearchStarted.current =
      true;

    void searchTracking(
      initialCode,
      initialCountry,
      initialPhone,
    );
  }, [
    hasTrackingData,
    initialCode,
    initialCountry,
    initialPhone,
  ]);

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    void searchTracking(
      requestCode,
      whatsappCountryCode,
      whatsappNumber,
    );
  }

  async function handleReceiptUpload(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setReceiptMessage("");
    setReceiptError("");

    if (!newReceiptFile) {
      setReceiptError(
        t.receiptRequired,
      );

      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (
      !allowedTypes.includes(
        newReceiptFile.type,
      )
    ) {
      setReceiptError(
        t.receiptInvalidType,
      );

      return;
    }

    if (
      newReceiptFile.size >
      10 *
        1024 *
        1024
    ) {
      setReceiptError(
        t.receiptTooLarge,
      );

      return;
    }

    if (!result) {
      setReceiptError(
        t.genericError,
      );

      return;
    }

    setUploadingReceipt(
      true,
    );

    try {
      const formData =
        new FormData();

      formData.append(
        "requestCode",
        result.request
          .requestCode,
      );

      formData.append(
        "whatsappCountryCode",
        whatsappCountryCode,
      );

      formData.append(
        "whatsappNumber",
        whatsappNumber.replace(
          /\D/g,
          "",
        ),
      );

      formData.append(
        "paymentReceiptFile",
        newReceiptFile,
      );

      const response =
        await fetch(
          "/api/tracking/payment-receipt",
          {
            method:
              "POST",

            body:
              formData,
          },
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            t.genericError,
        );
      }

      setNewReceiptFile(
        null,
      );

      setReceiptMessage(
        t.receiptSent,
      );

      await searchTracking(
        result.request
          .requestCode,
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
      setUploadingReceipt(
        false,
      );
    }
  }

  const currentStatus =
    result?.request
      .status ??
    null;

  const statusInformation =
    currentStatus
      ? statusLabels[
          language
        ][
          currentStatus
        ] ?? {
          label:
            currentStatus,

          description:
            t.genericStatus,

          className:
            "bg-slate-100 text-slate-700",
        }
      : null;

  const sideTitle =
    language === "fr"
      ? "Suivez votre dossier à chaque étape."
      : language ===
          "en"
        ? "Track your request at every stage."
        : "Başvurunuzu her aşamada takip edin.";

  const sideText =
    language === "fr"
      ? "Entrez votre code de dossier et votre numéro WhatsApp pour consulter l’état de votre demande."
      : language ===
          "en"
        ? "Enter your request code and WhatsApp number to check the status of your application."
        : "Başvurunuzun durumunu görmek için başvuru kodunuzu ve WhatsApp numaranızı girin.";

  return (
    <main className="min-h-screen bg-[#F6F8F5]">
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <a
            href="/"
            className="flex items-center"
            aria-label="IF Sigorta"
          >
            <img
              src="/if-sigorta-logo-light.png"
              alt="IF Sigorta"
              className="h-[72px] w-auto object-contain object-left sm:h-[82px]"
            />
          </a>

          <a
            href="/"
            className="text-sm font-semibold text-slate-500 transition hover:text-[#0B5D3B]"
          >
            {
              t.backHome
            }
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-10 xl:gap-14">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="relative overflow-hidden rounded-[2rem] bg-[#123F2C] px-6 py-8 text-white sm:px-8 lg:min-h-[560px] lg:px-8 lg:py-10">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#B8E83D]/10" />

              <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-white/5" />

              <div className="relative z-10 flex h-full flex-col">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B8E83D]">
                    IF SIGORTA
                  </p>

                  <h1 className="mt-6 max-w-sm text-3xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-4xl">
                    {
                      sideTitle
                    }
                  </h1>

                  <p className="mt-5 max-w-sm text-sm leading-7 text-white/65 sm:text-base">
                    {
                      sideText
                    }
                  </p>
                </div>

                <div className="mt-10 space-y-4 lg:mt-auto">
                  <div className="flex gap-3 border-t border-white/10 pt-5">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B8E83D] text-xs font-black text-[#15311F]">
                      ✓
                    </div>

                    <p className="text-sm leading-6 text-white/70">
                      {language ===
                      "fr"
                        ? "Consultez l’état du paiement et de la police."
                        : language ===
                            "en"
                          ? "Check payment and policy status."
                          : "Ödeme ve poliçe durumunu kontrol edin."}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white">
                      ✓
                    </div>

                    <p className="text-sm leading-6 text-white/70">
                      {language ===
                      "fr"
                        ? "Téléchargez votre assurance dès qu’elle est prête."
                        : language ===
                            "en"
                          ? "Download your insurance as soon as it is ready."
                          : "Sigortanız hazır olduğunda hemen indirin."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.24)] sm:p-8 lg:p-10">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B5D3B]">
                IF SIGORTA
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-4xl">
                {
                  t.title
                }
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                {
                  t.intro
                }
              </p>
            </div>

            {!hasTrackingData &&
              !result && (
                <form
                  onSubmit={
                    handleSubmit
                  }
                  className="mt-8 space-y-5"
                >
                  <div>
                    <label
                      htmlFor="requestCode"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {
                        t.requestCode
                      }
                    </label>

                    <input
                      id="requestCode"
                      type="text"
                      value={
                        requestCode
                      }
                      onChange={(
                        e,
                      ) => {
                        setRequestCode(
                          e.target.value.toUpperCase(),
                        );

                        setErrorMessage(
                          "",
                        );
                      }}
                      placeholder="IFS-260808-DF56"
                      autoComplete="off"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 uppercase outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="trackingPhone"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {
                        t.whatsapp
                      }
                    </label>

                    <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white transition focus-within:border-[#0B5D3B] focus-within:ring-4 focus-within:ring-[#0B5D3B]/10">
                      <select
                        value={
                          whatsappCountryCode
                        }
                        onChange={(
                          e,
                        ) =>
                          setWhatsappCountryCode(
                            e
                              .target
                              .value,
                          )
                        }
                        aria-label={
                          t.phoneCode
                        }
                        className="max-w-[210px] border-r border-slate-200 bg-slate-50 px-3 outline-none"
                      >
                        {countryCodes.map(
                          (
                            item,
                          ) => (
                            <option
                              key={`${item.country}-${item.code}`}
                              value={
                                item.code
                              }
                            >
                              {
                                item.flag
                              }{" "}
                              {
                                item.country
                              }{" "}
                              {
                                item.code
                              }
                            </option>
                          ),
                        )}
                      </select>

                      <input
                        id="trackingPhone"
                        type="tel"
                        inputMode="numeric"
                        value={
                          whatsappNumber
                        }
                        onChange={(
                          e,
                        ) => {
                          setWhatsappNumber(
                            e.target.value.replace(
                              /\D/g,
                              "",
                            ),
                          );

                          setErrorMessage(
                            "",
                          );
                        }}
                        placeholder="5XXXXXXXXX"
                        autoComplete="tel"
                        required
                        className="min-w-0 flex-1 px-4 py-3.5 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      loading
                    }
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0B5D3B] px-6 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {loading
                      ? t.searching
                      : t.search}
                  </button>
                </form>
              )}

            {loading &&
              hasTrackingData && (
                <div className="mt-8 rounded-2xl border border-[#D9E9D9] bg-[#F3F8F2] p-5">
                  <p className="font-semibold text-[#244A34]">
                    {
                      t.loadingTitle
                    }
                  </p>

                  <p className="mt-1 text-sm text-[#52705B]">
                    {
                      t.loadingText
                    }
                  </p>
                </div>
              )}

            {errorMessage && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
                {
                  errorMessage
                }
              </div>
            )}

            {result &&
              statusInformation && (
                <section className="mt-8 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoCard
                      label={
                        t.requestCode
                      }
                      value={
                        result
                          .request
                          .requestCode
                      }
                    />

                    <InfoCard
                      label={
                        t.client
                      }
                      value={`${result.client.firstName} ${result.client.lastName}`}
                    />
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC] p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {
                        t.currentStatus
                      }
                    </p>

                    <span
                      className={`mt-3 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${statusInformation.className}`}
                    >
                      {
                        statusInformation.label
                      }
                    </span>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {
                        statusInformation.description
                      }
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoCard
                      label={
                        t.amount
                      }
                      value={`${Number(
                        result
                          .request
                          .calculatedPrice,
                      ).toLocaleString(
                        localeFor(
                          language,
                        ),
                      )} TL`}
                    />

                    <InfoCard
                      label={
                        t.duration
                      }
                      value={`${
                        result
                          .request
                          .durationYears
                      } ${
                        result
                          .request
                          .durationYears >
                        1
                          ? t.years
                          : t.year
                      }`}
                    />
                  </div>

                  {result.payment && (
                    <div className="rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC] p-5 sm:p-6">
                      <h3 className="text-xl font-semibold text-[#102B20]">
                        {
                          t.payment
                        }
                      </h3>

                      <div className="mt-4 space-y-3 text-sm text-slate-700">
                        <p>
                          <strong>
                            {
                              t.status
                            }
                            :
                          </strong>{" "}
                          {paymentStatusLabels[
                            language
                          ][
                            result
                              .payment
                              .status
                          ] ??
                            result
                              .payment
                              .status}
                        </p>

                        <p>
                          <strong>
                            {
                              t.submittedAt
                            }
                            :
                          </strong>{" "}
                          {formatDate(
                            result
                              .payment
                              .submittedAt,
                            language,
                          )}
                        </p>

                        <p>
                          <strong>
                            {
                              t.verifiedAt
                            }
                            :
                          </strong>{" "}
                          {formatDate(
                            result
                              .payment
                              .verifiedAt,
                            language,
                          )}
                        </p>

                        {result
                          .payment
                          .rejectionReason && (
                          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                            <strong>
                              {
                                t.rejectionReason
                              }
                              :
                            </strong>

                            <br />

                            {
                              result
                                .payment
                                .rejectionReason
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStatus ===
                    "payment_rejected" && (
                    <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 sm:p-6">
                      <h3 className="text-xl font-semibold text-red-900">
                        {
                          t.newReceipt
                        }
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-red-700">
                        {
                          t.rejectedHelp
                        }
                      </p>

                      <form
                        onSubmit={
                          handleReceiptUpload
                        }
                        className="mt-5 space-y-4"
                      >
                        <div>
                          <label
                            htmlFor="newPaymentReceipt"
                            className="mb-2 block text-sm font-semibold text-slate-800"
                          >
                            {
                              t.chooseReceipt
                            }
                          </label>

                          <input
                            id="newPaymentReceipt"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                            onChange={(
                              event,
                            ) => {
                              const file =
                                event
                                  .target
                                  .files?.[0] ??
                                null;

                              setNewReceiptFile(
                                file,
                              );

                              setReceiptError(
                                "",
                              );

                              setReceiptMessage(
                                "",
                              );
                            }}
                            className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#0B5D3B] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-[#084A2F]"
                          />

                          <p className="mt-2 text-xs text-slate-500">
                            {
                              t.acceptedFormats
                            }
                          </p>

                          {newReceiptFile && (
                            <p className="mt-2 break-all text-sm font-medium text-slate-700">
                              {
                                newReceiptFile.name
                              }
                            </p>
                          )}
                        </div>

                        {receiptError && (
                          <div className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700">
                            {
                              receiptError
                            }
                          </div>
                        )}

                        {receiptMessage && (
                          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            {
                              receiptMessage
                            }
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={
                            uploadingReceipt ||
                            !newReceiptFile
                          }
                          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0B5D3B] px-5 text-sm font-semibold text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {uploadingReceipt
                            ? t.sendingReceipt
                            : t.sendReceipt}
                        </button>
                      </form>
                    </div>
                  )}

                  {result.policy
                    .available ? (
                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                      <p className="text-xl font-semibold text-emerald-900">
                        {
                          t.policyAvailable
                        }
                      </p>

                      <p className="mt-2 text-sm text-emerald-700">
                        {
                          t.policyReady
                        }
                      </p>

                      {result
                        .policy
                        .policyNumber && (
                        <p className="mt-3 text-sm text-emerald-700">
                          {
                            t.policyNumber
                          }
                          :{" "}

                          <strong>
                            {
                              result
                                .policy
                                .policyNumber
                            }
                          </strong>
                        </p>
                      )}

                      {result
                        .policy
                        .issueDate && (
                        <p className="mt-2 text-sm text-emerald-700">
                          {
                            t.issueDate
                          }
                          :{" "}

                          {formatDate(
                            result
                              .policy
                              .issueDate,
                            language,
                          )}
                        </p>
                      )}

                      {result
                        .policy
                        .expirationDate && (
                        <p className="mt-2 text-sm text-emerald-700">
                          {
                            t.expiration
                          }
                          :{" "}

                          {formatDate(
                            result
                              .policy
                              .expirationDate,
                            language,
                          )}
                        </p>
                      )}

                      <div className="mt-6">
                        <PolicyDownloadButton
                          requestCode={
                            result
                              .request
                              .requestCode
                          }
                          whatsappCountryCode={
                            whatsappCountryCode
                          }
                          whatsappNumber={
                            whatsappNumber
                          }
                          durationYears={
                            result
                              .request
                              .durationYears ===
                            2
                              ? 2
                              : 1
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 sm:p-6">
                      <p className="font-semibold text-slate-800">
                        {
                          t.policyUnavailable
                        }
                      </p>

                      <p className="mt-2 text-sm text-slate-600">
                        {
                          t.policyUnavailableText
                        }
                      </p>
                    </div>
                  )}

                  <div className="rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC] p-5 sm:p-6">
                    <h3 className="text-lg font-semibold text-[#102B20]">
                      {
                        t.history
                      }
                    </h3>

                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                      <p>
                        <strong>
                          {
                            t.createdAt
                          }
                          :
                        </strong>{" "}

                        {formatDate(
                          result
                            .request
                            .createdAt,
                          language,
                        )}
                      </p>

                      <p>
                        <strong>
                          {
                            t.updatedAt
                          }
                          :
                        </strong>{" "}

                        {formatDate(
                          result
                            .request
                            .updatedAt,
                          language,
                        )}
                      </p>
                    </div>
                  </div>
                </section>
              )}
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {
          label
        }
      </p>

      <p className="mt-2 break-all text-lg font-semibold text-slate-900">
        {
          value
        }
      </p>
    </div>
  );
}