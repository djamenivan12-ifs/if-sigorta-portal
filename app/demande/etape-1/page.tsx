"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";

import AddressSelector from "@/components/AddressSelector";
import PhoneInput from "@/components/PhoneInput";
import { useInsuranceRequest } from "@/context/InsuranceRequestContext";

export default function Etape1Page() {
  const router = useRouter();

  const { requestData, updateRequestData } =
    useInsuranceRequest();

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const formData = new FormData(
      event.currentTarget,
    );

    updateRequestData({
      lastName:
        formData.get("lastName")?.toString().trim() ??
        "",

      firstName:
        formData.get("firstName")?.toString().trim() ??
        "",

      fatherName:
        formData.get("fatherName")?.toString().trim() ??
        "",

      birthDate:
        formData.get("birthDate")?.toString() ?? "",

      gender:
        formData.get("gender")?.toString() ?? "",

      nationality:
        formData
          .get("nationality")
          ?.toString()
          .trim() ?? "",
    });

    router.push("/demande/etape-2");
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
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold text-blue-700">
              Étape 1 sur 5
            </p>

            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-1/5 rounded-full bg-blue-700" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Informations personnelles
          </h1>

          <p className="mt-2 text-slate-600">
            Saisissez les informations exactement comme
            elles apparaissent sur vos documents officiels.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-8"
          >
            <section className="space-y-5">
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
                  defaultValue={requestData.lastName}
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
                  defaultValue={requestData.firstName}
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
                  defaultValue={requestData.fatherName}
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
                  defaultValue={requestData.birthDate}
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
                  defaultValue={requestData.gender}
                  required
                  className={inputClassName}
                >
                  <option value="" disabled>
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

                <input
                  id="nationality"
                  name="nationality"
                  type="text"
                  defaultValue={requestData.nationality}
                  required
                  className={inputClassName}
                />
              </div>

              <PhoneInput
                countryCode={
                  requestData.whatsappCountryCode
                }
                phoneNumber={
                  requestData.whatsappNumber
                }
                onCountryCodeChange={(value) =>
                  updateRequestData({
                    whatsappCountryCode: value,
                  })
                }
                onPhoneNumberChange={(value) =>
                  updateRequestData({
                    whatsappNumber: value,
                  })
                }
              />
            </section>

            <AddressSelector
              value={requestData.address}
              onChange={(address) =>
                updateRequestData({
                  address,
                })
              }
            />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <a
                href="/"
                className="rounded-xl border border-slate-300 px-6 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </a>

              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800"
              >
                Suivant →
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}