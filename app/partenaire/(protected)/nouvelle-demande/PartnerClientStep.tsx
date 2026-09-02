"use client";

import {
  FormEvent,
  useState,
} from "react";

import AddressSelector from "@/components/AddressSelector";
import PhoneInput from "@/components/PhoneInput";

import type {
  PartnerRequestFormData,
} from "./partnerRequestTypes";

type PartnerClientStepProps = {
  data: PartnerRequestFormData;

  onChange: (
    data: PartnerRequestFormData,
  ) => void;

  onNext: () => void;
};

const partnerPhoneCountryCodes = [
  "+90", // Turquie
  "+229", // Bénin
  "+226", // Burkina Faso
  "+257", // Burundi
  "+237", // Cameroun
  "+269", // Comores
  "+242", // Congo
  "+225", // Côte d’Ivoire
  "+253", // Djibouti
  "+241", // Gabon
  "+224", // Guinée
  "+261", // Madagascar
  "+223", // Mali
  "+222", // Mauritanie
  "+227", // Niger
  "+236", // République centrafricaine
  "+243", // République démocratique du Congo
  "+250", // Rwanda
  "+221", // Sénégal
  "+248", // Seychelles
  "+235", // Tchad
  "+228", // Togo
];

const nationalities = [
  "Afghane",
  "Albanaise",
  "Algérienne",
  "Allemande",
  "Américaine",
  "Angolaise",
  "Béninoise",
  "Burkinabè",
  "Burundaise",
  "Camerounaise",
  "Canadienne",
  "Centrafricaine",
  "Chinoise",
  "Comorienne",
  "Congolaise",
  "Ivoirienne",
  "Djiboutienne",
  "Égyptienne",
  "Érythréenne",
  "Éthiopienne",
  "Française",
  "Gabonaise",
  "Gambienne",
  "Ghanéenne",
  "Guinéenne",
  "Kényane",
  "Libérienne",
  "Libyenne",
  "Malienne",
  "Marocaine",
  "Mauricienne",
  "Mauritanienne",
  "Mozambicaine",
  "Nigérienne",
  "Nigériane",
  "Ougandaise",
  "Rwandaise",
  "Sénégalaise",
  "Seychelloise",
  "Sierra-léonaise",
  "Somalienne",
  "Soudanaise",
  "Sud-africaine",
  "Sud-soudanaise",
  "Tanzanienne",
  "Tchadienne",
  "Togolaise",
  "Tunisienne",
  "Turque",
  "Zambienne",
  "Zimbabwéenne",
];

function uppercaseName(
  value: string,
) {
  return value.toLocaleUpperCase(
    "fr-FR",
  );
}

