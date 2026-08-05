"use client";

import { FormEvent, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useInsuranceRequest } from "@/context/InsuranceRequestContext";
import {
  calculateInsurancePrice,
  InsuranceDuration,
} from "@/lib/insurance/calculatePrice";

export default function Etape2Page() {
  const router = useRouter();

  const { requestData, updateRequestData } =
    useInsuranceRequest();

  const priceResult = useMemo(() => {
    if (!requestData.birthDate) {
      return null;
    }

    return calculateInsurancePrice(
      requestData.birthDate,
      requestData.duration,
    );
  }, [requestData.birthDate, requestData.duration]);

  function changeDuration(
    duration: InsuranceDuration,
  ) {
    const result = calculateInsurancePrice(
      requestData.birthDate,
      duration,
    );

    updateRequestData({
      duration,
      calculatedAge: result?.age ?? null,
      calculatedPrice: result?.price ?? null,
    });
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !priceResult ||
      !priceResult.available ||
      priceResult.price === null
    ) {
      alert(
        "Le tarif n’est pas disponible automatiquement pour cet âge.",
      );

      return;
    }

    const formData = new FormData(
      event.currentTarget,
    );

    updateRequestData({
      kimlikNumber:
        formData.get("kimlikNumber")?.toString().trim() ??
        "",

      kimlikExpirationDate:
        formData
          .get("kimlikExpirationDate")
          ?.toString() ?? "",

      passportNumber:
        formData
          .get("passportNumber")
          ?.toString()
          .trim()
          .toUpperCase() ?? "",

      duration: requestData.duration,
      calculatedAge: priceResult.age,
      calculatedPrice: priceResult.price,
    });

    router.push("/demande/etape-3");
  }

  const inputClassName =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() =>
            router.push("/demande/etape-1")
          }
          className="mb-6 font-medium text-blue-700 hover:underline"
        >
          ← Retour à l’étape 1
        </button>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold text-blue-700">
              Étape 2 sur 5
            </p>

            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-2/5 rounded-full bg-blue-700" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Identité et tarif
          </h1>

          <p className="mt-2 text-slate-600">
            Renseignez vos informations d’identité et
            choisissez la durée de votre assurance.
          </p>

          {!requestData.birthDate && (
            <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              La date de naissance est absente. Revenez à
              l’étape 1 pour la renseigner.
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-8"
          >
            <section className="space-y-5">
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
                  defaultValue={requestData.kimlikNumber}
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
                  defaultValue={
                    requestData.kimlikExpirationDate
                  }
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
                  defaultValue={
                    requestData.passportNumber
                  }
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
                  L’âge est calculé selon l’année de
                  naissance, sans tenir compte du jour et du
                  mois.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => changeDuration(1)}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    requestData.duration === 1
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
                  onClick={() => changeDuration(2)}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    requestData.duration === 2
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
                        {priceResult.duration === 2
                          ? "s"
                          : ""}
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

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  router.push("/demande/etape-1")
                }
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← Précédent
              </button>

              <button
                type="submit"
                disabled={
                  !priceResult ||
                  !priceResult.available ||
                  priceResult.price === null
                }
                className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
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