"use client";

import Link from "next/link";
import TrackRequestForm from "@/components/home/TrackRequestForm";
import HomeHeader from "@/components/home/HomeHeader";

import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Globe2,
  Headphones,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

type Language =
  | "fr"
  | "en"
  | "tr";

const translations = {
  fr: {
    heroBadge:
      "Assurance santé pour étrangers en Turquie",
    heroTitle1:
      "Votre assurance santé en Turquie,",
    heroTitle2:
      "simple et rapide.",
    heroText:
      "Faites votre demande en ligne, transmettez vos documents, suivez votre dossier et recevez votre assurance sans déplacement.",
    getInsurance:
      "Obtenir mon assurance",
    track:
      "Suivre mon dossier",
    quickRequest:
      "Demande rapide",
    onlineTracking:
      "Suivi en ligne",
    whatsappSupport:
      "Assistance WhatsApp",

    status:
      "Statut",
    paymentVerified:
      "Paiement vérifié",
    processing:
      "Traitement",
    fullyOnline:
      "100 % en ligne",
    clientSpace:
      "Espace client",
    inProgress:
      "En cours",
    progress:
      "Progression du dossier",
    step4of5:
      "Étape 4 sur 5",
    personalInfo:
      "Informations personnelles",
    documents:
      "Documents",
    payment:
      "Paiement",
    policyPreparation:
      "Préparation de l’assurance",
    policyAvailable:
      "Assurance disponible",
    nextStep:
      "Prochaine étape",
    policyBeingPrepared:
      "Votre assurance est en cours de préparation.",

    fast:
      "Rapide",
    fastDesc:
      "Demande en quelques minutes",
    secure:
      "Sécurisé",
    secureDesc:
      "Documents protégés",
    transparent:
      "Transparent",
    transparentDesc:
      "Suivi étape par étape",
    accessible:
      "Accessible",
    accessibleDesc:
      "Assistance en ligne",

    simpleFromStart:
      "Simple du début à la fin",
    fourSteps:
      "Votre assurance en quatre étapes",
    fourStepsDesc:
      "Un parcours clair, pensé pour vous éviter les démarches compliquées.",

    step1Title:
      "Remplissez votre demande",
    step1Desc:
      "Renseignez vos informations personnelles et les détails nécessaires à votre assurance.",
    step2Title:
      "Ajoutez vos documents",
    step2Desc:
      "Téléversez votre passeport et votre Kimlik depuis votre téléphone ou votre ordinateur.",
    step3Title:
      "Effectuez le paiement",
    step3Desc:
      "Envoyez votre preuve de paiement directement depuis votre espace de demande.",
    step4Title:
      "Recevez votre assurance",
    step4Desc:
      "Une fois votre dossier traité, votre police devient disponible en téléchargement.",

    designedForYou:
      "Pensé pour vous",
    digitalExperience:
      "Une expérience digitale claire et rassurante",
    digitalExperienceDesc:
      "IF Sigorta centralise votre demande, vos documents et votre assurance dans un parcours simple.",
    startRequest:
      "Commencer ma demande",

    feature1Title:
      "100 % en ligne",
    feature1Desc:
      "Faites votre demande sans déplacement et suivez votre dossier depuis n’importe où.",
    feature2Title:
      "Documents sécurisés",
    feature2Desc:
      "Vos informations et vos documents sont centralisés dans un environnement sécurisé.",
    feature3Title:
      "Suivi transparent",
    feature3Desc:
      "Consultez l’avancement de votre dossier à chaque étape.",
    feature4Title:
      "Assistance humaine",
    feature4Desc:
      "Notre équipe reste disponible pour vous accompagner en cas de besoin.",

    alreadyClient:
      "Déjà client ?",
    trackSeconds:
      "Suivez votre dossier en quelques secondes",
    trackDesc:
      "Utilisez votre code IF Sigorta pour consulter l’état actuel de votre demande.",
    requestCode:
      "Code de dossier",

    prepareFile:
      "Préparez votre dossier",
    fewDocuments:
      "Seulement quelques documents",
    passport:
      "Passeport",
    passportDesc:
      "Photo ou PDF lisible",
    kimlikFront:
      "Kimlik recto",
    kimlikFrontDesc:
      "Photo claire du recto",
    kimlikBack:
      "Kimlik verso",
    kimlikBackDesc:
      "Photo claire du verso",

    needHelp:
      "Besoin d’aide ?",
    helpDesc:
      "Notre équipe peut vous accompagner pendant votre demande.",
    contact:
      "Contacter IF Sigorta",

    footerDesc:
      "Assurance santé pour étrangers en Turquie.",
    navigation:
      "Navigation",
    makeRequest:
      "Faire une demande",
    howItWorks:
      "Comment ça marche",
    languages:
      "Langues",
    rights:
      "Tous droits réservés.",
    footerBottom:
      "Assurance santé • Turquie",
  },

  en: {
    heroBadge:
      "Health insurance for foreigners in Türkiye",
    heroTitle1:
      "Your health insurance in Türkiye,",
    heroTitle2:
      "simple and fast.",
    heroText:
      "Apply online, upload your documents, track your request and receive your insurance without visiting an office.",
    getInsurance:
      "Get insured",
    track:
      "Track my request",
    quickRequest:
      "Quick application",
    onlineTracking:
      "Online tracking",
    whatsappSupport:
      "WhatsApp support",

    status:
      "Status",
    paymentVerified:
      "Payment verified",
    processing:
      "Processing",
    fullyOnline:
      "100% online",
    clientSpace:
      "Client area",
    inProgress:
      "In progress",
    progress:
      "Request progress",
    step4of5:
      "Step 4 of 5",
    personalInfo:
      "Personal information",
    documents:
      "Documents",
    payment:
      "Payment",
    policyPreparation:
      "Insurance preparation",
    policyAvailable:
      "Insurance available",
    nextStep:
      "Next step",
    policyBeingPrepared:
      "Your insurance policy is being prepared.",

    fast:
      "Fast",
    fastDesc:
      "Apply in just a few minutes",
    secure:
      "Secure",
    secureDesc:
      "Protected documents",
    transparent:
      "Transparent",
    transparentDesc:
      "Step-by-step tracking",
    accessible:
      "Accessible",
    accessibleDesc:
      "Online support",

    simpleFromStart:
      "Simple from start to finish",
    fourSteps:
      "Your insurance in four steps",
    fourStepsDesc:
      "A clear process designed to avoid complicated procedures.",

    step1Title:
      "Complete your application",
    step1Desc:
      "Enter your personal details and the information required for your insurance.",
    step2Title:
      "Upload your documents",
    step2Desc:
      "Upload your passport and Kimlik from your phone or computer.",
    step3Title:
      "Make your payment",
    step3Desc:
      "Upload your proof of payment directly from your request area.",
    step4Title:
      "Receive your insurance",
    step4Desc:
      "Once your request is processed, your policy becomes available for download.",

    designedForYou:
      "Designed for you",
    digitalExperience:
      "A clear and reassuring digital experience",
    digitalExperienceDesc:
      "IF Sigorta brings your application, documents and insurance together in one simple journey.",
    startRequest:
      "Start my application",

    feature1Title:
      "100% online",
    feature1Desc:
      "Apply without visiting an office and track your request from anywhere.",
    feature2Title:
      "Secure documents",
    feature2Desc:
      "Your information and documents are centralized in a secure environment.",
    feature3Title:
      "Transparent tracking",
    feature3Desc:
      "Follow the progress of your request at every step.",
    feature4Title:
      "Human support",
    feature4Desc:
      "Our team remains available to assist you whenever needed.",

    alreadyClient:
      "Already a client?",
    trackSeconds:
      "Track your request in seconds",
    trackDesc:
      "Use your IF Sigorta request code to check its current status.",
    requestCode:
      "Request code",

    prepareFile:
      "Prepare your application",
    fewDocuments:
      "Only a few documents",
    passport:
      "Passport",
    passportDesc:
      "Clear photo or PDF",
    kimlikFront:
      "Kimlik front",
    kimlikFrontDesc:
      "Clear photo of the front",
    kimlikBack:
      "Kimlik back",
    kimlikBackDesc:
      "Clear photo of the back",

    needHelp:
      "Need help?",
    helpDesc:
      "Our team can assist you throughout your application.",
    contact:
      "Contact IF Sigorta",

    footerDesc:
      "Health insurance for foreigners in Türkiye.",
    navigation:
      "Navigation",
    makeRequest:
      "Apply now",
    howItWorks:
      "How it works",
    languages:
      "Languages",
    rights:
      "All rights reserved.",
    footerBottom:
      "Health insurance • Türkiye",
  },

  tr: {
    heroBadge:
      "Türkiye'deki yabancılar için sağlık sigortası",
    heroTitle1:
      "Türkiye'de sağlık sigortanız,",
    heroTitle2:
      "kolay ve hızlı.",
    heroText:
      "Başvurunuzu online yapın, belgelerinizi yükleyin, dosyanızı takip edin ve ofise gitmeden poliçenizi alın.",
    getInsurance:
      "Sigorta başvurusu yap",
    track:
      "Başvurumu takip et",
    quickRequest:
      "Hızlı başvuru",
    onlineTracking:
      "Online takip",
    whatsappSupport:
      "WhatsApp desteği",

    status:
      "Durum",
    paymentVerified:
      "Ödeme doğrulandı",
    processing:
      "İşlem",
    fullyOnline:
      "%100 online",
    clientSpace:
      "Müşteri alanı",
    inProgress:
      "İşlemde",
    progress:
      "Başvuru ilerlemesi",
    step4of5:
      "5 adımın 4.'sü",
    personalInfo:
      "Kişisel bilgiler",
    documents:
      "Belgeler",
    payment:
      "Ödeme",
    policyPreparation:
      "Sigorta hazırlanıyor",
    policyAvailable:
      "Sigorta hazır",
    nextStep:
      "Sonraki adım",
    policyBeingPrepared:
      "Sigorta poliçeniz hazırlanıyor.",

    fast:
      "Hızlı",
    fastDesc:
      "Birkaç dakikada başvuru",
    secure:
      "Güvenli",
    secureDesc:
      "Belgeleriniz korunur",
    transparent:
      "Şeffaf",
    transparentDesc:
      "Adım adım takip",
    accessible:
      "Erişilebilir",
    accessibleDesc:
      "Online destek",

    simpleFromStart:
      "Baştan sona kolay",
    fourSteps:
      "Dört adımda sigortanız",
    fourStepsDesc:
      "Karmaşık işlemleri ortadan kaldırmak için tasarlanmış açık ve kolay bir süreç.",

    step1Title:
      "Başvurunuzu doldurun",
    step1Desc:
      "Kişisel bilgilerinizi ve sigorta için gerekli bilgileri girin.",
    step2Title:
      "Belgelerinizi yükleyin",
    step2Desc:
      "Pasaport ve Kimlik belgelerinizi telefonunuzdan veya bilgisayarınızdan yükleyin.",
    step3Title:
      "Ödemenizi yapın",
    step3Desc:
      "Ödeme dekontunuzu başvuru alanınızdan doğrudan yükleyin.",
    step4Title:
      "Sigortanızı alın",
    step4Desc:
      "Başvurunuz tamamlandığında poliçeniz indirilmeye hazır olur.",

    designedForYou:
      "Sizin için tasarlandı",
    digitalExperience:
      "Açık ve güven veren dijital deneyim",
    digitalExperienceDesc:
      "IF Sigorta başvurunuzu, belgelerinizi ve sigortanızı tek ve kolay bir süreçte bir araya getirir.",
    startRequest:
      "Başvurumu başlat",

    feature1Title:
      "%100 online",
    feature1Desc:
      "Ofise gitmeden başvurun ve dosyanızı her yerden takip edin.",
    feature2Title:
      "Güvenli belgeler",
    feature2Desc:
      "Bilgileriniz ve belgeleriniz güvenli bir ortamda saklanır.",
    feature3Title:
      "Şeffaf takip",
    feature3Desc:
      "Başvurunuzun her aşamasını takip edin.",
    feature4Title:
      "İnsan desteği",
    feature4Desc:
      "Ekibimiz ihtiyaç duyduğunuzda size yardımcı olmaya hazırdır.",

    alreadyClient:
      "Zaten müşterimiz misiniz?",
    trackSeconds:
      "Başvurunuzu saniyeler içinde takip edin",
    trackDesc:
      "Başvurunuzun mevcut durumunu görmek için IF Sigorta kodunuzu kullanın.",
    requestCode:
      "Başvuru kodu",

    prepareFile:
      "Başvurunuzu hazırlayın",
    fewDocuments:
      "Sadece birkaç belge",
    passport:
      "Pasaport",
    passportDesc:
      "Okunaklı fotoğraf veya PDF",
    kimlikFront:
      "Kimlik ön yüz",
    kimlikFrontDesc:
      "Ön yüzün net fotoğrafı",
    kimlikBack:
      "Kimlik arka yüz",
    kimlikBackDesc:
      "Arka yüzün net fotoğrafı",

    needHelp:
      "Yardıma mı ihtiyacınız var?",
    helpDesc:
      "Ekibimiz başvuru süreciniz boyunca size yardımcı olabilir.",
    contact:
      "IF Sigorta ile iletişime geç",

    footerDesc:
      "Türkiye'deki yabancılar için sağlık sigortası.",
    navigation:
      "Navigasyon",
    makeRequest:
      "Başvuru yap",
    howItWorks:
      "Nasıl çalışır?",
    languages:
      "Diller",
    rights:
      "Tüm hakları saklıdır.",
    footerBottom:
      "Sağlık sigortası • Türkiye",
  },
};

