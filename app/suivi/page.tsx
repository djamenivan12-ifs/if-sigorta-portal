"use client";

import {
  FormEvent,
  useState,
} from "react";

type TrackingResult = {
  request: {
    requestCode: string;
    status: string;
    calculatedPrice: number;
    durationYears: number;
    createdAt: string;
    updatedAt: string;
  };

  client: {
    firstName: string;
    lastName: string;
  };

  payment: {
    status: string;
    submittedAt: string | null;
    verifiedAt: string | null;
    rejectionReason: string | null;
  } | null;

  policy: {
    available: boolean;
    policyNumber: string | null;
    issueDate: string | null;
    expirationDate: string | null;
    uploadedAt: string | null;
  };
};

const countryCodes = [
  {
    country: "Türkiye",
    flag: "🇹🇷",
    code: "+90",
  },
  {
    country: "Cameroun",
    flag: "🇨🇲",
    code: "+237",
  },
  {
    country: "Nigeria",
    flag: "🇳🇬",
    code: "+234",
  },
  {
    country: "Ghana",
    flag: "🇬🇭",
    code: "+233",
  },
  {
    country: "Sénégal",
    flag: "🇸🇳",
    code: "+221",
  },
  {
    country: "Côte d’Ivoire",
    flag: "🇨🇮",
    code: "+225",
  },
  {
    country: "Tchad",
    flag: "🇹🇩",
    code: "+235",
  },
  {
    country: "Gabon",
    flag: "🇬🇦",
    code: "+241",
  },
  {
    country: "Congo",
    flag: "🇨🇬",
    code: "+242",
  },
  {
    country: "RDC",
    flag: "🇨🇩",
    code: "+243",
  },
];

const requestStatusLabels: Record<
  string,
  {
    label: string;
    description: string;
    className: string;
  }
> = {
  draft: {
    label: "Dossier en préparation",
    description:
      "Votre demande n’a pas encore été finalisée.",
    className:
      "bg-slate-100 text-slate-700",
  },

  waiting_payment: {
    label: "En attente de paiement",
    description:
      "Le paiement n’a pas encore été déclaré.",
    className:
      "bg-amber-100 text-amber-800",
  },

  payment_review: {
    label: "Paiement en vérification",
    description:
      "Votre dekont a été reçu et sera vérifié par un agent.",
    className:
      "bg-orange-100 text-orange-800",
  },

  payment_confirmed: {
    label: "Paiement confirmé",
    description:
      "Votre paiement a été validé.",
    className:
      "bg-green-100 text-green-800",
  },

  policy_preparation: {
    label: "Assurance en préparation",
    description:
      "Votre police d’assurance est en cours de création.",
    className:
      "bg-blue-100 text-blue-800",
  },

  policy_available: {
    label: "Assurance disponible",
    description:
      "Votre assurance est prête.",
    className:
      "bg-emerald-100 text-emerald-800",
  },

  payment_rejected: {
    label: "Paiement refusé",
    description:
      "Le paiement n’a pas pu être validé. Contactez IF Sigorta.",
    className:
      "bg-red-100 text-red-800",
  },

  cancelled: {
    label: "Dossier annulé",
    description:
      "Cette demande a été annulée.",
    className:
      "bg-slate-200 text-slate-800",
  },
};

