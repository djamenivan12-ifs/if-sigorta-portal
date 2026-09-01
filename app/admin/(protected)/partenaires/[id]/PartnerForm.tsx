"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";

type Partner = {
  id: string;
  code: string;
  companyName: string;
  managerName: string;
  email: string;
  whatsappCountryCode: string;
  whatsappNumber: string;
  isActive: boolean;
};

type PartnerFormProps = {
  partner: Partner;
  dossierCount: number;
};

type ApiResponse = {
  success?: boolean;
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

export default function PartnerForm({
  partner,
  dossierCount,
}: PartnerFormProps) {
  const router =
    useRouter();

  const [
    companyName,
    setCompanyName,
  ] = useState(
    partner.companyName,
  );

  const [
    managerName,
    setManagerName,
  ] = useState(
    partner.managerName,
  );

  const [
    email,
    setEmail,
  ] = useState(
    partner.email,
  );

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    whatsappCountryCode,
    setWhatsappCountryCode,
  ] = useState(
    partner.whatsappCountryCode,
  );

  const [
    whatsappNumber,
    setWhatsappNumber,
  ] = useState(
    partner.whatsappNumber,
  );

  const [
    isActive,
    setIsActive,
  ] = useState(
    partner.isActive,
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    changingStatus,
    setChangingStatus,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const inputClassName =
    "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#102B20] outline-none transition placeholder:text-slate-400 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10";

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    clearMessages();

    const cleanedCompanyName =
      companyName.trim();

    const cleanedManagerName =
      managerName.trim();

    const cleanedEmail =
      email
        .trim()
        .toLowerCase();

    const cleanedNumber =
      whatsappNumber.replace(
        /\D/g,
        "",
      );

    if (
      !cleanedCompanyName ||
      !cleanedManagerName ||
      !cleanedEmail ||
      !whatsappCountryCode ||
      !cleanedNumber
    ) {
      setErrorMessage(
        "Tous les champs sont obligatoires.",
      );

      return;
    }

    if (
      password &&
      password.length < 8
    ) {
      setErrorMessage(
        "Le nouveau mot de passe doit contenir au moins 8 caractères.",
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setErrorMessage(
        "Les deux mots de passe ne correspondent pas.",
      );

      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          `/api/admin/partners/${partner.id}`,
          {
            method: "PATCH",

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

                password:
                  password ||
                  undefined,

                whatsappCountryCode,

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
            "Les modifications n’ont pas pu être enregistrées.",
        );
      }

      setCompanyName(
        cleanedCompanyName,
      );

      setManagerName(
        cleanedManagerName,
      );

      setEmail(
        cleanedEmail,
      );

      setWhatsappNumber(
        cleanedNumber,
      );

      setPassword("");
      setConfirmPassword("");

      setSuccessMessage(
        password
          ? "Informations et mot de passe mis à jour avec succès."
          : "Modifications enregistrées avec succès.",
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange() {
    clearMessages();

    setChangingStatus(true);

    try {
      const response =
        await fetch(
          `/api/admin/partners/${partner.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                isActive:
                  !isActive,
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
            "Le statut du partenaire n’a pas pu être modifié.",
        );
      }

      const nextStatus =
        !isActive;

      setIsActive(
        nextStatus,
      );

      setSuccessMessage(
        nextStatus
          ? "Le partenaire a été réactivé."
          : "Le partenaire a été désactivé.",
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleDelete() {
    clearMessages();

    if (
      dossierCount > 0
    ) {
      setErrorMessage(
        "Ce partenaire possède déjà des dossiers. Désactivez-le afin de conserver l’historique.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Supprimer définitivement ${partner.companyName} ? Cette action supprimera également son compte de connexion.`,
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response =
        await fetch(
          `/api/admin/partners/${partner.id}`,
          {
            method: "DELETE",
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
            "Le partenaire n’a pas pu être supprimé.",
        );
      }

      router.push(
        "/admin/partenaires",
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );

      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white">
        <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
            Partenaire
          </p>

          <h2 className="mt-2 text-xl font-semibold text-[#102B20]">
            Modifier le partenaire
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Modifiez les informations commerciales,
            les coordonnées et les accès du partenaire.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 sm:p-8"
        >
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

                  clearMessages();
                }}
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

                  clearMessages();
                }}
                required
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mt-5">
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

                clearMessages();
              }}
              autoComplete="email"
              required
              className={inputClassName}
            />

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Cette adresse sert également
              d’identifiant de connexion du partenaire.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                Sécurité
              </p>

              <h3 className="mt-2 font-semibold text-[#102B20]">
                Modifier le mot de passe
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Laissez les deux champs vides
                si vous ne souhaitez pas modifier
                le mot de passe du partenaire.
              </p>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Nouveau mot de passe
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(
                      event.target.value,
                    );

                    clearMessages();
                  }}
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
                  className={inputClassName}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Confirmer le mot de passe
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(
                      event.target.value,
                    );

                    clearMessages();
                  }}
                  autoComplete="new-password"
                  placeholder="Répétez le mot de passe"
                  className={inputClassName}
                />
              </div>
            </div>
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

                  clearMessages();
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

                  clearMessages();
                }}
                autoComplete="tel"
                required
                className={inputClassName}
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Saisissez le numéro sans
              l’indicatif international.
            </p>
          </div>

          <div className="mt-5">
            <label
              htmlFor="partnerCode"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Code partenaire
            </label>

            <input
              id="partnerCode"
              type="text"
              value={partner.code}
              readOnly
              className="h-12 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm font-semibold text-slate-500 outline-none"
            />

            <p className="mt-2 text-xs text-slate-400">
              Le code partenaire est unique
              et ne peut pas être modifié.
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

          <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
            <button
              type="submit"
              disabled={
                saving ||
                changingStatus ||
                deleting
              }
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#B8E83D] px-6 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {saving
                ? "Enregistrement..."
                : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white">
        <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Accès
          </p>

          <h2 className="mt-2 text-xl font-semibold text-[#102B20]">
            Statut du partenaire
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  isActive
                    ? "border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {isActive
                  ? "Actif"
                  : "Inactif"}
              </span>

              <p className="font-semibold text-[#102B20]">
                {isActive
                  ? "Accès autorisé"
                  : "Accès désactivé"}
              </p>
            </div>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              {isActive
                ? "Le partenaire est actuellement actif."
                : "Le partenaire est désactivé. Son historique reste conservé."}
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleStatusChange
            }
            disabled={
              saving ||
              changingStatus ||
              deleting
            }
            className={`inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isActive
                ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
                : "bg-[#0B5D3B] text-white hover:bg-[#084A2F]"
            }`}
          >
            {changingStatus
              ? "Modification..."
              : isActive
                ? "Désactiver"
                : "Réactiver"}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border border-red-200 bg-white">
        <div className="border-b border-red-100 px-6 py-6 sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-red-600">
            Zone sensible
          </p>

          <h2 className="mt-2 text-xl font-semibold text-[#102B20]">
            Supprimer le partenaire
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="font-semibold text-[#102B20]">
              Suppression définitive
            </p>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              {dossierCount > 0
                ? `Ce partenaire possède ${dossierCount} dossier${dossierCount > 1 ? "s" : ""}. Il ne peut donc pas être supprimé définitivement.`
                : "Ce partenaire ne possède aucun dossier et peut être supprimé définitivement."}
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleDelete
            }
            disabled={
              dossierCount > 0 ||
              saving ||
              changingStatus ||
              deleting
            }
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {deleting
              ? "Suppression..."
              : "Supprimer définitivement"}
          </button>
        </div>
      </section>

      <div>
        <Link
          href="/admin/partenaires"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B5D3B] transition hover:text-[#084A2F]"
        >
          <span aria-hidden="true">
            ←
          </span>

          Retour aux partenaires
        </Link>
      </div>
    </div>
  );
}