"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type PartnerFormProps = {
  partner: {
    id: string;
    code: string;
    companyName: string;
    managerName: string;
    email: string;
    whatsappCountryCode: string;
    whatsappNumber: string;
    isActive: boolean;
  };
  dossierCount: number;
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  message?: string;
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

      setSuccessMessage(
        "Les informations du partenaire ont été mises à jour.",
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

    const nextStatus =
      !isActive;

    const confirmationMessage =
      nextStatus
        ? "Voulez-vous réactiver ce partenaire ?"
        : "Voulez-vous désactiver ce partenaire ? Il ne pourra plus utiliser son espace partenaire tant qu’il restera inactif.";

    if (
      !window.confirm(
        confirmationMessage,
      )
    ) {
      return;
    }

    setChangingStatus(
      true,
    );

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
                  nextStatus,
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
      setChangingStatus(
        false,
      );
    }
  }

  async function handleDelete() {
    clearMessages();

    if (
      dossierCount > 0
    ) {
      setErrorMessage(
        "Ce partenaire possède déjà des dossiers. Il doit être désactivé afin de conserver l’historique.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Supprimer définitivement ${partner.companyName} ? Cette action est irréversible.`,
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
            Informations
          </p>

          <h2 className="mt-2 text-xl font-semibold text-[#102B20]">
            Modifier le partenaire
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Modifiez les informations commerciales
            et les coordonnées du partenaire.
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
                  ? "Partenaire autorisé"
                  : "Partenaire désactivé"}
              </p>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              {isActive
                ? "Ce partenaire est actuellement autorisé. Son accès à l’espace partenaire sera pris en compte lors de la mise en place de l’authentification."
                : "Ce partenaire est désactivé et ne devra pas pouvoir accéder à son espace partenaire."}
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleStatusChange
            }
            disabled={
              changingStatus ||
              saving ||
              deleting
            }
            className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isActive
                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B] hover:bg-[#E8F3E6]"
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
          <p className="text-xs font-black uppercase tracking-[0.14em] text-red-500">
            Zone sensible
          </p>

          <h2 className="mt-2 text-xl font-semibold text-[#102B20]">
            Supprimer le partenaire
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            {dossierCount ===
            0 ? (
              <>
                <p className="font-semibold text-[#102B20]">
                  Suppression définitive
                </p>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Ce partenaire ne possède
                  actuellement aucun dossier. Il
                  peut donc être supprimé
                  définitivement.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-[#102B20]">
                  Suppression impossible
                </p>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Ce partenaire possède{" "}
                  <strong>
                    {dossierCount} dossier
                    {dossierCount !==
                    1
                      ? "s"
                      : ""}
                  </strong>
                  . Pour conserver la
                  traçabilité, il doit être
                  désactivé plutôt que supprimé.
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={
              handleDelete
            }
            disabled={
              deleting ||
              saving ||
              changingStatus ||
              dossierCount > 0
            }
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {deleting
              ? "Suppression..."
              : "Supprimer définitivement"}
          </button>
        </div>
      </section>
    </div>
  );
}