function formatDate(value: string | null) {
  if (!value) {
    return "Non disponible";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "long",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

export default function SuiviPage() {
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

  const [result, setResult] =
    useState<TrackingResult | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/tracking",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            requestCode:
              requestCode
                .trim()
                .toUpperCase(),

            whatsappCountryCode,

            whatsappNumber:
              whatsappNumber.replace(
                /\D/g,
                "",
              ),
          }),
        },
      );

      const data = (await response.json()) as
        | TrackingResult
        | {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Le dossier n’a pas pu être recherché.",
        );
      }

      setResult(
        data as TrackingResult,
      );
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

  const statusInformation =
    result
      ? requestStatusLabels[
          result.request.status
        ] ?? {
          label:
            result.request.status,
          description:
            "Statut du dossier.",
          className:
            "bg-slate-100 text-slate-700",
        }
      : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <a
          href="/"
          className="mb-6 inline-block font-medium text-blue-700 hover:underline"
        >
          ← Retour à l’accueil
        </a>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-3xl font-bold text-slate-900">
            Suivre ma demande
          </h1>

          <p className="mt-2 text-slate-600">
            Saisissez le code du dossier et le
            numéro WhatsApp utilisé lors de la
            demande.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="requestCode"
                className="mb-2 block font-medium text-slate-800"
              >
                Code du dossier
              </label>

              <input
                id="requestCode"
                type="text"
                value={requestCode}
                onChange={(event) =>
                  setRequestCode(
                    event.target.value,
                  )
                }
                placeholder="IFS-260806-25WIC7"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="trackingPhone"
                className="mb-2 block font-medium text-slate-800"
              >
                Numéro WhatsApp
              </label>

              <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-100">
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
                  className="max-w-[155px] border-r border-slate-300 bg-slate-50 px-3 py-3 outline-none"
                >
                  {countryCodes.map(
                    (item) => (
                      <option
                        key={`${item.country}-${item.code}`}
                        value={item.code}
                      >
                        {item.flag}{" "}
                        {item.code}
                      </option>
                    ),
                  )}
                </select>

                <input
                  id="trackingPhone"
                  type="tel"
                  inputMode="numeric"
                  value={whatsappNumber}
                  onChange={(event) =>
                    setWhatsappNumber(
                      event.target.value.replace(
                        /\D/g,
                        "",
                      ),
                    )
                  }
                  required
                  className="min-w-0 flex-1 px-4 py-3 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-700 px-5 py-4 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading
                ? "Recherche en cours..."
                : "Rechercher mon dossier"}
            </button>
          </form>

          {errorMessage && (
            <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {result &&
            statusInformation && (
              <section className="mt-8 space-y-6 border-t border-slate-200 pt-8">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-sm text-slate-500">
                    Code du dossier
                  </p>

                  <p className="mt-1 break-all text-xl font-bold text-slate-900">
                    {
                      result.request
                        .requestCode
                    }
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-sm text-slate-500">
                    Client
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {
                      result.client
                        .firstName
                    }{" "}
                    {
                      result.client
                        .lastName
                    }
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-sm text-slate-500">
                    État actuel
                  </p>

                  <span
                    className={`mt-3 inline-block rounded-full px-4 py-2 text-sm font-semibold ${statusInformation.className}`}
                  >
                    {
                      statusInformation.label
                    }
                  </span>

                  <p className="mt-3 leading-6 text-slate-600">
                    {
                      statusInformation.description
                    }
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <p className="text-sm text-slate-500">
                      Montant
                    </p>

                    <p className="mt-1 text-2xl font-bold text-blue-700">
                      {Number(
                        result.request
                          .calculatedPrice,
                      ).toLocaleString(
                        "fr-FR",
                      )}{" "}
                      TL
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <p className="text-sm text-slate-500">
                      Durée
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {
                        result.request
                          .durationYears
                      }{" "}
                      an
                      {result.request
                        .durationYears === 2
                        ? "s"
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-sm text-slate-500">
                    Dernière mise à jour
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(
                      result.request
                        .updatedAt,
                    )}
                  </p>
                </div>

                {result.payment
                  ?.status ===
                    "rejected" &&
                  result.payment
                    .rejectionReason && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                      Motif :{" "}
                      {
                        result.payment
                          .rejectionReason
                      }
                    </div>
                  )}

                {result.policy.available ? (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                    <p className="text-xl font-bold text-green-800">
                      Assurance disponible
                    </p>

                    {result.policy
                      .policyNumber && (
                      <p className="mt-2 text-sm text-green-700">
                        Numéro de police :{" "}
                        {
                          result.policy
                            .policyNumber
                        }
                      </p>
                    )}

                    <p className="mt-4 text-sm leading-6 text-green-700">
                      Le téléchargement sécurisé
                      sera ajouté avec l’espace
                      agent.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    La police d’assurance
                    n’est pas encore disponible.
                  </div>
                )}
              </section>
            )}
        </div>
      </div>
    </main>
  );
}