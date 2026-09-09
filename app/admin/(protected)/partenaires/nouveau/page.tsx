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
    password,
    setPassword,
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
      !password ||
      !cleanedCountryCode ||
      !cleanedNumber
    ) {
      setErrorMessage(
        "Tous les champs sont obligatoires.",
      );

      return;
    }

    if (
      password.length < 8
    ) {
      setErrorMessage(
        "Le mot de passe doit contenir au moins 8 caractères.",
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

                password,

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
    "h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-[#102B20] outline-none transition placeholder:text-slate-400 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:h-12 sm:px-4 sm:text-sm";

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-4xl">
        <Link
          href="/admin/partenaires"
          className="inline-flex min-h-10 items-center gap-2 text-[13px] font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] sm:text-sm"
        >
          <span aria-hidden="true">
            ←
          </span>

          Retour aux partenaires
        </Link>

        <div className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white sm:mt-6 sm:rounded-[1.75rem]">
          <div className="border-b border-slate-100 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F8F2] text-lg font-black text-[#0B5D3B] sm:h-12 sm:w-12 sm:rounded-2xl sm:text-xl">
                +
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
                  Administration
                </p>

                <h1 className="mt-2 break-words text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-3xl">
                  Ajouter un partenaire
                </h1>

                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-500 sm:mt-3 sm:text-sm sm:leading-7">
                  Enregistrez un nouvel apporteur
                  d’affaires IF Sigorta et créez
                  son accès sécurisé à l’espace
                  partenaire.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="min-w-0 p-4 sm:p-6 lg:p-8"
          >
            <div>
              <div className="mb-4 min-w-0 sm:mb-5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs">
                  Partenaire
                </p>

                <h2 className="mt-2 text-base font-semibold text-[#102B20] sm:text-lg">
                  Informations générales
                </h2>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
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

            <div className="mt-6 min-w-0 border-t border-slate-100 pt-6 sm:mt-8 sm:pt-8">
              <div className="mb-4 min-w-0 sm:mb-5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs">
                  Connexion
                </p>

                <h2 className="mt-2 text-base font-semibold text-[#102B20] sm:text-lg">
                  Accès à l’espace partenaire
                </h2>

                <p className="mt-2 text-[13px] leading-6 text-slate-500 sm:text-sm">
                  L’adresse e-mail et le mot de
                  passe ci-dessous permettront au
                  partenaire de se connecter à son
                  espace.
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
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

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Mot de passe initial
                  </label>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(
                        event.target.value,
                      );

                      setErrorMessage("");
                    }}
                    autoComplete="new-password"
                    placeholder="8 caractères minimum"
                    minLength={8}
                    required
                    className={inputClassName}
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Minimum 8 caractères. Communiquez
                    ce mot de passe au partenaire de
                    manière sécurisée.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 min-w-0 border-t border-slate-100 pt-6 sm:mt-8 sm:pt-8">
              <div className="mb-4 min-w-0 sm:mb-5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs">
                  Contact
                </p>

                <h2 className="mt-2 text-base font-semibold text-[#102B20] sm:text-lg">
                  Coordonnées du partenaire
                </h2>
              </div>

              <div>
                <label
                  htmlFor="whatsappNumber"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Numéro WhatsApp
                </label>

                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[260px_minmax(0,1fr)]">
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

            <div className="mt-6 min-w-0 rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] p-4 sm:mt-8 sm:rounded-2xl sm:p-5">
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
              <div className="mt-5 min-w-0 break-words rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-[13px] leading-6 text-red-700 sm:mt-6 sm:px-4 sm:text-sm">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mt-5 min-w-0 break-words rounded-xl border border-[#CFE3CF] bg-[#F3F8F2] px-3 py-3 text-[13px] font-semibold text-[#0B5D3B] sm:mt-6 sm:px-4 sm:text-sm">
                {successMessage}
              </div>
            )}

            <div className="mt-6 flex min-w-0 flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:mt-8 sm:flex-row sm:justify-end sm:pt-6">
              <Link
                href="/admin/partenaires"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 sm:min-h-12 sm:w-auto sm:px-6 sm:text-sm"
              >
                Annuler
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#B8E83D] px-4 text-[13px] font-black text-[#15311F] transition hover:bg-[#C7F34E] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:min-h-12 sm:w-auto sm:px-6 sm:text-sm"
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