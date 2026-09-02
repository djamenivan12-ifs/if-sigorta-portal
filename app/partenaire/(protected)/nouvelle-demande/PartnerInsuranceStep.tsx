"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  PartnerPriceResponse,
  PartnerRequestFormData,
} from "./partnerRequestTypes";

type Props = {
  data: PartnerRequestFormData;

  onChange: (
    data: PartnerRequestFormData,
  ) => void;

  onPrevious: () => void;
  onNext: () => void;
};

export default function PartnerInsuranceStep({
  data,
  onChange,
  onPrevious,
  onNext,
}: Props) {
  const [priceLoading, setPriceLoading] =
    useState(false);

  const [priceError, setPriceError] =
    useState("");

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  function update(
    values: Partial<PartnerRequestFormData>,
  ) {
    onChange({
      ...data,
      ...values,
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPrice() {
      if (!data.birthDate) {
        return;
      }

      setPriceLoading(true);
      setPriceError("");

      try {
        const response =
          await fetch(
            "/api/partner/insurance/price",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                birthDate:
                  data.birthDate,

                duration:
                  data.duration,
              }),
            },
          );

        const result =
          (await response.json()) as
            PartnerPriceResponse;

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Impossible de calculer le tarif.",
          );
        }

        if (cancelled) {
          return;
        }

        if (
          !result.available ||
          typeof result.age !==
            "number" ||
          typeof result.price !==
            "number"
        ) {
          onChange({
            ...data,
            calculatedAge:
              typeof result.age ===
              "number"
                ? result.age
                : null,

            calculatedPrice: null,
          });

          setPriceError(
            "Aucun tarif partenaire n’est configuré pour cet âge.",
          );

          return;
        }

        onChange({
          ...data,

          calculatedAge:
            result.age,

          calculatedPrice:
            result.price,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Erreur tarif partenaire :",
          error,
        );

        onChange({
          ...data,
          calculatedAge: null,
          calculatedPrice: null,
        });

        setPriceError(
          error instanceof Error
            ? error.message
            : "Impossible de calculer le tarif partenaire.",
        );
      } finally {
        if (!cancelled) {
          setPriceLoading(false);
        }
      }
    }

    void loadPrice();

    return () => {
      cancelled = true;
    };

    // Le tarif dépend uniquement de
    // la naissance et de la durée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data.birthDate,
    data.duration,
  ]);

  function changeKimlikStatus(
    hasKimlik: boolean,
  ) {
    if (hasKimlik) {
      update({
        hasKimlik: true,
        insuranceStartDate: "",
      });

      return;
    }

    update({
      hasKimlik: false,
      kimlikNumber: "",
      kimlikExpirationDate: "",
      kimlikFrontFile: null,
      kimlikBackFile: null,
    });
  }

  function handleNext() {
    const passportNumber =
      data.passportNumber
        .trim()
        .toUpperCase();

    if (!passportNumber) {
      alert(
        "Le numéro du passeport est obligatoire.",
      );

      return;
    }

    if (data.hasKimlik) {
      if (
        !/^\d{11}$/.test(
          data.kimlikNumber,
        )
      ) {
        alert(
          "Le numéro de Kimlik doit contenir exactement 11 chiffres.",
        );

        return;
      }

      if (
        !data.kimlikExpirationDate
      ) {
        alert(
          "La date d’expiration du Kimlik est obligatoire.",
        );

        return;
      }
    } else {
      if (
        !data.insuranceStartDate
      ) {
        alert(
          "La date de début de l’assurance est obligatoire.",
        );

        return;
      }

      if (
        data.insuranceStartDate <
        today
      ) {
        alert(
          "La date de début de l’assurance ne peut pas être dans le passé.",
        );

        return;
      }
    }

    if (
      data.calculatedAge === null ||
      data.calculatedPrice === null
    ) {
      alert(
        "Le tarif partenaire n’est pas disponible pour ce client.",
      );

      return;
    }

    onChange({
      ...data,
      passportNumber,
    });

    onNext();
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10";

  const labelClass =
    "mb-2 block text-sm font-semibold text-slate-700";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
          Étape 2 sur 4
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-tight text-[#102B20] sm:text-3xl">
          Identité et assurance
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Renseignez les informations
          d’assurance du client et
          choisissez la durée.
        </p>
      </div>

      <section>
        <p className={labelClass}>
          Le client possède-t-il déjà
          un Kimlik ?
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              changeKimlikStatus(true)
            }
            className={`rounded-2xl border p-5 text-left transition ${
              data.hasKimlik
                ? "border-[#0B5D3B] bg-[#EEF6EC] ring-4 ring-[#0B5D3B]/10"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span className="font-bold text-slate-900">
              Oui
            </span>

            <span className="mt-1 block text-sm text-slate-500">
              Le client possède déjà
              une carte Kimlik.
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              changeKimlikStatus(false)
            }
            className={`rounded-2xl border p-5 text-left transition ${
              !data.hasKimlik
                ? "border-[#0B5D3B] bg-[#EEF6EC] ring-4 ring-[#0B5D3B]/10"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span className="font-bold text-slate-900">
              Non
            </span>

            <span className="mt-1 block text-sm text-slate-500">
              Première demande de titre
              de séjour.
            </span>
          </button>
        </div>
      </section>

      <section className="border-t border-slate-100 pt-7">
        <div className="grid gap-5 sm:grid-cols-2">
          {data.hasKimlik ? (
            <>
              <div>
                <label
                  htmlFor="partnerKimlik"
                  className={labelClass}
                >
                  Numéro de Kimlik
                </label>

                <input
                  id="partnerKimlik"
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  value={
                    data.kimlikNumber
                  }
                  onChange={(event) =>
                    update({
                      kimlikNumber:
                        event.target.value
                          .replace(
                            /\D/g,
                            "",
                          )
                          .slice(
                            0,
                            11,
                          ),
                    })
                  }
                  className={
                    inputClass
                  }
                />

                <p className="mt-2 text-xs text-slate-500">
                  {
                    data.kimlikNumber
                      .length
                  }
                  /11 chiffres
                </p>
              </div>

              <div>
                <label
                  htmlFor="partnerKimlikExpiration"
                  className={labelClass}
                >
                  Date d’expiration du
                  Kimlik
                </label>

                <input
                  id="partnerKimlikExpiration"
                  type="date"
                  value={
                    data.kimlikExpirationDate
                  }
                  onChange={(event) =>
                    update({
                      kimlikExpirationDate:
                        event.target.value,
                    })
                  }
                  className={
                    inputClass
                  }
                />
              </div>
            </>
          ) : (
            <div className="sm:col-span-2">
              <div className="rounded-2xl border border-[#D9E9D9] bg-[#F3F8F2] p-4 text-sm leading-6 text-[#31513B]">
                Aucun numéro de Kimlik
                n’est nécessaire.
                Indiquez la date
                souhaitée de début de
                l’assurance.
              </div>

              <div className="mt-5 max-w-md">
                <label
                  htmlFor="partnerInsuranceStart"
                  className={labelClass}
                >
                  Date de début de
                  l’assurance
                </label>

                <input
                  id="partnerInsuranceStart"
                  type="date"
                  min={today}
                  value={
                    data.insuranceStartDate
                  }
                  onChange={(event) =>
                    update({
                      insuranceStartDate:
                        event.target.value,
                    })
                  }
                  className={
                    inputClass
                  }
                />
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <label
              htmlFor="partnerPassport"
              className={labelClass}
            >
              Numéro du passeport
            </label>

            <input
              id="partnerPassport"
              type="text"
              value={
                data.passportNumber
              }
              onChange={(event) =>
                update({
                  passportNumber:
                    event.target.value.toUpperCase(),
                })
              }
              className={`${inputClass} uppercase`}
            />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 pt-7">
        <h3 className="text-xl font-black text-[#102B20]">
          Durée de l’assurance
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {([1, 2] as const).map(
            (duration) => (
              <button
                key={duration}
                type="button"
                onClick={() =>
                  update({
                    duration,
                    calculatedPrice:
                      null,
                  })
                }
                className={`rounded-2xl border p-5 text-left transition ${
                  data.duration ===
                  duration
                    ? "border-[#0B5D3B] bg-[#EEF6EC] ring-4 ring-[#0B5D3B]/10"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="text-lg font-black text-slate-900">
                  {duration}{" "}
                  {duration === 1
                    ? "an"
                    : "ans"}
                </span>

                <span className="mt-1 block text-sm text-slate-500">
                  {duration === 1
                    ? "Une police d’assurance"
                    : "Deux polices d’assurance"}
                </span>
              </button>
            ),
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#DCE9DD] bg-[#F7FAF6]">
        {priceLoading ? (
          <div className="p-5 text-sm font-semibold text-[#31513B]">
            Calcul du tarif partenaire...
          </div>
        ) : priceError ? (
          <div className="p-5 text-sm font-semibold text-amber-700">
            {priceError}
          </div>
        ) : data.calculatedPrice !==
            null &&
          data.calculatedAge !==
            null ? (
          <>
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Âge retenu
                </p>

                <p className="mt-1 text-xl font-black text-slate-900">
                  {
                    data.calculatedAge
                  }{" "}
                  ans
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Durée
                </p>

                <p className="mt-1 text-xl font-black text-slate-900">
                  {data.duration}{" "}
                  {data.duration === 1
                    ? "an"
                    : "ans"}
                </p>
              </div>
            </div>

            <div className="border-t border-[#DCE9DD] bg-white p-5">
              <p className="text-sm font-medium text-slate-500">
                Tarif partenaire
              </p>

              <p className="mt-1 text-4xl font-black tracking-tight text-[#0B5D3B]">
                {data.calculatedPrice.toLocaleString(
                  "fr-FR",
                )}{" "}
                <span className="text-2xl">
                  TL
                </span>
              </p>
            </div>
          </>
        ) : null}
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-7 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onPrevious}
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Précédent
        </button>

        <button
          type="button"
          disabled={
            priceLoading ||
            data.calculatedPrice ===
              null
          }
          onClick={handleNext}
          className="min-h-12 rounded-xl bg-[#0B5D3B] px-7 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Continuer →
        </button>
      </div>
    </div>
  );
}