export default function HomePage() {
  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "fr",
    );

const [
  publicWhatsappNumber,
  setPublicWhatsappNumber,
] = useState("");

  useEffect(() => {
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

    function handleLanguageChange(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          language:
            Language;
        }>;

      setLanguage(
        customEvent.detail.language,
      );
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

  useEffect(() => {
  let cancelled = false;

  async function loadPublicWhatsappNumber() {
    try {
      const response =
        await fetch(
          "/api/contact-settings",
          {
            method: "GET",
            cache: "no-store",
          },
        );

      const result =
        (await response.json()) as {
          whatsappNumber?: string;
        };

      if (
        !response.ok ||
        !result.whatsappNumber
      ) {
        return;
      }

      if (!cancelled) {
        setPublicWhatsappNumber(
          result.whatsappNumber,
        );
      }
    } catch {
      // Le bouton restera simplement masqué
      // si le numéro ne peut pas être chargé.
    }
  }

  void loadPublicWhatsappNumber();

  return () => {
    cancelled = true;
  };
}, []);

  const t =
    translations[
      language
    ];

  const steps = [
    {
      number: "01",
      title:
        t.step1Title,
      description:
        t.step1Desc,
      icon:
        FileText,
    },
    {
      number: "02",
      title:
        t.step2Title,
      description:
        t.step2Desc,
      icon:
        UploadCloud,
    },
    {
      number: "03",
      title:
        t.step3Title,
      description:
        t.step3Desc,
      icon:
        BadgeCheck,
    },
    {
      number: "04",
      title:
        t.step4Title,
      description:
        t.step4Desc,
      icon:
        ShieldCheck,
    },
  ];

  const features = [
    {
      title:
        t.feature1Title,
      description:
        t.feature1Desc,
      icon:
        Globe2,
    },
    {
      title:
        t.feature2Title,
      description:
        t.feature2Desc,
      icon:
        LockKeyhole,
    },
    {
      title:
        t.feature3Title,
      description:
        t.feature3Desc,
      icon:
        CheckCircle2,
    },
    {
      title:
        t.feature4Title,
      description:
        t.feature4Desc,
      icon:
        Headphones,
    },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <HomeHeader />

      <section className="relative isolate overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(circle_at_15%_25%,rgba(47,41,99,0.12),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(24,193,0,0.11),transparent_27%),linear-gradient(180deg,#fbfbff_0%,#ffffff_74%)]" />

        <div className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-16 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2F2963]/10 bg-white/80 px-4 py-2 text-sm font-semibold text-[#2F2963] shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              {t.heroBadge}
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[1.03] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              {t.heroTitle1}{" "}
              <span className="bg-gradient-to-r from-[#2F2963] to-[#5A4FC7] bg-clip-text text-transparent">
                {t.heroTitle2}
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              {t.heroText}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/demande/etape-1"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#18C100] px-7 text-base font-bold text-white shadow-lg shadow-green-500/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#13a300]"
              >
                {t.getInsurance}
                <ArrowRight className="h-5 w-5" />
              </Link>

              <Link
                href="/suivi"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-slate-300 bg-white px-7 text-base font-bold text-slate-800 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#2F2963]/30 hover:bg-slate-50"
              >
                {t.track}
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              <MiniTrust
                label={
                  t.quickRequest
                }
              />
              <MiniTrust
                label={
                  t.onlineTracking
                }
              />
              <MiniTrust
                label={
                  t.whatsappSupport
                }
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-14 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl xl:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    {t.status}
                  </p>

                  <p className="text-sm font-bold text-slate-900">
                    {t.paymentVerified}
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -right-3 bottom-14 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl xl:block">
              <p className="text-xs font-semibold text-slate-400">
                {t.processing}
              </p>

              <p className="mt-1 text-lg font-black text-slate-900">
                {t.fullyOnline}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.28)]">
              <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2F2963] text-sm font-black text-white">
                      IF
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {t.clientSpace}
                      </p>

                      <p className="mt-1 text-lg font-black text-slate-900">
                        IF-2026-1042
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                    {t.inProgress}
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-7">
                <div className="rounded-2xl bg-[#2F2963] p-5 text-white">
                  <p className="text-sm font-semibold text-white/70">
                    {t.progress}
                  </p>

                  <div className="mt-3 flex items-end justify-between gap-4">
                    <p className="text-3xl font-black">
                      75 %
                    </p>

                    <span className="text-xs font-semibold text-white/60">
                      {t.step4of5}
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full w-3/4 rounded-full bg-[#18C100]" />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <ProgressRow
                    label={
                      t.personalInfo
                    }
                    done
                  />

                  <ProgressRow
                    label={
                      t.documents
                    }
                    done
                  />

                  <ProgressRow
                    label={
                      t.payment
                    }
                    done
                  />

                  <ProgressRow
                    label={
                      t.policyPreparation
                    }
                    active
                  />

                  <ProgressRow
                    label={
                      t.policyAvailable
                    }
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#2F2963]/10 text-[#2F2963]">
                    <MessageCircle className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {t.nextStep}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {t.policyBeingPrepared}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <TrustItem
            title={t.fast}
            description={
              t.fastDesc
            }
          />

          <TrustItem
            title={t.secure}
            description={
              t.secureDesc
            }
          />

          <TrustItem
            title={
              t.transparent
            }
            description={
              t.transparentDesc
            }
          />

          <TrustItem
            title={
              t.accessible
            }
            description={
              t.accessibleDesc
            }
          />
        </div>
      </section>

      <section
        id="fonctionnement"
        className="bg-white py-24"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2F2963]">
              {t.simpleFromStart}
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              {t.fourSteps}
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              {t.fourStepsDesc}
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-4">
            {steps.map(
              (step) => {
                const Icon =
                  step.icon;

                return (
                  <article
                    key={
                      step.number
                    }
                    className="group rounded-3xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#2F2963]/20 hover:shadow-xl hover:shadow-slate-900/5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2F2963]/10 text-[#2F2963]">
                        <Icon className="h-5 w-5" />
                      </div>

                      <span className="text-sm font-black text-slate-300">
                        {
                          step.number
                        }
                      </span>
                    </div>

                    <h3 className="mt-7 text-xl font-black text-slate-900">
                      {
                        step.title
                      }
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {
                        step.description
                      }
                    </p>
                  </article>
                );
              },
            )}
          </div>
        </div>
      </section>

      <section
        id="avantages"
        className="bg-slate-50 py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2F2963]">
              {t.designedForYou}
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              {t.digitalExperience}
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              {t.digitalExperienceDesc}
            </p>

            <Link
              href="/demande/etape-1"
              className="mt-8 inline-flex w-fit items-center gap-2 font-bold text-[#2F2963]"
            >
              {t.startRequest}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {features.map(
              (feature) => {
                const Icon =
                  feature.icon;

                return (
                  <article
                    key={
                      feature.title
                    }
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2F2963]/10 text-[#2F2963]">
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="mt-5 text-lg font-black text-slate-900">
                      {
                        feature.title
                      }
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {
                        feature.description
                      }
                    </p>
                  </article>
                );
              },
            )}
          </div>
        </div>
      </section>

      <section
        id="suivi"
        className="bg-white py-24"
      >
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] bg-[#2F2963] p-8 text-white shadow-2xl shadow-[#2F2963]/20 sm:p-12">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">
                  {t.alreadyClient}
                </p>

                <h2 className="mt-4 text-4xl font-black">
                  {t.trackSeconds}
                </h2>

                <p className="mt-5 max-w-xl text-base leading-8 text-white/70">
                  {t.trackDesc}
                </p>
              </div>

             <div className="rounded-3xl bg-white p-5 text-slate-900">
  <TrackRequestForm />
</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2F2963]">
              {t.prepareFile}
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
              {t.fewDocuments}
            </h2>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-3">
            <DocumentCard
              title={
                t.passport
              }
              description={
                t.passportDesc
              }
            />

            <DocumentCard
              title={
                t.kimlikFront
              }
              description={
                t.kimlikFrontDesc
              }
            />

            <DocumentCard
              title={
                t.kimlikBack
              }
              description={
                t.kimlikBackDesc
              }
            />
          </div>
        </div>
      </section>

      <section
        id="assistance"
        className="bg-white py-24"
      >
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                  <MessageCircle className="h-6 w-6" />
                </div>

                <h2 className="mt-5 text-3xl font-black text-slate-950">
                  {t.needHelp}
                </h2>

                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  {t.helpDesc}
                </p>
              </div>

              {publicWhatsappNumber && (
              <a
  href={`https://wa.me/${publicWhatsappNumber}?text=${encodeURIComponent(
    language === "fr"
      ? "Bonjour IF Sigorta, j’ai besoin d’aide concernant mon assurance santé."
      : language === "en"
        ? "Hello IF Sigorta, I need help regarding my health insurance."
        : "Merhaba IF Sigorta, sağlık sigortam hakkında yardıma ihtiyacım var.",
  )}`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#18C100] px-6 text-sm font-bold text-white transition hover:bg-[#13a300]"
>
  <MessageCircle className="h-5 w-5" />

  {t.contact}
</a>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-3 lg:px-8">
          <div>
            <p className="text-xl font-black">
              IF Sigorta
            </p>

            <p className="mt-3 max-w-sm text-sm leading-7 text-slate-400">
              {t.footerDesc}
            </p>
          </div>

          <div>
            <p className="font-bold">
              {t.navigation}
            </p>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
              <Link href="/demande/etape-1">
                {t.makeRequest}
              </Link>

              <Link href="/suivi">
                {t.track}
              </Link>

              <Link href="#fonctionnement">
                {t.howItWorks}
              </Link>
            </div>
          </div>

          <div>
            <p className="font-bold">
              {t.languages}
            </p>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
              <span>
                Français
              </span>
              <span>
                English
              </span>
              <span>
                Türkçe
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <span>
              ©{" "}
              {new Date().getFullYear()}{" "}
              IF Sigorta.{" "}
              {t.rights}
            </span>

            <span>
              {t.footerBottom}
            </span>
          </div>
        </div>
      </footer>
      {publicWhatsappNumber && (
      <a
  href={`https://wa.me/${publicWhatsappNumber}?text=${encodeURIComponent(
    language === "fr"
      ? "Bonjour IF Sigorta, j’ai besoin d’aide concernant mon assurance santé."
      : language === "en"
        ? "Hello IF Sigorta, I need help regarding my health insurance."
        : "Merhaba IF Sigorta, sağlık sigortam hakkında yardıma ihtiyacım var.",
  )}`}
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Contacter IF Sigorta sur WhatsApp"
  className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#18C100] text-white shadow-2xl shadow-green-500/30 transition duration-200 hover:-translate-y-1 hover:bg-[#13a300] hover:shadow-green-500/40"
>
  <MessageCircle className="h-6 w-6" />
</a>
      )}
    </main>
  );
}

function MiniTrust({
  label,
}: {
  label:
    string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 shadow-sm">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#18C100]" />

      <span className="text-sm font-semibold text-slate-600">
        {label}
      </span>
    </div>
  );
}

function ProgressRow({
  label,
  done = false,
  active = false,
}: {
  label:
    string;

  done?:
    boolean;

  active?:
    boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
          done
            ? "border-green-200 bg-green-50 text-green-700"
            : active
              ? "border-[#2F2963] bg-[#2F2963] text-white"
              : "border-slate-200 bg-white text-slate-400",
        ].join(
          " ",
        )}
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : active ? (
          <span className="h-2.5 w-2.5 rounded-full bg-white" />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        )}
      </div>

      <p
        className={[
          "text-sm font-semibold",
          done ||
          active
            ? "text-slate-900"
            : "text-slate-400",
        ].join(
          " ",
        )}
      >
        {label}
      </p>
    </div>
  );
}

function TrustItem({
  title,
  description,
}: {
  title:
    string;

  description:
    string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#18C100]" />

      <div>
        <p className="font-black text-slate-900">
          {title}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function DocumentCard({
  title,
  description,
}: {
  title:
    string;

  description:
    string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2F2963]/10 text-[#2F2963]">
        <FileText className="h-6 w-6" />
      </div>

      <h3 className="mt-5 text-lg font-black text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </article>
  );
}