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

    /*
     * ============================================
     * ANNULATION DE L'ANCIEN DOSSIER
     * ============================================
     *
     * Si un dossier waiting_payment avait déjà
     * été créé puis que le client a modifié ses
     * informations, le contexte conserve son
     * ancienne référence dans pendingCancellation.
     *
     * On annule ce dossier avant d'en créer un
     * nouveau afin d'éviter les dossiers abandonnés.
     */
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

    /*
     * Si le dossier a déjà été créé pendant
     * cette session, on ne le crée pas une
     * seconde fois lorsque le client revient
     * sur l'étape 4.
     */
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

      const formData =
        new FormData();

      formData.append(
        "payload",
        JSON.stringify(
          payload,
        ),
      );

      formData.append(
        "passportFile",
        requestData.passportFile,
      );

      if (
        requestData.hasKimlik &&
        requestData.kimlikFrontFile &&
        requestData.kimlikBackFile
      ) {
        formData.append(
          "kimlikFrontFile",
          requestData.kimlikFrontFile,
        );

        formData.append(
          "kimlikBackFile",
          requestData.kimlikBackFile,
        );
      }

      const response =
        await fetch(
          "/api/requests",
          {
            method:
              "POST",

            body:
              formData,
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/demande/etape-3",
            )
          }
          className="mb-6 font-medium text-blue-700 hover:underline"
        >
          {
            t.backStep3
          }
        </button>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold text-blue-700">
              {
                t.step
              }
            </p>

            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-4/5 rounded-full bg-blue-700" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            {
              t.title
            }
          </h1>

          <p className="mt-2 text-slate-600">
            {
              t.description
            }
          </p>

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-8 space-y-6"
          >
            <section className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-900">
                  {
                    t.personalInfo
                  }
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/demande/etape-1",
                    )
                  }
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  {
                    t.edit
                  }
                </button>
              </div>

              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-slate-500">
                    {
                      t.lastName
                    }
                  </dt>

                  <dd className="font-semibold text-slate-900">
                    {
                      requestData.lastName
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    {
                      t.firstName
                    }
                  </dt>

                  <dd className="font-semibold text-slate-900">
                    {
                      requestData.firstName
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    {
                      t.fatherName
                    }
                  </dt>

                  <dd className="font-semibold text-slate-900">
                    {
                      requestData.fatherName
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    {
                      t.birthDate
                    }
                  </dt>

                  <dd className="font-semibold text-slate-900">
                    {
                      requestData.birthDate
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    {
                      t.gender
                    }
                  </dt>

                  <dd className="font-semibold text-slate-900">
                    {
                      genderLabel
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    {
                      t.nationality
                    }
                  </dt>

                  <dd className="font-semibold text-slate-900">
                    {
                      requestData.nationality
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    {
                      t.whatsapp
                    }
                  </dt>

                  <dd className="font-semibold text-slate-900">
                    {
                      requestData.whatsappCountryCode
                    }{" "}
                    {
                      requestData.whatsappNumber
                    }
                  </dd>
                </div>
              </dl>

              <div className="mt-5 border-t border-slate-200 pt-5">
                <p className="text-sm text-slate-500">
                  {
                    t.address
                  }
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {loadingAddress
                    ? t.loadingAddress
                    : completeAddress ||
                      "—"}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-900">
                  {
                    t.identityInsurance
                  }
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/demande/etape-2",
                    )
                  }
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  {
                    t.edit
                  }
                </button>
              </div>

              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-slate-500">
                    {
                      t.kimlikNumber
                    }
                  </dt>

                  <dd className="font-semibold text-slate-900">
                    {requestData.hasKimlik
                      ? requestData.kimlikNumber ||
                        "—"
                      : t.notApplicable}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    {
                      t.kimlikExpiration
                    }
                  </dt>

                  <dd className="font-semibold text-slate-900">
                    {requestData.hasKimlik
                      ? requestData.kimlikExpirationDate ||
                        "—"
                      : t.notApplicable}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    {
                      t.passportNumber
                    }
                  </dt>

                  <dd className="font-semibold text-slate-900">
                    {
                      requestData.passportNumber
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    {
                      t.retainedAge
                    }
                  </dt>

                  <dd className="font-semibold text-slate-900">
                    {
                      ageLabel
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    {
                      t.duration
                    }
                  </dt>

                  <dd className="font-semibold text-slate-900">
                    {
                      durationLabel
                    }
                  </dd>
                </div>
              </dl>

              <div className="mt-5 rounded-xl bg-blue-50 p-5">
                <p className="text-sm text-slate-600">
                  {
                    t.totalPrice
                  }
                </p>

                <p className="mt-1 text-4xl font-bold text-blue-700">
                  {requestData.calculatedPrice?.toLocaleString(
                    priceLocale,
                  ) ?? "—"}{" "}
                  TL
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-900">
                  {
                    t.documents
                  }
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/demande/etape-3",
                    )
                  }
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  {
                    t.edit
                  }
                </button>
              </div>

              <div className="space-y-3">
                <DocumentRow
                  label={
                    t.passport
                  }
                  file={
                    requestData.passportFile
                  }
                  addedLabel={
                    t.added
                  }
                  missingLabel={
                    t.missing
                  }
                  missingDocumentLabel={
                    t.documentMissing
                  }
                />

                {requestData.hasKimlik && (
                  <>
                    <DocumentRow
                      label={
                        t.kimlikFront
                      }
                      file={
                        requestData.kimlikFrontFile
                      }
                      addedLabel={
                        t.added
                      }
                      missingLabel={
                        t.missing
                      }
                      missingDocumentLabel={
                        t.documentMissing
                      }
                    />

                    <DocumentRow
                      label={
                        t.kimlikBack
                      }
                      file={
                        requestData.kimlikBackFile
                      }
                      addedLabel={
                        t.added
                      }
                      missingLabel={
                        t.missing
                      }
                      missingDocumentLabel={
                        t.documentMissing
                      }
                    />
                  </>
                )}
              </div>
            </section>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-300 bg-slate-50 p-5">
              <input
                type="checkbox"
                checked={
                  confirmed
                }
                onChange={(
                  event,
                ) =>
                  setConfirmed(
                    event.target.checked,
                  )
                }
                className="mt-1 h-5 w-5"
              />

              <span className="text-sm leading-6 text-slate-700">
                {
                  t.confirmation
                }
              </span>
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/demande/etape-3",
                  )
                }
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                {
                  t.previous
                }
              </button>

              <button
                type="submit"
                disabled={
                  !confirmed ||
                  isSubmitting
                }
                className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting
                  ? "..."
                  : t.continuePayment}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

type DocumentRowProps = {
  label: string;
  file: File | null;
  addedLabel: string;
  missingLabel: string;
  missingDocumentLabel: string;
};

function DocumentRow({
  label,
  file,
  addedLabel,
  missingLabel,
  missingDocumentLabel,
}: DocumentRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">
          {
            label
          }
        </p>

        <p className="truncate text-sm text-slate-500">
          {file?.name ??
            missingDocumentLabel}
        </p>
      </div>

      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
          file
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {file
          ? addedLabel
          : missingLabel}
      </span>
    </div>
  );
}