"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { useInsuranceRequest } from "@/context/InsuranceRequestContext";
import { createClient } from "@/lib/supabase/client";

type Language =
  | "fr"
  | "en"
  | "tr";

type AddressNames = {
  province: string;
  district: string;
  neighborhood: string;
};

type DocumentType =
  | "passport"
  | "kimlik_front"
  | "kimlik_back";

type UploadedDocument = {
  documentType: DocumentType;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
};

type UploadUrlResponse = {
  success?: boolean;
  uploadSessionId?: string;
  documentType?: DocumentType;
  storagePath?: string;
  token?: string;
  error?: string;
};

const translations = {
  fr: {
    backStep3:
      "← Retour à l’étape 3",
    step:
      "Étape 4 sur 5",
    title:
      "Vérifiez votre demande",
    description:
      "Vérifiez attentivement les informations avant de continuer vers le paiement.",
    personalInfo:
      "Informations personnelles",
    edit:
      "Modifier",
    lastName:
      "Nom",
    firstName:
      "Prénom",
    fatherName:
      "Nom du père",
    birthDate:
      "Date de naissance",
    gender:
      "Sexe",
    male:
      "Homme",
    female:
      "Femme",
    nationality:
      "Nationalité",
    whatsapp:
      "WhatsApp",
    address:
      "Adresse",
    loadingAddress:
      "Chargement de l’adresse...",
    identityInsurance:
      "Identité et assurance",
    kimlikNumber:
      "Numéro de Kimlik",
    kimlikExpiration:
      "Expiration du Kimlik",
    passportNumber:
      "Numéro du passeport",
    retainedAge:
      "Âge retenu",
    duration:
      "Durée",
    year:
      "an",
    years:
      "ans",
    totalPrice:
      "Prix total",
    documents:
      "Documents",
    passport:
      "Passeport",
    kimlikFront:
      "Kimlik recto",
    kimlikBack:
      "Kimlik verso",
    confirmation:
      "Je confirme que les informations et les documents fournis sont exacts et correspondent à mes documents officiels.",
    previous:
      "← Précédent",
    continuePayment:
      "Continuer vers le paiement →",
    confirmationRequired:
      "Veuillez confirmer que toutes les informations sont exactes.",
    documentMissing:
      "Document absent",
    added:
      "Ajouté",
    missing:
      "Absent",
    notApplicable:
      "Non applicable",
    buildingNumber:
      "Bina No",
    apartmentNumber:
      "Daire No",
  },

  en: {
    backStep3:
      "← Back to step 3",
    step:
      "Step 4 of 5",
    title:
      "Review your request",
    description:
      "Carefully review your information before continuing to payment.",
    personalInfo:
      "Personal information",
    edit:
      "Edit",
    lastName:
      "Surname",
    firstName:
      "First name",
    fatherName:
      "Father's name",
    birthDate:
      "Date of birth",
    gender:
      "Gender",
    male:
      "Male",
    female:
      "Female",
    nationality:
      "Nationality",
    whatsapp:
      "WhatsApp",
    address:
      "Address",
    loadingAddress:
      "Loading address...",
    identityInsurance:
      "Identity and insurance",
    kimlikNumber:
      "Kimlik number",
    kimlikExpiration:
      "Kimlik expiration",
    passportNumber:
      "Passport number",
    retainedAge:
      "Calculated age",
    duration:
      "Duration",
    year:
      "year",
    years:
      "years",
    totalPrice:
      "Total price",
    documents:
      "Documents",
    passport:
      "Passport",
    kimlikFront:
      "Kimlik front",
    kimlikBack:
      "Kimlik back",
    confirmation:
      "I confirm that the information and documents provided are accurate and match my official documents.",
    previous:
      "← Previous",
    continuePayment:
      "Continue to payment →",
    confirmationRequired:
      "Please confirm that all information is correct.",
    documentMissing:
      "Document missing",
    added:
      "Added",
    missing:
      "Missing",
    notApplicable:
      "Not applicable",
    buildingNumber:
      "Building No",
    apartmentNumber:
      "Apartment No",
  },

  tr: {
    backStep3:
      "← 3. adıma dön",
    step:
      "5 adımın 4.'sü",
    title:
      "Başvurunuzu kontrol edin",
    description:
      "Ödemeye devam etmeden önce bilgilerinizi dikkatlice kontrol edin.",
    personalInfo:
      "Kişisel bilgiler",
    edit:
      "Düzenle",
    lastName:
      "Soyad",
    firstName:
      "Ad",
    fatherName:
      "Baba adı",
    birthDate:
      "Doğum tarihi",
    gender:
      "Cinsiyet",
    male:
      "Erkek",
    female:
      "Kadın",
    nationality:
      "Uyruk",
    whatsapp:
      "WhatsApp",
    address:
      "Adres",
    loadingAddress:
      "Adres yükleniyor...",
    identityInsurance:
      "Kimlik ve sigorta",
    kimlikNumber:
      "Kimlik numarası",
    kimlikExpiration:
      "Kimlik son geçerlilik tarihi",
    passportNumber:
      "Pasaport numarası",
    retainedAge:
      "Hesaplanan yaş",
    duration:
      "Süre",
    year:
      "yıl",
    years:
      "yıl",
    totalPrice:
      "Toplam fiyat",
    documents:
      "Belgeler",
    passport:
      "Pasaport",
    kimlikFront:
      "Kimlik ön yüz",
    kimlikBack:
      "Kimlik arka yüz",
    confirmation:
      "Verdiğim bilgilerin ve belgelerin doğru olduğunu ve resmi belgelerimle eşleştiğini onaylıyorum.",
    previous:
      "← Önceki",
    continuePayment:
      "Ödemeye devam et →",
    confirmationRequired:
      "Lütfen tüm bilgilerin doğru olduğunu onaylayın.",
    documentMissing:
      "Belge yok",
    added:
      "Eklendi",
    missing:
      "Eksik",
    notApplicable:
      "Uygulanamaz",
    buildingNumber:
      "Bina No",
    apartmentNumber:
      "Daire No",
  },
};

