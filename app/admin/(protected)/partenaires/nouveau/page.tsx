"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

type ApiResponse = {
  success?: boolean;
  partnerId?: string;
  partnerCode?: string;
  error?: string;
};

const PARTNER_COUNTRIES = [
  {
    name: "Turquie",
    flag: "🇹🇷",
    code: "+90",
  },
  {
    name: "Bénin",
    flag: "🇧🇯",
    code: "+229",
  },
  {
    name: "Burkina Faso",
    flag: "🇧🇫",
    code: "+226",
  },
  {
    name: "Burundi",
    flag: "🇧🇮",
    code: "+257",
  },
  {
    name: "Cameroun",
    flag: "🇨🇲",
    code: "+237",
  },
  {
    name: "Comores",
    flag: "🇰🇲",
    code: "+269",
  },
  {
    name: "Congo",
    flag: "🇨🇬",
    code: "+242",
  },
  {
    name: "Côte d’Ivoire",
    flag: "🇨🇮",
    code: "+225",
  },
  {
    name: "Djibouti",
    flag: "🇩🇯",
    code: "+253",
  },
  {
    name: "Gabon",
    flag: "🇬🇦",
    code: "+241",
  },
  {
    name: "Guinée",
    flag: "🇬🇳",
    code: "+224",
  },
  {
    name: "Madagascar",
    flag: "🇲🇬",
    code: "+261",
  },
  {
    name: "Mali",
    flag: "🇲🇱",
    code: "+223",
  },
  {
    name: "Mauritanie",
    flag: "🇲🇷",
    code: "+222",
  },
  {
    name: "Niger",
    flag: "🇳🇪",
    code: "+227",
  },
  {
    name: "République centrafricaine",
    flag: "🇨🇫",
    code: "+236",
  },
  {
    name: "République démocratique du Congo",
    flag: "🇨🇩",
    code: "+243",
  },
  {
    name: "Rwanda",
    flag: "🇷🇼",
    code: "+250",
  },
  {
    name: "Sénégal",
    flag: "🇸🇳",
    code: "+221",
  },
  {
    name: "Seychelles",
    flag: "🇸🇨",
    code: "+248",
  },
  {
    name: "Tchad",
    flag: "🇹🇩",
    code: "+235",
  },
  {
    name: "Togo",
    flag: "🇹🇬",
    code: "+228",
  },
] as const;

export default function NouveauPartenairePage() {
  const router =
    useRouter();

  const [
    companyName,
    setCompanyName,
  ] = useState("");

  const [
    managerName,
    setManagerName,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    whatsappCountryCode,
    setWhatsappCountryCode,
  ] = useState("+90");

  const [
    whatsappNumber,
    setWhatsappNumber,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const cleanedCompanyName =
      companyName.trim();

    const cleanedManagerName =
      managerName.trim();

    const cleanedEmail =
      email
        .trim()
        .toLowerCase();

    const cleanedCountryCode =
      whatsappCountryCode.trim();

    const cleanedNumber =
      whatsappNumber.replace(
        /\D/g,
        "",
      );

    if (
      !cleanedCompanyName ||
      !cleanedManagerName ||
      !cleanedEmail ||
      !cleanedCountryCode ||
      !cleanedNumber
    ) {
      setErrorMessage(
        "Tous les champs sont obligatoires.",
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/admin/partners",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                companyName:
                  cleanedCompanyName,

                managerName:
                  cleanedManagerName,

                email:
                  cleanedEmail,

                whatsappCountryCode:
                  cleanedCountryCode,

                whatsappNumber:
                  cleanedNumber,
              }),
          },
        );

      const result =
        (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Le partenaire n’a pas pu être créé.",
        );
      }

      setSuccessMessage(
        result.partnerCode
          ? `Partenaire créé avec succès. Code : ${result.partnerCode}`
          : "Partenaire créé avec succès.",
      );

      setTimeout(() => {
        router.push(
          result.partnerId
            ? `/admin/partenaires/${result.partnerId}`
            : "/admin/partenaires",
        );

        router.refresh();
      }, 1000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClassName =
    "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#102B20] outline-none transition placeholder:text-slate-400 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10";

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/partenaires"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B5D3B] transition hover:text-[#084A2F]"
        >
          <span aria-hidden="true">
            ←
          </span>

          Retour aux partenaires
        </Link>

        <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white">
          <div className="border-b border-slate-100 px-6 py-7 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3F8F2] text-xl font-black text-[#0B5D3B]">
                +
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                  Administration
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#102B20]">
                  Ajouter un partenaire
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                  Enregistrez un nouvel apporteur
                  d’affaires IF Sigorta. Ses tarifs
                  seront configurés séparément.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8"
          >
            <div>
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                  Partenaire
                </p>

                <h2 className="mt-2 text-lg font-semibold text-[#102B20]">
                  Informations générales
                </h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="companyName"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Nom du partenaire
                  </label>

                  <input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(event) => {
                      setCompanyName(
                        event.target.value,
                      );

                      setErrorMessage("");
                    }}
                    placeholder="Ex. EasyLearn"
                    required
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="managerName"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Responsable
                  </label>

                  <input
                    id="managerName"
                    type="text"
                    value={managerName}
                    onChange={(event) => {
                      setManagerName(
                        event.target.value,
                      );

                      setErrorMessage("");
                    }}
                    placeholder="Nom complet"
                    required
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-8">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                  Contact
                </p>

                <h2 className="mt-2 text-lg font-semibold text-[#102B20]">
                  Coordonnées du partenaire
                </h2>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Adresse e-mail
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(
                      event.target.value,
                    );

                    setErrorMessage("");
                  }}
                  autoComplete="email"
                  placeholder="exemple@email.com"
                  required
                  className={inputClassName}
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor="whatsappNumber"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Numéro WhatsApp
                </label>

                <div className="grid gap-3 sm:grid-cols-[260px_1fr]">
                  <select
                    id="whatsappCountryCode"
                    value={whatsappCountryCode}
                    onChange={(event) => {
                      setWhatsappCountryCode(
                        event.target.value,
                      );

                      setErrorMessage("");
                    }}
                    required
                    className={inputClassName}
                  >
                    {PARTNER_COUNTRIES.map(
                      (country) => (
                        <option
                          key={
                            country.code
                          }
                          value={
                            country.code
                          }
                        >
                          {country.flag}{" "}
                          {country.name} (
                          {country.code})
                        </option>
                      ),
                    )}
                  </select>

                  <input
                    id="whatsappNumber"
                    type="tel"
                    inputMode="tel"
                    value={whatsappNumber}
                    onChange={(event) => {
                      setWhatsappNumber(
                        event.target.value,
                      );

                      setErrorMessage("");
                    }}
                    placeholder="5XXXXXXXXX"
                    autoComplete="tel"
                    required
                    className={inputClassName}
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Sélectionnez le pays puis
                  saisissez le numéro WhatsApp
                  sans l’indicatif international.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-[#CFE3CF] bg-[#F3F8F2] p-5">
              <p className="font-semibold text-[#102B20]">
                Code partenaire
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Le code partenaire sera généré
                automatiquement lors de la création
                du partenaire.
              </p>
            </div>

            {errorMessage && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mt-6 rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-4 py-3 text-sm font-semibold text-[#0B5D3B]">
                {successMessage}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/admin/partenaires"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Annuler
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#B8E83D] px-6 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {loading
                  ? "Création..."
                  : "Créer le partenaire"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}