"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Menu,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

type Language =
  | "fr"
  | "en"
  | "tr";

const labels = {
  fr: {
    home:
      "Accueil",

    apply:
      "Faire une demande",

    track:
      "Suivre mon dossier",

    about:
      "À propos",

    contact:
      "Contact",

    cta:
      "Faire une demande",
  },

  en: {
    home:
      "Home",

    apply:
      "Apply",

    track:
      "Track my request",

    about:
      "About",

    contact:
      "Contact",

    cta:
      "Apply now",
  },

  tr: {
    home:
      "Ana sayfa",

    apply:
      "Başvuru",

    track:
      "Başvurumu takip et",

    about:
      "Hakkımızda",

    contact:
      "İletişim",

    cta:
      "Başvuru yap",
  },
};

export default function HomeHeader() {
  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "fr",
    );

  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(
      false,
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
  }, []);

  function changeLanguage(
    nextLanguage: Language,
  ) {
    setLanguage(
      nextLanguage,
    );

    window.localStorage.setItem(
      "if-sigorta-language",
      nextLanguage,
    );

    window.dispatchEvent(
      new CustomEvent(
        "if-sigorta-language-change",
        {
          detail: {
            language:
              nextLanguage,
          },
        },
      ),
    );
  }

  const t =
    labels[
      language
    ];

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8">
        <div className="flex h-[82px] items-center justify-between px-1 sm:px-3 lg:px-5">
          {/* LOGO */}

          <Link
            href="/"
            aria-label="IF Sigorta"
            className="flex shrink-0 items-center"
          >
            <div className="relative h-[100px] w-[240px] shrink-0 sm:h-[110px] sm:w-[270px] lg:h-[120px] lg:w-[310px]">
              <Image
              src="/if-sigorta-logo.png"
              alt="IF Sigorta"
              fill
              priority
              sizes="310px"
              className="object-contain object-left"
             />
          </div>
          </Link>

          {/* NAVIGATION DESKTOP */}

          <nav className="hidden items-center gap-6 xl:flex">
            <NavLink href="/">
              {
                t.home
              }
            </NavLink>

            <NavLink href="/demande/etape-1">
              {
                t.apply
              }
            </NavLink>

            <NavLink href="/suivi">
              {
                t.track
              }
            </NavLink>

            <NavLink href="/#fonctionnement">
              {
                t.about
              }
            </NavLink>

            <NavLink href="/#assistance">
              {
                t.contact
              }
            </NavLink>
          </nav>

          {/* ACTIONS DESKTOP */}

          <div className="hidden items-center gap-3 xl:flex">
            <div className="flex items-center rounded-xl border border-white/20 bg-black/10 p-1 backdrop-blur-md">
              {(
                [
                  "fr",
                  "en",
                  "tr",
                ] as Language[]
              ).map(
                (
                  item,
                ) => (
                  <button
                    key={
                      item
                    }
                    type="button"
                    onClick={() =>
                      changeLanguage(
                        item,
                      )
                    }
                    className={[
                      "rounded-lg px-3 py-1.5 text-[11px] font-black uppercase transition",

                      language ===
                      item
                        ? "bg-white text-[#0B5D3B] shadow-sm"
                        : "text-white/65 hover:text-white",
                    ].join(
                      " ",
                    )}
                  >
                    {
                      item
                    }
                  </button>
                ),
              )}
            </div>

            <Link
              href="/demande/etape-1"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#B8E83D] px-6 text-sm font-black text-[#14361F] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#C8F24D]"
            >
              {
                t.cta
              }
            </Link>
          </div>

          {/* MENU MOBILE / TABLETTE */}

          <button
            type="button"
            aria-label={
              menuOpen
                ? "Fermer le menu"
                : "Ouvrir le menu"
            }
            aria-expanded={
              menuOpen
            }
            onClick={() =>
              setMenuOpen(
                (
                  current,
                ) =>
                  !current,
              )
            }
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-black/10 text-white backdrop-blur-md transition hover:bg-white/10 xl:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* MENU MOBILE */}

      {menuOpen && (
        <div className="mx-auto max-w-[1600px] px-4 pt-2 sm:px-6 lg:px-8 xl:hidden">
          <div className="overflow-hidden rounded-[1.5rem] border border-white/15 bg-[#073E2A]/95 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <nav className="flex flex-col">
              <MobileLink
                href="/"
                label={
                  t.home
                }
                close={() =>
                  setMenuOpen(
                    false,
                  )
                }
              />

              <MobileLink
                href="/demande/etape-1"
                label={
                  t.apply
                }
                close={() =>
                  setMenuOpen(
                    false,
                  )
                }
              />

              <MobileLink
                href="/suivi"
                label={
                  t.track
                }
                close={() =>
                  setMenuOpen(
                    false,
                  )
                }
              />

              <MobileLink
                href="/#fonctionnement"
                label={
                  t.about
                }
                close={() =>
                  setMenuOpen(
                    false,
                  )
                }
              />

              <MobileLink
                href="/#assistance"
                label={
                  t.contact
                }
                close={() =>
                  setMenuOpen(
                    false,
                  )
                }
              />
            </nav>

            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center rounded-xl border border-white/15 bg-white/10 p-1">
                  {(
                    [
                      "fr",
                      "en",
                      "tr",
                    ] as Language[]
                  ).map(
                    (
                      item,
                    ) => (
                      <button
                        key={
                          item
                        }
                        type="button"
                        onClick={() =>
                          changeLanguage(
                            item,
                          )
                        }
                        className={[
                          "rounded-lg px-3 py-1.5 text-xs font-black uppercase transition",

                          language ===
                          item
                            ? "bg-white text-[#0B5D3B]"
                            : "text-white/60",
                        ].join(
                          " ",
                        )}
                      >
                        {
                          item
                        }
                      </button>
                    ),
                  )}
                </div>

                <Link
                  href="/demande/etape-1"
                  onClick={() =>
                    setMenuOpen(
                      false,
                    )
                  }
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#B8E83D] px-4 text-xs font-black text-[#14361F]"
                >
                  {
                    t.cta
                  }
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({
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
      className="relative py-2 text-sm font-semibold text-white/85 transition hover:text-white after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:rounded-full after:bg-[#B8E83D] after:transition-all hover:after:w-full"
    >
      {
        children
      }
    </Link>
  );
}

function MobileLink({
  href,
  label,
  close,
}: {
  href:
    string;

  label:
    string;

  close:
    () => void;
}) {
  return (
    <Link
      href={
        href
      }
      onClick={
        close
      }
      className="rounded-xl px-3 py-3.5 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
    >
      {
        label
      }
    </Link>
  );
}