async function uploadDocumentDirectly({
  file,
  documentType,
  uploadSessionId,
}: {
  file: File;
  documentType: DocumentType;
  uploadSessionId?: string;
}) {
  const response =
    await fetch(
      "/api/requests/upload-url",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            documentType,
            fileName:
              file.name,
            mimeType:
              file.type,
            fileSize:
              file.size,
            uploadSessionId,
          }),
      },
    );

  const result =
    (await response.json()) as UploadUrlResponse;

  if (
    !response.ok ||
    !result.success ||
    !result.uploadSessionId ||
    !result.storagePath ||
    !result.token
  ) {
    throw new Error(
      result.error ||
        "Impossible de préparer le téléversement du document.",
    );
  }

  const supabase =
    createClient();

  const {
    error:
      uploadError,
  } =
    await supabase.storage
      .from(
        "insurance-documents",
      )
      .uploadToSignedUrl(
        result.storagePath,
        result.token,
        file,
        {
          contentType:
            file.type,
          cacheControl:
            "3600",
        },
      );

  if (
    uploadError
  ) {
    throw new Error(
      `Téléversement impossible pour ${documentType} : ${uploadError.message}`,
    );
  }

  const uploadedDocument:
    UploadedDocument = {
      documentType,
      storagePath:
        result.storagePath,
      originalFileName:
        file.name,
      mimeType:
        file.type,
      fileSize:
        file.size,
    };

  return {
    uploadSessionId:
      result.uploadSessionId,

    document:
      uploadedDocument,
  };
}

