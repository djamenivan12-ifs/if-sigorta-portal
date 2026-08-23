"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import DocumentUploader from "@/components/DocumentUploader";
import { useInsuranceRequest } from "@/context/InsuranceRequestContext";

type Language =
  | "fr"
  | "en"
  | "tr";

const translations = {
  fr: {
    backStep2:
      "← Retour à l’étape 2",

    step:
      "Étape 3 sur 5",

    title:
      "Documents obligatoires",

    description:
      "Ajoutez des photos lisibles ou des fichiers PDF.",

    noKimlikInfo:
      "Comme vous ne possédez pas encore de Kimlik, seul votre passeport est obligatoire à cette étape.",

    passport:
      "Passeport",

    passportDescription:
      "Page contenant votre photo et vos informations personnelles.",

    kimlikFront:
      "Kimlik recto",

    kimlikFrontDescription:
      "Face avant de votre carte de séjour.",

    kimlikBack:
      "Kimlik verso",

    kimlikBackDescription:
      "Face arrière de votre carte de séjour.",

    completeWithKimlik:
      "✓ Le passeport et les deux faces du Kimlik sont présents.",

    completeWithoutKimlik:
      "✓ Le passeport obligatoire est présent.",

    incompleteWithKimlik:
      "Veuillez ajouter le passeport, le Kimlik recto et le Kimlik verso.",

    incompleteWithoutKimlik:
      "Veuillez ajouter votre passeport.",

    passportRequired:
      "Veuillez ajouter votre passeport.",

    kimlikRequired:
      "Veuillez ajouter le Kimlik recto et le Kimlik verso.",

    previous:
      "← Précédent",

    next:
      "Suivant →",
  },

  en: {
    backStep2:
      "← Back to step 2",

    step:
      "Step 3 of 5",

    title:
      "Required documents",

    description:
      "Upload clear photos or PDF files.",

    noKimlikInfo:
      "Since you do not yet have a Kimlik, only your passport is required at this step.",

    passport:
      "Passport",

    passportDescription:
      "The page containing your photo and personal information.",

    kimlikFront:
      "Kimlik front",

    kimlikFrontDescription:
      "Front side of your residence card.",

    kimlikBack:
      "Kimlik back",

    kimlikBackDescription:
      "Back side of your residence card.",

    completeWithKimlik:
      "✓ Your passport and both sides of your Kimlik have been added.",

    completeWithoutKimlik:
      "✓ Your required passport has been added.",

    incompleteWithKimlik:
      "Please add your passport, the front of your Kimlik and the back of your Kimlik.",

    incompleteWithoutKimlik:
      "Please add your passport.",

    passportRequired:
      "Please add your passport.",

    kimlikRequired:
      "Please add the front and back of your Kimlik.",

    previous:
      "← Previous",

    next:
      "Next →",
  },

  tr: {
    backStep2:
      "← 2. adıma dön",

    step:
      "5 adımın 3.'sü",

    title:
      "Zorunlu belgeler",

    description:
      "Okunaklı fotoğraflar veya PDF dosyaları yükleyin.",

    noKimlikInfo:
      "Henüz Kimliğiniz olmadığı için bu adımda yalnızca pasaportunuz zorunludur.",

    passport:
      "Pasaport",

    passportDescription:
      "Fotoğrafınızın ve kişisel bilgilerinizin bulunduğu sayfa.",

    kimlikFront:
      "Kimlik ön yüz",

    kimlikFrontDescription:
      "İkamet kartınızın ön yüzü.",

    kimlikBack:
      "Kimlik arka yüz",

    kimlikBackDescription:
      "İkamet kartınızın arka yüzü.",

    completeWithKimlik:
      "✓ Pasaport ve Kimliğin her iki yüzü eklendi.",

    completeWithoutKimlik:
      "✓ Zorunlu pasaport eklendi.",

    incompleteWithKimlik:
      "Lütfen pasaportu, Kimlik ön yüzünü ve Kimlik arka yüzünü ekleyin.",

    incompleteWithoutKimlik:
      "Lütfen pasaportunuzu ekleyin.",

    passportRequired:
      "Lütfen pasaportunuzu ekleyin.",

    kimlikRequired:
      "Lütfen Kimlik ön ve arka yüzünü ekleyin.",

    previous:
      "← Önceki",

    next:
      "İleri →",
  },
};

export default function Etape3Page() {
  const router =
    useRouter();

  const {
    requestData,
    updateRequestData,
  } =
    useInsuranceRequest();

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

  const passportIsPresent =
    requestData.passportFile !==
    null;

  const kimlikDocumentsArePresent =
    requestData.kimlikFrontFile !==
      null &&
    requestData.kimlikBackFile !==
      null;

  const documentsAreComplete =
    passportIsPresent &&
    (
      !requestData.hasKimlik ||
      kimlikDocumentsArePresent
    );

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!passportIsPresent) {
      alert(
        t.passportRequired,
      );

      return;
    }

    if (
      requestData.hasKimlik &&
      !kimlikDocumentsArePresent
    ) {
      alert(
        t.kimlikRequired,
      );

      return;
    }

    router.push(
      "/demande/etape-4",
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/demande/etape-2",
            )
          }
          className="mb-6 font-medium text-blue-700 hover:underline"
        >
          {
            t.backStep2
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
              <div className="h-full w-3/5 rounded-full bg-blue-700" />
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

          {!requestData.hasKimlik && (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
              {
                t.noKimlikInfo
              }
            </div>
          )}

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-8 space-y-6"
          >
            <DocumentUploader
              label={
                t.passport
              }
              description={
                t.passportDescription
              }
              file={
                requestData.passportFile
              }
              onChange={(
                passportFile,
              ) =>
                updateRequestData({
                  passportFile,
                })
              }
            />

            {requestData.hasKimlik && (
              <>
                <DocumentUploader
                  label={
                    t.kimlikFront
                  }
                  description={
                    t.kimlikFrontDescription
                  }
                  file={
                    requestData.kimlikFrontFile
                  }
                  onChange={(
                    kimlikFrontFile,
                  ) =>
                    updateRequestData({
                      kimlikFrontFile,
                    })
                  }
                />

                <DocumentUploader
                  label={
                    t.kimlikBack
                  }
                  description={
                    t.kimlikBackDescription
                  }
                  file={
                    requestData.kimlikBackFile
                  }
                  onChange={(
                    kimlikBackFile,
                  ) =>
                    updateRequestData({
                      kimlikBackFile,
                    })
                  }
                />
              </>
            )}

            <div
              className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                documentsAreComplete
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {documentsAreComplete
                ? requestData.hasKimlik
                  ? t.completeWithKimlik
                  : t.completeWithoutKimlik
                : requestData.hasKimlik
                  ? t.incompleteWithKimlik
                  : t.incompleteWithoutKimlik}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/demande/etape-2",
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
                  !documentsAreComplete
                }
                className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {
                  t.next
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}