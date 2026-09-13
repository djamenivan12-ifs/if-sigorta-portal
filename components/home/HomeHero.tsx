"use client";
import Image from "next/image";

import { useLanguage } from "@/lib/useLanguage";

import Link from "next/link";

import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";





const content = {
  fr: {
    badge:
      "Assurance santé pour étrangers en Turquie",

    title1:
      "Votre assurance",

    title2:
      "santé en Turquie.",

    title3:
      "Simple, rapide & sécurisée.",

    description:
      "Demandez en ligne, transmettez vos documents, suivez votre dossier et recevez votre assurance sans vous déplacer.",

    primary:
      "Faire une demande",

    secondary:
      "Suivre mon dossier",

    online:
      "100 % en ligne",

    secure:
      "Documents protégés",

    tracking:
      "Suivi simple",
  },

  en: {
    badge:
      "Health insurance for foreigners in Türkiye",

    title1:
      "Your health",

    title2:
      "insurance in Türkiye.",

    title3:
      "Simple, fast & secure.",

    description:
      "Apply online, upload your documents, track your request and receive your insurance without visiting an office.",

    primary:
      "Apply now",

    secondary:
      "Track my request",

    online:
      "100% online",

    secure:
      "Protected documents",

    tracking:
      "Simple tracking",
  },

  tr: {
    badge:
      "Türkiye'deki yabancılar için sağlık sigortası",

    title1:
      "Türkiye'de",

    title2:
      "sağlık sigortanız.",

    title3:
      "Kolay, hızlı ve güvenli.",

    description:
      "Online başvurun, belgelerinizi yükleyin, dosyanızı takip edin ve ofise gitmeden poliçenizi alın.",

    primary:
      "Başvuru yap",

    secondary:
      "Başvurumu takip et",

    online:
      "%100 online",

    secure:
      "Belgeler korunur",

    tracking:
      "Kolay takip",
  },
};

export default function HomeHero() {
  const [language] =
    useLanguage();



  const t =
    content[
      language
    ];

  return (
    <section className="bg-white px-4 pb-4 pt-4 sm:px-6 sm:pb-6 lg:px-8">
      <div className="relative mx-auto min-h-[640px] max-w-[1600px] overflow-hidden rounded-[2rem] sm:min-h-[680px] lg:min-h-[700px]">
        {/* PHOTO */}

        <Image fill sizes="100vw" preload
          src="/if-sigorta-hero.jpeg"
          alt="Client IF Sigorta en Turquie"
          className="absolute inset-0 h-full w-full object-cover object-[62%_center] lg:object-center"
        />

        {/* DEGRADE GAUCHE UNIQUEMENT */}

        <div className="absolute inset-0 bg-gradient-to-r from-[#062F22]/95 via-[#062F22]/65 to-[#062F22]/25 lg:from-[#062F22]/90 lg:via-[#062F22]/50 lg:via-45% lg:to-transparent" />

        {/* PETIT DEGRADE HAUT/BAS */}

        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-black/5" />

        {/* CONTENU */}

        <div className="relative z-20 flex min-h-[640px] items-end px-6 pb-10 pt-32 sm:min-h-[680px] sm:px-8 sm:pb-14 sm:pt-36 lg:min-h-[700px] lg:items-center lg:px-12 lg:pb-12 lg:pt-32 xl:px-14">
          <div className="w-full max-w-xl">
            {/* BADGE */}

            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-white/85 backdrop-blur-md sm:text-xs">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#B8E83D]" />

              {
                t.badge
              }
            </div>

            {/* TITRE */}

            <h1 className="mt-6 max-w-[710px] text-[2.25rem] font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-[2.65rem] lg:text-[3.05rem] xl:text-[3.35rem]">
  {t.title1}

  <span className="block">
    {t.title2}
  </span>

  <span className="mt-3 block max-w-[560px] text-[0.78em] font-semibold leading-[1.08] tracking-[-0.025em] text-[#B8E83D]">
    {t.title3}
  </span>
</h1>

            {/* DESCRIPTION */}

            <p className="mt-6 max-w-[490px] text-base leading-7 text-white/90 sm:text-lg sm:leading-8">
              {
                t.description
              }
            </p>

            {/* CTA */}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/demande/etape-1"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#B8E83D] px-6 text-sm font-black text-[#15311F] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#C8F24D] sm:text-base"
              >
                {
                  t.primary
                }

                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/suivi"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 text-sm font-black text-white backdrop-blur transition hover:bg-white/15 sm:text-base"
              >
                {
                  t.secondary
                }

                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* INDICATEURS */}

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
              <TrustItem
                label={
                  t.online
                }
              />

              <TrustItem
                label={
                  t.secure
                }
              />

              <TrustItem
                label={
                  t.tracking
                }
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustItem({
  label,
}: {
  label:
    string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-white/75">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-white">
        <CheckCircle2 className="h-3.5 w-3.5" />
      </div>

      <span>
        {
          label
        }
      </span>
    </div>
  );
}