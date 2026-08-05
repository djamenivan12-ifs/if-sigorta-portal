"use client";

import { FormEvent, useMemo, useState } from "react";
import AddressSelector, {
  AddressValue,
} from "@/components/AddressSelector";
import {
  calculateInsurancePrice,
  InsuranceDuration,
} from "@/lib/insurance/calculatePrice";

const countryCodes = [
  { country: "Türkiye", flag: "🇹🇷", code: "+90" },
  { country: "Cameroun", flag: "🇨🇲", code: "+237" },
  { country: "Nigeria", flag: "🇳🇬", code: "+234" },
  { country: "Ghana", flag: "🇬🇭", code: "+233" },
  { country: "Sénégal", flag: "🇸🇳", code: "+221" },
  { country: "Côte d’Ivoire", flag: "🇨🇮", code: "+225" },
  { country: "Tchad", flag: "🇹🇩", code: "+235" },
  { country: "Gabon", flag: "🇬🇦", code: "+241" },
  { country: "Congo", flag: "🇨🇬", code: "+242" },
  { country: "RDC", flag: "🇨🇩", code: "+243" },
];

export default function DemandePage() {
  const [birthDate, setBirthDate] = useState("");
  const [duration, setDuration] =
    useState<InsuranceDuration>(1);

  const [countryCode, setCountryCode] = useState("+90");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [address, setAddress] = useState<AddressValue>({
    provinceId: "",
    districtId: "",
    neighborhoodId: "",
    street: "",
    buildingNumber: "",
    apartmentNumber: "",
  });

  const priceResult = useMemo(() => {
    if (!birthDate) {
      return null;
    }

    return calculateInsurancePrice(
      birthDate,
      duration,
    );
  }, [birthDate, duration]);

  function handlePhoneChange(value: string) {
    setPhoneNumber(value.replace(/\D/g, ""));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const completeWhatsappNumber =
      `${countryCode}${phoneNumber}`;

    const requestData = {
      lastName: formData.get("lastName"),
      firstName: formData.get("firstName"),
      fatherName: formData.get("fatherName"),
      birthDate,
      gender: formData.get("gender"),
      nationality: formData.get("nationality"),
      kimlikNumber: formData.get("kimlikNumber"),
      kimlikExpirationDate:
        formData.get("kimlikExpirationDate"),
      passportNumber: formData.get("passportNumber"),
      insuranceDurationYears: duration,
      calculatedAge: priceResult?.age ?? null,
      calculatedPrice: priceResult?.price ?? null,
      whatsapp: completeWhatsappNumber,
      address,
    };

    console.log("Données de la demande :", requestData);

    alert("Informations validées.");
  }

  const inputClassName =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <a
          href="/"
          className="mb-6 inline-block font-medium text-blue-700 hover:underline"
        >
          ← Retour à l’accueil
        </a>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
          <p className="mb-2 text-sm font-semibold text-blue-700">
            Étape 1 sur 5
          </p>

          <div className="mb-8 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/5 rounded-full bg-blue-700" />
          </div>

          <h1 className="mb-2 text-3xl font-bold text-slate-900">
            Demande d’assurance
          </h1>

          <p className="mb-8 text-slate-600">
            Remplissez les informations exactement comme elles
            apparaissent sur vos documents officiels.
          </p>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <section className="space-y-5">
              <h2 className="text-xl font-bold text-slate-900">
                Informations personnelles
              </h2>

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
                  required
                  className={inputClassName}
                />
              </div>

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
                  required
                  className={inputClassName}
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
                  required
                  className={inputClassName}
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
                  value={birthDate}
                  onChange={(event) =>
                    setBirthDate(event.target.value)
                  }
                  required
                  className={inputClassName}
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
                  defaultValue=""
                  required
                  className={inputClassName}
                >
                  <option value="" disabled>
                    Sélectionner
                  </option>

                  <option value="male">Homme</option>
                  <option value="female">Femme</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="nationality"
                  className="mb-2 block font-medium text-slate-800"
                >
                  Nationalité
                </label>

                <input
                  id="nationality"
                  name="nationality"
                  type="text"
                  required
                  className={inputClassName}
                />
              </div>
            </section>

            <AddressSelector value={address} onChange={setAddress} />

            <section className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-xl font-bold text-slate-900">
                Pièces d’identité
              </h2>

              <div>
                <label
                  htmlFor="kimlikNumber"
                  className="mb-2 block font-medium text-slate-800"
                >
                  Numéro de Kimlik
                </label>

                <input
                  id="kimlikNumber"
                  name="kimlikNumber"
                  type="text"
                  inputMode="numeric"
                  required
                  className={inputClassName}
                />
              </div>

              <div>
                <label
                  htmlFor="kimlikExpirationDate"
                  className="mb-2 block font-medium text-slate-800"
                >
                  Date d’expiration du Kimlik
                </label>

                <input
                  id="kimlikExpirationDate"
                  name="kimlikExpirationDate"
                  type="date"
                  required
                  className={inputClassName}
                />
              </div>

              <div>
                <label
                  htmlFor="passportNumber"
                  className="mb-2 block font-medium text-slate-800"
                >
                  Numéro du passeport
                </label>

                <input
                  id="passportNumber"
                  name="passportNumber"
                  type="text"
                  required
                  className={inputClassName}
                />
              </div>
            </section>

            <section className="space-y-5 rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Durée de l’assurance
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Le tarif est calculé selon l’année de naissance
                  et la durée choisie.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDuration(1)}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    duration === 1
                      ? "border-blue-700 bg-white ring-2 ring-blue-100"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  <span className="block font-semibold text-slate-900">
                    1 an
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDuration(2)}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    duration === 2
                      ? "border-blue-700 bg-white ring-2 ring-blue-100"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  <span className="block font-semibold text-slate-900">
                    2 ans
                  </span>
                </button>
              </div>

              {priceResult && (
                <div className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-slate-500">
                        Âge retenu
                      </p>

                      <p className="text-2xl font-bold text-slate-900">
                        {priceResult.age} ans
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">
                        Durée
                      </p>

                      <p className="text-2xl font-bold text-slate-900">
                        {priceResult.duration} an
                        {priceResult.duration === 2 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-200 pt-5">
                    {priceResult.available &&
                    priceResult.price !== null ? (
                      <>
                        <p className="text-sm text-slate-500">
                          Prix total
                        </p>

                        <p className="text-4xl font-bold text-blue-700">
                          {priceResult.price.toLocaleString(
                            "fr-FR",
                          )}{" "}
                          TL
                        </p>
                      </>
                    ) : (
                      <p className="font-semibold text-amber-700">
                        Tarif non disponible automatiquement.
                        Contactez IF Sigorta.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <div>
              <label
                htmlFor="phoneNumber"
                className="mb-2 block font-medium text-slate-800"
              >
                Numéro WhatsApp
              </label>

              <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-100">
                <select
                  id="countryCode"
                  name="countryCode"
                  value={countryCode}
                  onChange={(event) =>
                    setCountryCode(event.target.value)
                  }
                  aria-label="Indicatif téléphonique"
                  className="max-w-[155px] border-r border-slate-300 bg-slate-50 px-3 py-3 text-slate-900 outline-none"
                >
                  {countryCodes.map((item) => (
                    <option
                      key={`${item.country}-${item.code}`}
                      value={item.code}
                    >
                      {item.flag} {item.code}
                    </option>
                  ))}
                </select>

                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(event) =>
                    handlePhoneChange(event.target.value)
                  }
                  required
                  className="min-w-0 flex-1 px-4 py-3 text-slate-900 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={
                !priceResult ||
                !priceResult.available ||
                priceResult.price === null
              }
              className="mt-4 w-full rounded-xl bg-blue-700 px-5 py-4 text-lg font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Continuer vers les documents
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}