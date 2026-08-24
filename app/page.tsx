"use client";

import Link from "next/link";

import {
  ArrowRight,
  FileText,
  Globe2,
  MessageCircle,
  ShieldCheck,
  UploadCloud,
  Users2,
  Zap,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import HomeHeader from "@/components/home/HomeHeader";
import HomeHero from "@/components/home/HomeHero";
import TrackRequestForm from "@/components/home/TrackRequestForm";

type Language =
  | "fr"
  | "en"
  | "tr";

const translations = {
  fr: {
    processBadge:
      "Comment ça marche ?",

    processTitle:
      "Votre assurance en 3 étapes simples",

    processText:
      "Un parcours clair et rapide, pensé pour vous éviter les démarches compliquées.",

    step1Title:
      "Faites votre demande",

    step1Text:
      "Remplissez vos informations personnelles et choisissez la durée de votre assurance.",

    step2Title:
      "Envoyez vos documents",

    step2Text:
      "Téléversez votre passeport, votre Kimlik si nécessaire et votre justificatif de paiement.",

    step3Title:
      "Recevez votre assurance",

    step3Text:
      "Suivez votre dossier et téléchargez votre police dès qu’elle est disponible.",

    trackingBadge:
      "Suivre mon dossier",

    trackingTitle:
      "Où en est votre dossier ?",

    trackingText:
      "Utilisez votre matricule IF Sigorta et votre numéro WhatsApp pour consulter l’état actuel de votre demande.",

    supportBadge:
      "Besoin d’aide ?",

    supportTitle:
      "Nous sommes là pour vous aider.",

    supportText:
      "Une question pendant votre demande ? Contactez directement notre équipe sur WhatsApp.",

    supportButton:
      "Discuter sur WhatsApp",

    secure:
      "Sécurisé",

    secureText:
      "Vos données et documents restent protégés.",

    fast:
      "Rapide",

    fastText:
      "Un traitement simple et entièrement en ligne.",

    assistance:
      "Accompagnement",

    assistanceText:
      "Une équipe disponible lorsque vous en avez besoin.",

    multilingual:
      "Multilingue",

    multilingualText:
      "Service disponible en FR · EN · TR.",

    footerText:
      "Assurance santé pour étrangers en Turquie.",

    navigation:
      "Navigation",

    home:
      "Accueil",

    request:
      "Faire une demande",

    tracking:
      "Suivre mon dossier",

    operation:
      "Comment ça marche",

    contact:
      "Contact",

    information:
      "Informations",

    documents:
      "Documents nécessaires",

    privacy:
      "Confidentialité",

    support:
      "Assistance",

    rights:
      "Tous droits réservés.",
  },

  en: {
    processBadge:
      "How does it work?",

    processTitle:
      "Your insurance in 3 simple steps",

    processText:
      "A clear and fast journey designed to avoid complicated procedures.",

    step1Title:
      "Complete your application",

    step1Text:
      "Enter your personal information and choose the duration of your insurance.",

    step2Title:
      "Upload your documents",

    step2Text:
      "Upload your passport, Kimlik when applicable and your proof of payment.",

    step3Title:
      "Receive your insurance",

    step3Text:
      "Track your request and download your policy as soon as it becomes available.",

    trackingBadge:
      "Track my request",

    trackingTitle:
      "Where is your request?",

    trackingText:
      "Use your IF Sigorta reference and WhatsApp number to check the current status of your application.",

    supportBadge:
      "Need help?",

    supportTitle:
      "We are here to help.",

    supportText:
      "Have a question during your application? Contact our team directly on WhatsApp.",

    supportButton:
      "Chat on WhatsApp",

    secure:
      "Secure",

    secureText:
      "Your data and documents remain protected.",

    fast:
      "Fast",

    fastText:
      "A simple and fully online process.",

    assistance:
      "Support",

    assistanceText:
      "A team available whenever you need help.",

    multilingual:
      "Multilingual",

    multilingualText:
      "Service available in FR · EN · TR.",

    footerText:
      "Health insurance for foreigners in Türkiye.",

    navigation:
      "Navigation",

    home:
      "Home",

    request:
      "Apply",

    tracking:
      "Track my request",

    operation:
      "How it works",

    contact:
      "Contact",

    information:
      "Information",

    documents:
      "Required documents",

    privacy:
      "Privacy",

    support:
      "Support",

    rights:
      "All rights reserved.",
  },

  tr: {
    processBadge:
      "Nasıl çalışır?",

    processTitle:
      "3 kolay adımda sigortanız",

    processText:
      "Karmaşık işlemleri azaltmak için tasarlanmış açık ve hızlı bir süreç.",

    step1Title:
      "Başvurunuzu yapın",

    step1Text:
      "Kişisel bilgilerinizi girin ve sigorta süresini seçin.",

    step2Title:
      "Belgelerinizi yükleyin",

    step2Text:
      "Pasaportunuzu, gerektiğinde Kimlik belgenizi ve ödeme dekontunuzu yükleyin.",

    step3Title:
      "Sigortanızı alın",

    step3Text:
      "Başvurunuzu takip edin ve poliçeniz hazır olduğunda indirin.",

    trackingBadge:
      "Başvurumu takip et",

    trackingTitle:
      "Başvurunuz hangi aşamada?",

    trackingText:
      "Başvurunuzun mevcut durumunu görmek için IF Sigorta kodunuzu ve WhatsApp numaranızı kullanın.",

    supportBadge:
      "Yardıma mı ihtiyacınız var?",

    supportTitle:
      "Size yardımcı olmak için buradayız.",

    supportText:
      "Başvuru sırasında bir sorunuz mu var? WhatsApp üzerinden ekibimizle iletişime geçin.",

    supportButton:
      "WhatsApp'tan yazın",

    secure:
      "Güvenli",

    secureText:
      "Bilgileriniz ve belgeleriniz korunur.",

    fast:
      "Hızlı",

    fastText:
      "Kolay ve tamamen online bir süreç.",

    assistance:
      "Destek",

    assistanceText:
      "İhtiyaç duyduğunuzda size yardımcı olacak bir ekip.",

    multilingual:
      "Çok dilli",

    multilingualText:
      "FR · EN · TR hizmet.",

    footerText:
      "Türkiye'deki yabancılar için sağlık sigortası.",

    navigation:
      "Navigasyon",

    home:
      "Ana sayfa",

    request:
      "Başvuru yap",

    tracking:
      "Başvurumu takip et",

    operation:
      "Nasıl çalışır",

    contact:
      "İletişim",

    information:
      "Bilgiler",

    documents:
      "Gerekli belgeler",

    privacy:
      "Gizlilik",

    support:
      "Destek",

    rights:
      "Tüm hakları saklıdır.",
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
  ] =
    useState(
      "",
    );

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
      setLanguage(
        saved,
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
    let cancelled =
      false;

    async function loadPublicWhatsappNumber() {
      try {
        const response =
          await fetch(
            "/api/contact-settings",
            {
              method:
                "GET",

              cache:
                "no-store",
            },
          );

        const result =
          (await response.json()) as {
            whatsappNumber?:
              string;
          };

        if (
          response.ok &&
          result.whatsappNumber &&
          !cancelled
        ) {
          setPublicWhatsappNumber(
            result.whatsappNumber,
          );
        }
      } catch {
        /*
         * Le site reste fonctionnel
         * même si WhatsApp est indisponible.
         */
      }
    }

    void loadPublicWhatsappNumber();

    return () => {
      cancelled =
        true;
    };
  }, []);

  const t =
    translations[
      language
    ];

  const whatsappMessage =
    language === "fr"
      ? "Bonjour IF Sigorta 👋 J’ai besoin d’aide concernant mon assurance santé."
      : language === "en"
        ? "Hello IF Sigorta 👋 I need help regarding my health insurance."
        : "Merhaba IF Sigorta 👋 Sağlık sigortam hakkında yardıma ihtiyacım var.";

  const steps = [
    {
      icon:
        FileText,

      title:
        t.step1Title,

      description:
        t.step1Text,
    },

    {
      icon:
        UploadCloud,

      title:
        t.step2Title,

      description:
        t.step2Text,
    },

    {
      icon:
        ShieldCheck,

      title:
        t.step3Title,

      description:
        t.step3Text,
    },
  ];

  const benefits = [
    {
      icon:
        ShieldCheck,

      title:
        t.secure,

      description:
        t.secureText,
    },

    {
      icon:
        Zap,

      title:
        t.fast,

      description:
        t.fastText,
    },

    {
      icon:
        Users2,

      title:
        t.assistance,

      description:
        t.assistanceText,
    },

    {
      icon:
        Globe2,

      title:
        t.multilingual,

      description:
        t.multilingualText,
    },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <HomeHeader />

      <HomeHero />

      {/* ============================================
          COMMENT ÇA MARCHE
      ============================================ */}

      <section
        id="fonctionnement"
        className="bg-white py-20 sm:py-24 lg:py-28"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B5D3B]">
                {
                  t.processBadge
                }
              </p>

              <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#102B20] sm:text-4xl lg:text-[3.25rem]">
                {
                  t.processTitle
                }
              </h2>

              <p className="mt-5 max-w-lg text-base leading-7 text-slate-500 sm:text-lg">
                {
                  t.processText
                }
              </p>

              <Link
                href="/demande/etape-1"
                className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#0B5D3B] transition-all hover:gap-3"
              >
                {
                  t.request
                }

                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div>
              {steps.map(
                (
                  step,
                  index,
                ) => {
                  const Icon =
                    step.icon;

                  return (
                    <article
                      key={
                        step.title
                      }
                      className="group border-t border-slate-200 py-7 first:border-t-0 first:pt-0 sm:py-9 lg:py-10"
                    >
                      <div className="grid gap-5 sm:grid-cols-[72px_1fr] sm:gap-7">
                        <div>
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF6EC] text-[#0B5D3B] transition duration-300 group-hover:bg-[#0B5D3B] group-hover:text-white">
                            <Icon className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="flex gap-5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-4">
                              <span className="text-xs font-black tracking-[0.16em] text-[#90AD97]">
                                0
                                {
                                  index +
                                  1
                                }
                              </span>

                              <h3 className="text-xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-2xl">
                                {
                                  step.title
                                }
                              </h3>
                            </div>

                            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                              {
                                step.description
                              }
                            </p>
                          </div>

                          <div className="hidden shrink-0 items-center text-slate-300 transition duration-300 group-hover:translate-x-1 group-hover:text-[#0B5D3B] sm:flex">
                            <ArrowRight className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          SUIVI + WHATSAPP
      ============================================ */}

      <section
        id="suivi"
        className="bg-[#F7F8F6] py-20 sm:py-24 lg:py-28"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B5D3B]">
                {
                  t.trackingBadge
                }
              </p>

              <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#102B20] sm:text-4xl lg:text-[3.2rem]">
                {
                  t.trackingTitle
                }
              </h2>

              <p className="mt-5 max-w-lg text-base leading-7 text-slate-500 sm:text-lg">
                {
                  t.trackingText
                }
              </p>

              <div className="mt-8 max-w-xl rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <TrackRequestForm />
              </div>
            </div>

            <div
              id="assistance"
              className="relative overflow-hidden rounded-[2rem] bg-[#123F2C] px-6 py-8 text-white sm:px-8 sm:py-10 lg:px-10 lg:py-12"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#B8E83D]/10" />

              <div className="relative z-10">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B8E83D]">
                  {
                    t.supportBadge
                  }
                </p>

                <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-4xl lg:text-[3.2rem]">
                  {
                    t.supportTitle
                  }
                </h2>

                <p className="mt-5 max-w-lg text-base leading-7 text-white/70 sm:text-lg">
                  {
                    t.supportText
                  }
                </p>

                {publicWhatsappNumber && (
                  <a
                    href={`https://wa.me/${publicWhatsappNumber}?text=${encodeURIComponent(
                      whatsappMessage,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#B8E83D] px-6 text-sm font-black text-[#15311F] transition hover:-translate-y-0.5 hover:bg-[#C8F24D]"
                  >
                    <MessageCircle className="h-5 w-5" />

                    {
                      t.supportButton
                    }

                    <ArrowRight className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          AVANTAGES
      ============================================ */}

      <section className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(
              (
                benefit,
              ) => {
                const Icon =
                  benefit.icon;

                return (
                  <div
                    key={
                      benefit.title
                    }
                    className="group"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF6EC] text-[#0B5D3B] transition duration-300 group-hover:bg-[#0B5D3B] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                      {
                        benefit.title
                      }
                    </h3>

                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                      {
                        benefit.description
                      }
                    </p>
                  </div>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* ============================================
          FOOTER
      ============================================ */}

      <footer className="bg-[#0F2F23] text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.25fr_0.75fr_0.75fr_0.75fr]">
            <div className="max-w-sm">
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden">
                  <img
                    src="/if-sigorta-logo.png"
                    alt="IF Sigorta"
                    className="h-full w-full scale-[1.55] object-contain"
                  />
                </div>

                <div>
                  <p className="text-lg font-black">
                    IF Sigorta
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                    Insurance
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-white/60">
                {
                  t.footerText
                }
              </p>
            </div>

            <FooterColumn
              title={
                t.navigation
              }
            >
              <FooterLink href="/">
                {
                  t.home
                }
              </FooterLink>

              <FooterLink href="/demande/etape-1">
                {
                  t.request
                }
              </FooterLink>

              <FooterLink href="/suivi">
                {
                  t.tracking
                }
              </FooterLink>

              <FooterLink href="/#fonctionnement">
                {
                  t.operation
                }
              </FooterLink>
            </FooterColumn>

            <FooterColumn
              title={
                t.information
              }
            >
              <span>
                {
                  t.documents
                }
              </span>

              <span>
                {
                  t.privacy
                }
              </span>

              <span>
                {
                  t.support
                }
              </span>
            </FooterColumn>

            <div>
              <p className="text-sm font-black">
                {
                  t.contact
                }
              </p>

              <div className="mt-5 space-y-2 text-sm leading-6 text-white/60">
                <p>
                  IF Sigorta
                </p>

                <p>
                  Türkiye
                </p>

                {publicWhatsappNumber && (
                  <a
                    href={`https://wa.me/${publicWhatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 pt-2 font-semibold text-[#B8E83D] transition hover:text-[#C8F24D]"
                  >
                    <MessageCircle className="h-4 w-4" />

                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <p>
              ©{" "}
              {
                new Date().getFullYear()
              }{" "}
              IF Sigorta.{" "}
              {
                t.rights
              }
            </p>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#B8E83D]" />

              <span>
                FR · EN · TR
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* WHATSAPP FLOTTANT */}

      {publicWhatsappNumber && (
        <a
          href={`https://wa.me/${publicWhatsappNumber}?text=${encodeURIComponent(
            whatsappMessage,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#B8E83D] text-[#15311F] shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:bg-[#C8F24D] sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
    </main>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-black text-white">
        {
          title
        }
      </p>

      <div className="mt-5 flex flex-col gap-3 text-sm text-white/55">
        {
          children
        }
      </div>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <Link
      href={
        href
      }
      className="transition hover:text-white"
    >
      {
        children
      }
    </Link>
  );
}