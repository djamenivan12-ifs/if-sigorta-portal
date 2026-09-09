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

  const formEyebrow =
    language === "fr"
      ? "Votre demande"
      : language === "en"
        ? "Your application"
        : "Başvurunuz";

  const sideTitle =
    language === "fr"
      ? "Ajoutez vos documents en toute simplicité."
      : language === "en"
        ? "Upload your documents with ease."
        : "Belgelerinizi kolayca yükleyin.";

  const sideText =
    language === "fr"
      ? "Des documents clairs permettent un traitement plus rapide de votre demande."
      : language === "en"
        ? "Clear documents help us process your application faster."
        : "Belgelerinizin net olması başvurunuzun daha hızlı işlenmesini sağlar.";

  const qualityInfo =
    language === "fr"
      ? "Les photos doivent être nettes, complètes et parfaitement lisibles."
      : language === "en"
        ? "Photos must be sharp, complete and perfectly readable."
        : "Fotoğraflar net, eksiksiz ve tamamen okunabilir olmalıdır.";

  const fileInfo =
    language === "fr"
      ? "Formats acceptés : photo ou PDF."
      : language === "en"
        ? "Accepted formats: photo or PDF."
        : "Kabul edilen formatlar: fotoğraf veya PDF.";

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5]">
      {/* TOP BAR */}

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
                  "/demande/etape-2",
                )
              }
              className="hidden text-sm font-semibold text-slate-500 transition hover:text-[#0B5D3B] sm:block"
            >
              {t.backStep2}
            </button>
          </div>
        </div>
      </div>

      {/* PAGE */}

      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-14">
        <div className="grid min-w-0 gap-5 sm:gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-10 xl:gap-14">
          {/* LEFT PANEL */}

          <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
            <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] bg-[#123F2C] px-5 py-6 text-white sm:rounded-[2rem] sm:px-8 sm:py-8 lg:min-h-[590px] lg:px-8 lg:py-10">
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
                    <div className="h-full w-3/5 rounded-full bg-[#B8E83D]" />
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
                      {qualityInfo}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white">
                      ✓
                    </div>

                    <p className="text-sm leading-6 text-white/70">
                      {fileInfo}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* DOCUMENTS */}

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

            {!requestData.hasKimlik && (
              <div className="mt-6 rounded-2xl border border-[#D9E9D9] bg-[#F3F8F2] px-4 py-3.5 text-sm leading-6 text-[#31513B]">
                {t.noKimlikInfo}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-6 sm:mt-9 sm:space-y-7"
            >
              {/* PASSPORT */}

              <section className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC] p-4 sm:p-5">
                <div className="mb-4 flex min-w-0 items-start justify-between gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                      01
                    </p>

                    <h2 className="mt-1 text-lg font-semibold text-slate-900">
                      {t.passport}
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {t.passportDescription}
                    </p>
                  </div>

                  <div
                    className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      passportIsPresent
                        ? "bg-[#0B5D3B] text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {passportIsPresent ? "✓" : "1"}
                  </div>
                </div>

                <DocumentUploader
                  label={t.passport}
                  description={t.passportDescription}
                  file={requestData.passportFile}
                  language={language}
                  onChange={(passportFile) =>
                    updateRequestData({
                      passportFile,
                    })
                  }
                />
              </section>

              {/* KIMLIK DOCUMENTS */}

              {requestData.hasKimlik && (
                <>
                  <section className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC] p-4 sm:p-5">
                    <div className="mb-4 flex min-w-0 items-start justify-between gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                          02
                        </p>

                        <h2 className="mt-1 text-lg font-semibold text-slate-900">
                          {t.kimlikFront}
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {t.kimlikFrontDescription}
                        </p>
                      </div>

                      <div
                        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                          requestData.kimlikFrontFile
                            ? "bg-[#0B5D3B] text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {requestData.kimlikFrontFile ? "✓" : "2"}
                      </div>
                    </div>

                    <DocumentUploader
                      label={t.kimlikFront}
                      description={t.kimlikFrontDescription}
                      file={requestData.kimlikFrontFile}
                      language={language}
                      onChange={(kimlikFrontFile) =>
                        updateRequestData({
                          kimlikFrontFile,
                        })
                      }
                    />
                  </section>

                  <section className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-[#FCFDFC] p-4 sm:p-5">
                    <div className="mb-4 flex min-w-0 items-start justify-between gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                          03
                        </p>

                        <h2 className="mt-1 text-lg font-semibold text-slate-900">
                          {t.kimlikBack}
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {t.kimlikBackDescription}
                        </p>
                      </div>

                      <div
                        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                          requestData.kimlikBackFile
                            ? "bg-[#0B5D3B] text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {requestData.kimlikBackFile ? "✓" : "3"}
                      </div>
                    </div>

                    <DocumentUploader
                      label={t.kimlikBack}
                      description={t.kimlikBackDescription}
                      file={requestData.kimlikBackFile}
                      language={language}
                      onChange={(kimlikBackFile) =>
                        updateRequestData({
                          kimlikBackFile,
                        })
                      }
                    />
                  </section>
                </>
              )}

              {/* STATUS */}

              <div
                className={`rounded-2xl border px-4 py-4 text-sm font-semibold leading-6 ${
                  documentsAreComplete
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
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

              {/* ACTIONS */}

              <div className="flex min-w-0 flex-col-reverse gap-3 border-t border-slate-100 pt-7 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/demande/etape-2",
                    )
                  }
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {t.previous}
                </button>

                <button
                  type="submit"
                  disabled={!documentsAreComplete}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0B5D3B] px-7 text-sm font-black text-white shadow-lg shadow-[#0B5D3B]/10 transition hover:-translate-y-0.5 hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {t.next}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}