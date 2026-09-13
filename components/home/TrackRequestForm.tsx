"use client";
import { useLanguage } from "@/lib/useLanguage";


import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  ArrowRight,
  Search,
} from "lucide-react";

import {
  countryCodes,
} from "@/lib/countryCodes";

export default function TrackRequestForm() {
  const router = useRouter();
 const [language]=useLanguage();
 const t={fr:{code:"Code du dossier",phone:"Numéro WhatsApp",dial:"Indicatif téléphonique",submit:"Suivre mon dossier",missingCode:"Saisissez votre code de dossier.",missingPhone:"Saisissez votre numéro WhatsApp.",storage:"Votre navigateur bloque le stockage temporaire. Ouvrez le suivi depuis le menu et saisissez vos informations."},en:{code:"Request code",phone:"WhatsApp number",dial:"Country calling code",submit:"Track my request",missingCode:"Enter your request code.",missingPhone:"Enter your WhatsApp number.",storage:"Your browser blocks temporary storage. Open tracking from the menu and enter your details."},tr:{code:"Başvuru kodu",phone:"WhatsApp numarası",dial:"Telefon ülke kodu",submit:"Başvurumu takip et",missingCode:"Başvuru kodunuzu girin.",missingPhone:"WhatsApp numaranızı girin.",storage:"Tarayıcınız geçici depolamayı engelliyor. Menüden takip sayfasını açıp bilgilerinizi girin."}}[language];

  const [
    requestCode,
    setRequestCode,
  ] =
    useState("");

  const [
    whatsappCountryCode,
    setWhatsappCountryCode,
  ] =
    useState(
      "+90",
    );

  const [
    whatsappNumber,
    setWhatsappNumber,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const code =
      requestCode
        .trim()
        .toUpperCase();

    const phone =
      whatsappNumber.replace(
        /\D/g,
        "",
      );

    if (!code) {
      setError(t.missingCode);

      return;
    }

    if (!phone) {
      setError(t.missingPhone);

      return;
    }

    setError("");

    try {window.sessionStorage.setItem("if-sigorta-tracking",JSON.stringify({code,country:whatsappCountryCode,phone,expiresAt:Date.now()+15*60*1000}));router.push("/suivi");} catch {setError(t.storage);}
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="w-full"
    >
      {/* CODE DOSSIER */}

      <div>
        <label
          htmlFor="home-request-code"
          className="text-sm font-bold text-slate-700"
        >{t.code}</label>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            id="home-request-code"
            type="text"
            value={
              requestCode
            }
            onChange={(
              event,
            ) => {
              setRequestCode(
                event.target.value.toUpperCase(),
              );

              setError("");
            }}
            placeholder="IFS-260808-DF56"
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold uppercase text-[#102B20] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
          />
        </div>
      </div>

      {/* WHATSAPP */}

      <div className="mt-4">
        <label
          htmlFor="home-whatsapp"
          className="text-sm font-bold text-slate-700"
        >{t.phone}</label>

        <div className="mt-3 flex overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 focus-within:border-[#0B5D3B] focus-within:ring-4 focus-within:ring-[#0B5D3B]/10">
          <select
            value={
              whatsappCountryCode
            }
            onChange={(
              event,
            ) =>
              setWhatsappCountryCode(
                event.target.value,
              )
            }
            aria-label={t.dial}
            className="max-w-[180px] border-r border-slate-200 bg-[#FAFCFA] px-3 text-sm font-semibold text-slate-700 outline-none"
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
                  {item.flag}{" "}
                  {item.code}
                </option>
              ),
            )}
          </select>

          <input
            id="home-whatsapp"
            type="tel"
            inputMode="numeric"
            value={
              whatsappNumber
            }
            onChange={(
              event,
            ) => {
              setWhatsappNumber(
                event.target.value.replace(
                  /\D/g,
                  "",
                ),
              );

              setError("");
            }}
            placeholder="5XXXXXXXXX"
            autoComplete="tel"
            className="h-12 min-w-0 flex-1 bg-white px-4 text-sm text-[#102B20] outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ERREUR */}

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {/* BOUTON */}

      <button
        type="submit"
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B8E83D] px-5 text-sm font-black text-[#15311F] transition hover:-translate-y-0.5 hover:bg-[#C8F24D]"
      >{t.submit}<ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}