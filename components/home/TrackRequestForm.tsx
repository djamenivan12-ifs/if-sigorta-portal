"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";

const countryCodes = [
  { flag: "🇹🇷", code: "+90" },
  { flag: "🇨🇲", code: "+237" },
  { flag: "🇳🇬", code: "+234" },
  { flag: "🇬🇭", code: "+233" },
  { flag: "🇸🇳", code: "+221" },
  { flag: "🇨🇮", code: "+225" },
  { flag: "🇹🇩", code: "+235" },
  { flag: "🇬🇦", code: "+241" },
  { flag: "🇨🇬", code: "+242" },
  { flag: "🇨🇩", code: "+243" },
];

export default function TrackRequestForm() {
  const router = useRouter();

  const [requestCode, setRequestCode] =
    useState("");

  const [
    whatsappCountryCode,
    setWhatsappCountryCode,
  ] = useState("+90");

  const [
    whatsappNumber,
    setWhatsappNumber,
  ] = useState("");

  const [error, setError] =
    useState("");

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
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
      setError(
        "Saisissez votre code de dossier.",
      );
      return;
    }

    if (!phone) {
      setError(
        "Saisissez votre numéro WhatsApp.",
      );
      return;
    }

    setError("");

    const params =
      new URLSearchParams({
        code,
        country:
          whatsappCountryCode,
        phone,
      });

    router.push(
      `/suivi?${params.toString()}`,
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full"
    >
      <div>
        <label
          htmlFor="home-request-code"
          className="text-sm font-bold text-slate-700"
        >
          Code du dossier
        </label>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            id="home-request-code"
            type="text"
            value={requestCode}
            onChange={(event) => {
              setRequestCode(
                event.target.value.toUpperCase(),
              );
              setError("");
            }}
            placeholder="IFS-260808-DF56"
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm font-semibold uppercase text-slate-900 outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
          />
        </div>
      </div>

      <div className="mt-4">
        <label
          htmlFor="home-whatsapp"
          className="text-sm font-bold text-slate-700"
        >
          Numéro WhatsApp
        </label>

        <div className="mt-3 flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-[#2F2963] focus-within:ring-4 focus-within:ring-[#2F2963]/10">
          <select
            value={
              whatsappCountryCode
            }
            onChange={(event) =>
              setWhatsappCountryCode(
                event.target.value,
              )
            }
            aria-label="Indicatif téléphonique"
            className="border-r border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            {countryCodes.map(
              (item) => (
                <option
                  key={item.code}
                  value={item.code}
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
            onChange={(event) => {
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
            className="h-12 min-w-0 flex-1 px-4 text-sm text-slate-900 outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#18C100] px-5 text-sm font-bold text-white transition hover:bg-[#13a300]"
      >
        Suivre mon dossier

        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}