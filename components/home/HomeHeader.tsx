"use client";

import Link from "next/link";

import {
  ArrowRight,
  Check,
  ChevronDown,
  Globe2,
  Menu,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type Language =
  | "fr"
  | "en"
  | "tr";

const translations = {
  fr: {
    howItWorks:
      "Comment ça marche",

    whyUs:
      "Pourquoi nous",

    track:
      "Suivre mon dossier",

    support:
      "Assistance",

    insurance:
      "Obtenir mon assurance",

    french:
      "Français",

    english:
      "English",

    turkish:
      "Türkçe",
  },

  en: {
    howItWorks:
      "How it works",

    whyUs:
      "Why choose us",

    track:
      "Track my request",

    support:
      "Support",

    insurance:
      "Get insured",

    french:
      "Français",

    english:
      "English",

    turkish:
      "Türkçe",
  },

  tr: {
    howItWorks:
      "Nasıl çalışır?",

    whyUs:
      "Neden biz?",

    track:
      "Başvurumu takip et",

    support:
      "Destek",

    insurance:
      "Sigorta başvurusu yap",

    french:
      "Français",

    english:
      "English",

    turkish:
      "Türkçe",
  },
};

const languageLabels: Record<
  Language,
  string
> = {
  fr: "FR",
  en: "EN",
  tr: "TR",
};

export default function HomeHeader() {
  const [
    mobileOpen,
    setMobileOpen,
  ] =
    useState(false);

  const [
    languageOpen,
    setLanguageOpen,
  ] =
    useState(false);

  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "fr",
    );

  const languageMenuRef =
    useRef<HTMLDivElement>(
      null,
    );

  const t =
    translations[
      language
    ];

  useEffect(() => {
    const storedLanguage =
      window.localStorage.getItem(
        "if-sigorta-language",
      );

    if (
      storedLanguage ===
        "fr" ||
      storedLanguage ===
        "en" ||
      storedLanguage ===
        "tr"
    ) {
      setLanguage(
        storedLanguage,
      );
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(
      event:
        MouseEvent,
    ) {
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(
          event.target as Node,
        )
      ) {
        setLanguageOpen(
          false,
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  function changeLanguage(
    value:
      Language,
  ) {
    setLanguage(
      value,
    );

    window.localStorage.setItem(
      "if-sigorta-language",
      value,
    );

    window.dispatchEvent(
      new CustomEvent(
        "if-sigorta-language-change",
        {
          detail: {
            language:
              value,
          },
        },
      ),
    );

    setLanguageOpen(
      false,
    );

    setMobileOpen(
      false,
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        {/* LOGO */}

        <Link
          href="/"
          className="flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2F2963] text-lg font-black text-white shadow-sm">
            IF
          </div>

          <div>
            <p className="text-lg font-black tracking-tight text-slate-900">
              IF Sigorta
            </p>

            <p className="text-xs text-slate-500">
              Assurance santé
            </p>
          </div>
        </Link>

        {/* NAVIGATION DESKTOP */}

        <nav className="hidden items-center gap-8 lg:flex">
          <Link
            href="#fonctionnement"
            className="text-sm font-semibold text-slate-600 transition hover:text-[#2F2963]"
          >
            {
              t.howItWorks
            }
          </Link>

          <Link
            href="#avantages"
            className="text-sm font-semibold text-slate-600 transition hover:text-[#2F2963]"
          >
            {
              t.whyUs
            }
          </Link>

          <Link
            href="#suivi"
            className="text-sm font-semibold text-slate-600 transition hover:text-[#2F2963]"
          >
            {
              t.track
            }
          </Link>

          <Link
            href="#assistance"
            className="text-sm font-semibold text-slate-600 transition hover:text-[#2F2963]"
          >
            {
              t.support
            }
          </Link>
        </nav>

        {/* ACTIONS DESKTOP */}

        <div className="hidden items-center gap-3 lg:flex">
          {/* LANGUE */}

          <div
            ref={
              languageMenuRef
            }
            className="relative"
          >
            <button
              type="button"
              onClick={() =>
                setLanguageOpen(
                  !languageOpen,
                )
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Globe2 className="h-4 w-4" />

              {
                languageLabels[
                  language
                ]
              }

              <ChevronDown
                className={`h-4 w-4 transition ${
                  languageOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {languageOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
                <LanguageButton
                  active={
                    language ===
                    "fr"
                  }
                  label={
                    t.french
                  }
                  code="FR"
                  onClick={() =>
                    changeLanguage(
                      "fr",
                    )
                  }
                />

                <LanguageButton
                  active={
                    language ===
                    "en"
                  }
                  label={
                    t.english
                  }
                  code="EN"
                  onClick={() =>
                    changeLanguage(
                      "en",
                    )
                  }
                />

                <LanguageButton
                  active={
                    language ===
                    "tr"
                  }
                  label={
                    t.turkish
                  }
                  code="TR"
                  onClick={() =>
                    changeLanguage(
                      "tr",
                    )
                  }
                />
              </div>
            )}
          </div>

          <Link
            href="/suivi"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2F2963]/20 px-5 text-sm font-semibold text-[#2F2963] transition hover:bg-[#2F2963]/5"
          >
            {
              t.track
            }
          </Link>

          <Link
            href="/demande/etape-1"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#18C100] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#13a300]"
          >
            {
              t.insurance
            }

            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* MOBILE BUTTON */}

        <button
          type="button"
          onClick={() =>
            setMobileOpen(
              !mobileOpen,
            )
          }
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
          aria-label="Menu"
          aria-expanded={
            mobileOpen
          }
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* MOBILE MENU */}

      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <div className="mx-auto max-w-7xl px-5 py-5">
            <nav className="flex flex-col gap-1">
              <MobileLink
                href="#fonctionnement"
                onClick={() =>
                  setMobileOpen(
                    false,
                  )
                }
              >
                {
                  t.howItWorks
                }
              </MobileLink>

              <MobileLink
                href="#avantages"
                onClick={() =>
                  setMobileOpen(
                    false,
                  )
                }
              >
                {
                  t.whyUs
                }
              </MobileLink>

              <MobileLink
                href="#suivi"
                onClick={() =>
                  setMobileOpen(
                    false,
                  )
                }
              >
                {
                  t.track
                }
              </MobileLink>

              <MobileLink
                href="#assistance"
                onClick={() =>
                  setMobileOpen(
                    false,
                  )
                }
              >
                {
                  t.support
                }
              </MobileLink>
            </nav>

            <div className="my-5 border-t border-slate-100" />

            {/* LANGUES MOBILE */}

            <div>
              <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Langue
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <MobileLanguageButton
                  active={
                    language ===
                    "fr"
                  }
                  label="FR"
                  onClick={() =>
                    changeLanguage(
                      "fr",
                    )
                  }
                />

                <MobileLanguageButton
                  active={
                    language ===
                    "en"
                  }
                  label="EN"
                  onClick={() =>
                    changeLanguage(
                      "en",
                    )
                  }
                />

                <MobileLanguageButton
                  active={
                    language ===
                    "tr"
                  }
                  label="TR"
                  onClick={() =>
                    changeLanguage(
                      "tr",
                    )
                  }
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <Link
                href="/suivi"
                onClick={() =>
                  setMobileOpen(
                    false,
                  )
                }
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#2F2963]/20 px-5 text-sm font-semibold text-[#2F2963]"
              >
                {
                  t.track
                }
              </Link>

              <Link
                href="/demande/etape-1"
                onClick={() =>
                  setMobileOpen(
                    false,
                  )
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#18C100] px-5 text-sm font-bold text-white"
              >
                {
                  t.insurance
                }

                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function LanguageButton({
  active,
  label,
  code,
  onClick,
}: {
  active:
    boolean;

  label:
    string;

  code:
    string;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition",
        active
          ? "bg-[#2F2963]/5 text-[#2F2963]"
          : "text-slate-700 hover:bg-slate-50",
      ].join(
        " ",
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-black">
        {
          code
        }
      </span>

      <span className="flex-1 font-semibold">
        {
          label
        }
      </span>

      {active && (
        <Check className="h-4 w-4" />
      )}
    </button>
  );
}

function MobileLanguageButton({
  active,
  label,
  onClick,
}: {
  active:
    boolean;

  label:
    string;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "min-h-11 rounded-xl border text-sm font-bold transition",
        active
          ? "border-[#2F2963] bg-[#2F2963] text-white"
          : "border-slate-200 bg-white text-slate-700",
      ].join(
        " ",
      )}
    >
      {
        label
      }
    </button>
  );
}

function MobileLink({
  href,
  children,
  onClick,
}: {
  href:
    string;

  children:
    React.ReactNode;

  onClick:
    () => void;
}) {
  return (
    <Link
      href={
        href
      }
      onClick={
        onClick
      }
      className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#2F2963]"
    >
      {
        children
      }
    </Link>
  );
}