export default function Etape4Page() {
  const router =
    useRouter();

  const {
    requestData,
    pendingCancellation,
    updateRequestData,
    clearPendingCancellation,
  } =
    useInsuranceRequest();

  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "fr",
    );

  const [
    confirmed,
    setConfirmed,
  ] =
    useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    addressNames,
    setAddressNames,
  ] =
    useState<AddressNames>({
      province: "",
      district: "",
      neighborhood: "",
    });

  const [
    loadingAddress,
    setLoadingAddress,
  ] =
    useState(true);

  useEffect(() => {
    function readSavedLanguage() {
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

  const t =
    translations[
      language
    ];

  function changeLanguage(
    nextLanguage: Language,
  ) {
    setLanguage(nextLanguage);

    window.localStorage.setItem(
      "if-sigorta-language",
      nextLanguage,
    );

    window.dispatchEvent(
      new CustomEvent(
        "if-sigorta-language-change",
        {
          detail: {
            language: nextLanguage,
          },
        },
      ),
    );
  }

  useEffect(() => {
    async function loadAddressNames() {
      if (
        !requestData.address.provinceId ||
        !requestData.address.districtId ||
        !requestData.address.neighborhoodId
      ) {
        setLoadingAddress(
          false,
        );

        return;
      }

      setLoadingAddress(
        true,
      );

      const supabase =
        createClient();

      const [
        provinceResult,
        districtResult,
        neighborhoodResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "provinces",
            )
            .select(
              "name",
            )
            .eq(
              "id",
              Number(
                requestData.address.provinceId,
              ),
            )
            .single(),

          supabase
            .from(
              "districts",
            )
            .select(
              "name",
            )
            .eq(
              "id",
              Number(
                requestData.address.districtId,
              ),
            )
            .single(),

          supabase
            .from(
              "neighborhoods",
            )
            .select(
              "name",
            )
            .eq(
              "id",
              Number(
                requestData.address.neighborhoodId,
              ),
            )
            .single(),
        ]);

      setAddressNames({
        province:
          provinceResult.data?.name ??
          "",

        district:
          districtResult.data?.name ??
          "",

        neighborhood:
          neighborhoodResult.data?.name ??
          "",
      });

      setLoadingAddress(
        false,
      );
    }

    void loadAddressNames();
  }, [
    requestData.address.provinceId,
    requestData.address.districtId,
    requestData.address.neighborhoodId,
  ]);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!confirmed) {
      alert(
        t.confirmationRequired,
      );

      return;
    }

    if (
      pendingCancellation
    ) {
      setIsSubmitting(
        true,
      );

      try {
        const cancelResponse =
          await fetch(
            `/api/requests/${encodeURIComponent(
              pendingCancellation.requestId,
            )}/cancel`,
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
                    pendingCancellation.requestCode,

                  whatsappCountryCode:
                    pendingCancellation.whatsappCountryCode,

                  whatsappNumber:
                    pendingCancellation.whatsappNumber,
                }),
            },
          );

        const cancelContentType =
          cancelResponse.headers.get(
            "content-type",
          ) ?? "";

        if (
          !cancelContentType.includes(
            "application/json",
          )
        ) {
          throw new Error(
            `Erreur lors de l'annulation de l'ancien dossier (${cancelResponse.status}).`,
          );
        }

        const cancelResult =
          (await cancelResponse.json()) as {
            success?: boolean;
            error?: string;
          };

        if (
          !cancelResponse.ok ||
          !cancelResult.success
        ) {
          throw new Error(
            cancelResult.error ||
              "L'ancien dossier n'a pas pu être annulé.",
          );
        }

        clearPendingCancellation();
      } catch (error) {
        console.error(
          "Erreur annulation ancien dossier :",
          error,
        );

        alert(
          error instanceof Error
            ? error.message
            : "Impossible d'annuler l'ancien dossier.",
        );

        setIsSubmitting(
          false,
        );

        return;
      }

      setIsSubmitting(
        false,
      );
    }

    if (
      requestData.requestId &&
      requestData.requestCode
    ) {
      router.push(
        "/demande/etape-5",
      );

      return;
    }

    if (
      !requestData.passportFile
    ) {
      alert(
        t.documentMissing,
      );

      return;
    }

    if (
      requestData.hasKimlik &&
      (
        !requestData.kimlikFrontFile ||
        !requestData.kimlikBackFile
      )
    ) {
      alert(
        t.documentMissing,
      );

      return;
    }

    setIsSubmitting(true);

    try {
      console.log(
  "ADRESSE ENVOYÉE :",
  requestData.address,
);
      const payload = {
        preferredLanguage:
          language,

        lastName:
          requestData.lastName,

        firstName:
          requestData.firstName,

        fatherName:
          requestData.fatherName,

        birthDate:
          requestData.birthDate,

        gender:
          requestData.gender,

        nationality:
          requestData.nationality,

        whatsappCountryCode:
          requestData.whatsappCountryCode,

        whatsappNumber:
          requestData.whatsappNumber,

        address:
          requestData.address,

        hasKimlik:
          requestData.hasKimlik,

        kimlikNumber:
          requestData.hasKimlik
            ? requestData.kimlikNumber
            : "",

        kimlikExpirationDate:
          requestData.hasKimlik
            ? requestData.kimlikExpirationDate
            : "",

        insuranceStartDate:
          requestData.hasKimlik
            ? ""
            : requestData.insuranceStartDate,

        passportNumber:
          requestData.passportNumber,

        duration:
          requestData.duration,

        calculatedAge:
          requestData.calculatedAge,

        calculatedPrice:
          requestData.calculatedPrice,
      };

      let uploadSessionId:
        string | undefined;

      const documents:
        UploadedDocument[] = [];

      const passportUpload =
        await uploadDocumentDirectly({
          file:
            requestData.passportFile,

          documentType:
            "passport",

          uploadSessionId,
        });

      uploadSessionId =
        passportUpload.uploadSessionId;

      documents.push(
        passportUpload.document,
      );

      if (
        requestData.hasKimlik &&
        requestData.kimlikFrontFile &&
        requestData.kimlikBackFile
      ) {
        const kimlikFrontUpload =
          await uploadDocumentDirectly({
            file:
              requestData.kimlikFrontFile,

            documentType:
              "kimlik_front",

            uploadSessionId,
          });

        uploadSessionId =
          kimlikFrontUpload.uploadSessionId;

        documents.push(
          kimlikFrontUpload.document,
        );

        const kimlikBackUpload =
          await uploadDocumentDirectly({
            file:
              requestData.kimlikBackFile,

            documentType:
              "kimlik_back",

            uploadSessionId,
          });

        uploadSessionId =
          kimlikBackUpload.uploadSessionId;

        documents.push(
          kimlikBackUpload.document,
        );
      }

      if (
        !uploadSessionId
      ) {
        throw new Error(
          "La session de téléversement n’a pas pu être créée.",
        );
      }

      const response =
        await fetch(
          "/api/requests",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                payload,
                uploadSessionId,
                documents,
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
        throw new Error(
          `Erreur serveur (${response.status}).`,
        );
      }

      const result =
        (await response.json()) as {
          success?: boolean;
          requestId?: string;
          requestCode?: string;
          status?: string;
          error?: string;
        };

      if (
        !response.ok ||
        !result.success ||
        !result.requestId ||
        !result.requestCode
      ) {
        throw new Error(
          result.error ||
            "Le dossier n'a pas pu être créé.",
        );
      }

      updateRequestData({
        requestId:
          result.requestId,

        requestCode:
          result.requestCode,
      });

      router.push(
        "/demande/etape-5",
      );
    } catch (error) {
      console.error(
        "Erreur création dossier :",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const completeAddress = [
    addressNames.neighborhood,
    requestData.address.street,

    requestData.address.buildingNumber
      ? `${t.buildingNumber}: ${requestData.address.buildingNumber}`
      : null,

    requestData.address.apartmentNumber
      ? `${t.apartmentNumber}: ${requestData.address.apartmentNumber}`
      : null,

    addressNames.district,
    addressNames.province,
  ]
    .filter(Boolean)
    .join(", ");

  const genderLabel =
    requestData.gender === "male"
      ? t.male
      : requestData.gender === "female"
        ? t.female
        : "";

  const ageLabel =
    requestData.calculatedAge ===
    null
      ? "—"
      : `${requestData.calculatedAge} ${
          requestData.calculatedAge >
          1
            ? t.years
            : t.year
        }`;

  const durationLabel =
    `${requestData.duration} ${
      requestData.duration === 2
        ? t.years
        : t.year
    }`;

  const priceLocale =
    language === "en"
      ? "en-US"
      : language === "tr"
        ? "tr-TR"
        : "fr-FR";

  const formEyebrow =
    language === "fr"
      ? "Votre demande"
      : language === "en"
        ? "Your application"
        : "Başvurunuz";

  const sideTitle =
    language === "fr"
      ? "Un dernier contrôle avant le paiement."
      : language === "en"
        ? "One final check before payment."
        : "Ödemeden önce son bir kontrol.";

  const sideText =
    language === "fr"
      ? "Relisez vos informations et vérifiez que chaque document correspond bien à votre dossier."
      : language === "en"
        ? "Review your information and make sure each document matches your application."
        : "Bilgilerinizi gözden geçirin ve her belgenin başvurunuzla eşleştiğinden emin olun.";

  const reviewInfo =
    language === "fr"
      ? "Vous pouvez encore modifier vos informations avant de continuer."
      : language === "en"
        ? "You can still edit your information before continuing."
        : "Devam etmeden önce bilgilerinizi hâlâ düzenleyebilirsiniz.";

  const paymentInfo =
    language === "fr"
      ? "Aucun paiement n’est lancé tant que vous n’avez pas confirmé cette page."
      : language === "en"
        ? "No payment starts until you confirm this page."
        : "Bu sayfayı onaylamadan ödeme işlemi başlamaz.";

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5]">
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <a
            href="/"
            className="flex shrink-0 items-center"
            aria-label="IF Sigorta"
          >
            <img
              src="/if-sigorta-logo-light.png"
              alt="IF Sigorta"
              className="h-[58px] w-auto max-w-[170px] object-contain object-left sm:h-[72px] sm:max-w-none lg:h-[82px]"
            />
          </a>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(
                [
                  "fr",
                  "en",
                  "tr",
                ] as Language[]
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    changeLanguage(item)
                  }
                  className={[
                    "rounded-lg px-2 py-1.5 text-[10px] font-black uppercase transition sm:px-3 sm:text-[11px]",
                    language === item
                      ? "bg-white text-[#0B5D3B] shadow-sm"
                      : "text-slate-400 hover:text-slate-700",
                  ].join(" ")}
                >
                  {item}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/demande/etape-3",
                )
              }
              className="hidden text-sm font-semibold text-slate-500 transition hover:text-[#0B5D3B] sm:block"
            >
              {t.backStep3}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-14">
        <div className="grid min-w-0 gap-5 sm:gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-10 xl:gap-14">
          <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
            <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] bg-[#123F2C] px-5 py-6 text-white sm:rounded-[2rem] sm:px-8 sm:py-8 lg:min-h-[650px] lg:px-8 lg:py-10">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#B8E83D]/10" />
              <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-white/5" />

              <div className="relative z-10 flex h-full flex-col">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B8E83D]">
                    {formEyebrow}
                  </p>

                  <p className="mt-4 text-sm font-semibold text-white/60">
                    {t.step}
                  </p>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full w-4/5 rounded-full bg-[#B8E83D]" />
                  </div>

                  <h2 className="mt-6 max-w-sm text-[1.75rem] font-semibold leading-[1.08] tracking-[-0.04em] sm:mt-8 sm:text-4xl">
                    {sideTitle}
                  </h2>

                  <p className="mt-5 max-w-sm text-sm leading-7 text-white/65 sm:text-base">
                    {sideText}
                  </p>
                </div>

                <div className="mt-7 space-y-4 sm:mt-10 lg:mt-auto">
                  <div className="flex gap-3 border-t border-white/10 pt-5">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B8E83D] text-xs font-black text-[#15311F]">
                      ✓
                    </div>

                    <p className="text-sm leading-6 text-white/70">
                      {reviewInfo}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white">
                      ✓
                    </div>

                    <p className="text-sm leading-6 text-white/70">
                      {paymentInfo}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="min-w-0 rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.24)] sm:rounded-[2rem] sm:p-8 lg:p-10">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B5D3B]">
                {t.step}
              </p>

              <h1 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-[-0.04em] text-[#102B20] sm:text-4xl">
                {t.title}
              </h1>

              <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                {t.description}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-9 space-y-6"
            >
              <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC]">
                <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:gap-4 sm:px-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                      01
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      {t.personalInfo}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/demande/etape-1",
                      )
                    }
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#EEF6EC]"
                  >
                    {t.edit}
                  </button>
                </div>

                <dl className="grid min-w-0 gap-x-6 gap-y-5 p-4 sm:grid-cols-2 sm:p-6">
                  <ReviewItem
                    label={t.lastName}
                    value={requestData.lastName}
                  />

                  <ReviewItem
                    label={t.firstName}
                    value={requestData.firstName}
                  />

                  <ReviewItem
                    label={t.fatherName}
                    value={requestData.fatherName}
                  />

                  <ReviewItem
                    label={t.birthDate}
                    value={requestData.birthDate}
                  />

                  <ReviewItem
                    label={t.gender}
                    value={genderLabel}
                  />

                  <ReviewItem
                    label={t.nationality}
                    value={requestData.nationality}
                  />

                  <ReviewItem
                    label={t.whatsapp}
                    value={`${requestData.whatsappCountryCode} ${requestData.whatsappNumber}`.trim()}
                  />
                </dl>

                <div className="min-w-0 border-t border-slate-100 px-4 py-5 sm:px-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {t.address}
                  </p>

                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                    {loadingAddress
                      ? t.loadingAddress
                      : completeAddress || "—"}
                  </p>
                </div>
              </section>

              <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC]">
                <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:gap-4 sm:px-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                      02
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      {t.identityInsurance}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/demande/etape-2",
                      )
                    }
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#EEF6EC]"
                  >
                    {t.edit}
                  </button>
                </div>

                <dl className="grid min-w-0 gap-x-6 gap-y-5 p-4 sm:grid-cols-2 sm:p-6">
                  <ReviewItem
                    label={t.passportNumber}
                    value={requestData.passportNumber}
                  />

                  {requestData.hasKimlik ? (
                    <>
                      <ReviewItem
                        label={t.kimlikNumber}
                        value={requestData.kimlikNumber}
                      />

                      <ReviewItem
                        label={t.kimlikExpiration}
                        value={requestData.kimlikExpirationDate}
                      />
                    </>
                  ) : null}

                  <ReviewItem
                    label={t.retainedAge}
                    value={ageLabel}
                  />

                  <ReviewItem
                    label={t.duration}
                    value={durationLabel}
                  />

                  <ReviewItem
                    label={t.totalPrice}
                    value={`${Number(
                      requestData.calculatedPrice ?? 0,
                    ).toLocaleString(
                      priceLocale,
                    )} TL`}
                  />
                </dl>
              </section>

              <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC]">
                <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:gap-4 sm:px-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                      03
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      {t.documents}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/demande/etape-3",
                      )
                    }
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#EEF6EC]"
                  >
                    {t.edit}
                  </button>
                </div>

                <div className="min-w-0 space-y-3 p-4 sm:p-6">
                  <DocumentStatus
                    label={t.passport}
                    available={
                      Boolean(
                        requestData.passportFile,
                      )
                    }
                    added={t.added}
                    missing={t.missing}
                  />

                  {requestData.hasKimlik ? (
                    <>
                      <DocumentStatus
                        label={t.kimlikFront}
                        available={
                          Boolean(
                            requestData.kimlikFrontFile,
                          )
                        }
                        added={t.added}
                        missing={t.missing}
                      />

                      <DocumentStatus
                        label={t.kimlikBack}
                        available={
                          Boolean(
                            requestData.kimlikBackFile,
                          )
                        }
                        added={t.added}
                        missing={t.missing}
                      />
                    </>
                  ) : (
                    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:gap-4 sm:px-4">
                      <span className="text-sm font-semibold text-slate-700">
                        Kimlik
                      </span>

                      <span className="text-sm font-medium text-slate-500">
                        {t.notApplicable}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-[1.5rem] border border-[#D9E9D9] bg-[#F3F8F2] p-4 sm:p-5">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) =>
                    setConfirmed(
                      event.target.checked,
                    )
                  }
                  className="mt-1 h-4 w-4 accent-[#0B5D3B]"
                />

                <span className="text-sm leading-6 text-[#365742]">
                  {t.confirmation}
                </span>
              </label>

              <div className="flex min-w-0 flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/demande/etape-3",
                    )
                  }
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {t.previous}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0B5D3B] px-6 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSubmitting
                    ? "Envoi..."
                    : t.continuePayment}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | null
    | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </dt>

      <dd className="mt-1.5 break-words text-sm font-semibold text-slate-800">
        {value === null ||
        value === undefined ||
        value === ""
          ? "—"
          : value}
      </dd>
    </div>
  );
}

function DocumentStatus({
  label,
  available,
  added,
  missing,
}: {
  label: string;
  available: boolean;
  added: string;
  missing: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:gap-4 sm:px-4">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>

      <span
        className={
          available
            ? "text-sm font-semibold text-[#0B5D3B]"
            : "text-sm font-semibold text-red-600"
        }
      >
        {available
          ? `✓ ${added}`
          : missing}
      </span>
    </div>
  );
}