export default function PartnerClientStep({
  data,
  onChange,
  onNext,
}: PartnerClientStepProps) {
  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  function updateField<
    K extends keyof PartnerRequestFormData,
  >(
    field: K,
    value: PartnerRequestFormData[K],
  ) {
    onChange({
      ...data,
      [field]: value,
    });
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);

    if (
      !data.firstName.trim() ||
      !data.lastName.trim() ||
      !data.fatherName.trim()
    ) {
      setError(
        "Veuillez renseigner le nom, le prénom et le nom du père.",
      );

      return;
    }

    if (
      !data.birthDate
    ) {
      setError(
        "Veuillez renseigner la date de naissance.",
      );

      return;
    }

    if (
      data.gender !==
        "male" &&
      data.gender !==
        "female"
    ) {
      setError(
        "Veuillez sélectionner le sexe du client.",
      );

      return;
    }

    if (
      !data.nationality.trim()
    ) {
      setError(
        "Veuillez sélectionner la nationalité du client.",
      );

      return;
    }

    if (
      !data.whatsappCountryCode ||
      !data.whatsappNumber.trim()
    ) {
      setError(
        "Veuillez renseigner le numéro WhatsApp du client.",
      );

      return;
    }

    if (
      !partnerPhoneCountryCodes.includes(
        data.whatsappCountryCode,
      )
    ) {
      setError(
        "L’indicatif WhatsApp sélectionné n’est pas autorisé.",
      );

      return;
    }

    if (
      !data.address.provinceId ||
      !data.address.districtId ||
      !data.address.neighborhoodId
    ) {
      setError(
        "Veuillez sélectionner la province, le district et le quartier.",
      );

      return;
    }

    if (
      !data.address.street.trim()
    ) {
      setError(
        "Veuillez renseigner la rue ou l’adresse.",
      );

      return;
    }

    if (
      !data.address.buildingNumber.trim()
    ) {
      setError(
        "Veuillez renseigner le numéro du bâtiment.",
      );

      return;
    }

    onNext();
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-6"
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
          Étape 1 sur 4
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#102B20] sm:text-3xl">
          Informations du client
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Renseignez les informations
          personnelles et l’adresse de
          la personne à assurer.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="firstName"
            className="mb-2 block font-medium text-slate-800"
          >
            Prénom complet
          </label>

          <input
            id="firstName"
            name="firstName"
            type="text"
            value={
              data.firstName
            }
            onChange={(
              event,
            ) =>
              updateField(
                "firstName",
                uppercaseName(
                  event.target.value,
                ),
              )
            }
            required
            autoComplete="given-name"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
          />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="mb-2 block font-medium text-slate-800"
          >
            Nom complet
          </label>

          <input
            id="lastName"
            name="lastName"
            type="text"
            value={
              data.lastName
            }
            onChange={(
              event,
            ) =>
              updateField(
                "lastName",
                uppercaseName(
                  event.target.value,
                ),
              )
            }
            required
            autoComplete="family-name"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
          />
        </div>

        <div>
          <label
            htmlFor="fatherName"
            className="mb-2 block font-medium text-slate-800"
          >
            Nom complet du père
          </label>

          <input
            id="fatherName"
            name="fatherName"
            type="text"
            value={
              data.fatherName
            }
            onChange={(
              event,
            ) =>
              updateField(
                "fatherName",
                uppercaseName(
                  event.target.value,
                ),
              )
            }
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
          />
        </div>

        <div>
          <label
            htmlFor="birthDate"
            className="mb-2 block font-medium text-slate-800"
          >
            Date de naissance
          </label>

          <input
            id="birthDate"
            name="birthDate"
            type="date"
            value={
              data.birthDate
            }
            onChange={(
              event,
            ) =>
              updateField(
                "birthDate",
                event.target.value,
              )
            }
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
          />
        </div>

        <div>
          <label
            htmlFor="gender"
            className="mb-2 block font-medium text-slate-800"
          >
            Sexe
          </label>

          <select
            id="gender"
            name="gender"
            value={
              data.gender
            }
            onChange={(
              event,
            ) =>
              updateField(
                "gender",
                event.target
                  .value as
                  | ""
                  | "male"
                  | "female",
              )
            }
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
          >
            <option value="">
              Sélectionner
            </option>

            <option value="male">
              Homme
            </option>

            <option value="female">
              Femme
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="nationality"
            className="mb-2 block font-medium text-slate-800"
          >
            Nationalité
          </label>

          <select
            id="nationality"
            name="nationality"
            value={
              data.nationality
            }
            onChange={(
              event,
            ) =>
              updateField(
                "nationality",
                event.target.value,
              )
            }
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
          >
            <option value="">
              Sélectionner
            </option>

            {nationalities.map(
              (
                nationality,
              ) => (
                <option
                  key={
                    nationality
                  }
                  value={
                    nationality
                  }
                >
                  {nationality}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-black text-[#102B20]">
          Contact WhatsApp
        </h3>

        <p className="mt-1 mb-4 text-sm leading-6 text-slate-500">
          Le numéro est enregistré dans
          le dossier du client.
        </p>

        <PhoneInput
          countryCode={
            data.whatsappCountryCode
          }
          phoneNumber={
            data.whatsappNumber
          }
          onCountryCodeChange={(
            value,
          ) =>
            updateField(
              "whatsappCountryCode",
              value,
            )
          }
          onPhoneNumberChange={(
            value,
          ) =>
            updateField(
              "whatsappNumber",
              value,
            )
          }
          allowedCountryCodes={
            partnerPhoneCountryCodes
          }
        />
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-black text-[#102B20]">
          Adresse en Turquie
        </h3>

        <p className="mt-1 mb-4 text-sm leading-6 text-slate-500">
          Sélectionnez l’adresse
          complète de la personne à
          assurer.
        </p>

        <AddressSelector
          value={
            data.address
          }
          onChange={(
            address,
          ) =>
            updateField(
              "address",
              address,
            )
          }
        />
      </div>

      <div className="flex justify-end border-t border-slate-200 pt-6">
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0B5D3B] px-6 py-3 font-black text-white transition hover:bg-[#084A2F] focus:outline-none focus:ring-4 focus:ring-[#0B5D3B]/20"
        >
          Continuer
          <span
            aria-hidden="true"
            className="ml-2"
          >
            →
          </span>
        </button>
      </div>
    </form>
  );
}