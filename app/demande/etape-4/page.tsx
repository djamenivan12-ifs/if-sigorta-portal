"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useInsuranceRequest } from "@/context/InsuranceRequestContext";
import { createClient } from "@/lib/supabase/client";

type AddressNames = {
  province: string;
  district: string;
  neighborhood: string;
};

export default function Etape4Page() {
  const router = useRouter();

  const { requestData } = useInsuranceRequest();

  const [confirmed, setConfirmed] = useState(false);

  const [addressNames, setAddressNames] =
    useState<AddressNames>({
      province: "",
      district: "",
      neighborhood: "",
    });

  const [loadingAddress, setLoadingAddress] =
    useState(true);

  useEffect(() => {
    async function loadAddressNames() {
      if (
        !requestData.address.provinceId ||
        !requestData.address.districtId ||
        !requestData.address.neighborhoodId
      ) {
        setLoadingAddress(false);
        return;
      }

      const supabase = createClient();

      const [
        provinceResult,
        districtResult,
        neighborhoodResult,
      ] = await Promise.all([
        supabase
          .from("provinces")
          .select("name")
          .eq(
            "id",
            Number(requestData.address.provinceId),
          )
          .single(),

        supabase
          .from("districts")
          .select("name")
          .eq(
            "id",
            Number(requestData.address.districtId),
          )
          .single(),

        supabase
          .from("neighborhoods")
          .select("name")
          .eq(
            "id",
            Number(
              requestData.address.neighborhoodId,
            ),
          )
          .single(),
      ]);

      setAddressNames({
        province: provinceResult.data?.name ?? "",
        district: districtResult.data?.name ?? "",
        neighborhood:
          neighborhoodResult.data?.name ?? "",
      });

      setLoadingAddress(false);
    }

    loadAddressNames();
  }, [
    requestData.address.provinceId,
    requestData.address.districtId,
    requestData.address.neighborhoodId,
  ]);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!confirmed) {
      alert(
        "Veuillez confirmer que toutes les informations sont exactes.",
      );
      return;
    }

    router.push("/demande/etape-5");
  }

  const completeAddress = [
    addressNames.neighborhood,
    requestData.address.street,
    `Bina No: ${requestData.address.buildingNumber}`,
    requestData.address.apartmentNumber
      ? `Daire No: ${requestData.address.apartmentNumber}`
      : null,
    addressNames.district,
    addressNames.province,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() =>
            router.push("/demande/etape-3")
          }
          className="mb-6 font-medium text-blue-700 hover:underline"
        >
          ← Retour à l’étape 3
        </button>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold text-blue-700">
              Étape 4 sur 5
            </p>

            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-4/5 rounded-full bg-blue-700" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Vérifiez votre demande
          </h1>

          <p className="mt-2 text-slate-600">
            Vérifiez attentivement les informations
            avant de continuer vers le paiement.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6"
          >
            <section className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-900">
                  Informations personnelles
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/demande/etape-1",
                    )
                  }
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  Modifier
                </button>
              </div>

              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-slate-500">
                    Nom
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {requestData.lastName}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    Prénom
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {requestData.firstName}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    Nom du père
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {requestData.fatherName}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    Date de naissance
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {requestData.birthDate}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    Sexe
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {requestData.gender === "male"
                      ? "Homme"
                      : requestData.gender === "female"
                        ? "Femme"
                        : ""}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    Nationalité
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {requestData.nationality}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    WhatsApp
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {
                      requestData.whatsappCountryCode
                    }
                    {requestData.whatsappNumber}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 border-t border-slate-200 pt-5">
                <p className="text-sm text-slate-500">
                  Adresse
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {loadingAddress
                    ? "Chargement de l’adresse..."
                    : completeAddress}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-900">
                  Identité et assurance
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/demande/etape-2",
                    )
                  }
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  Modifier
                </button>
              </div>

              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-slate-500">
                    Numéro de Kimlik
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {requestData.kimlikNumber}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    Expiration du Kimlik
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {
                      requestData.kimlikExpirationDate
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    Numéro du passeport
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {requestData.passportNumber}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    Âge retenu
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {requestData.calculatedAge} ans
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    Durée
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {requestData.duration} an
                    {requestData.duration === 2
                      ? "s"
                      : ""}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 rounded-xl bg-blue-50 p-5">
                <p className="text-sm text-slate-600">
                  Prix total
                </p>

                <p className="mt-1 text-4xl font-bold text-blue-700">
                  {requestData.calculatedPrice?.toLocaleString(
                    "fr-FR",
                  )}{" "}
                  TL
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-900">
                  Documents
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/demande/etape-3",
                    )
                  }
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  Modifier
                </button>
              </div>

              <div className="space-y-3">
                <DocumentRow
                  label="Passeport"
                  file={requestData.passportFile}
                />

                <DocumentRow
                  label="Kimlik recto"
                  file={requestData.kimlikFrontFile}
                />

                <DocumentRow
                  label="Kimlik verso"
                  file={requestData.kimlikBackFile}
                />
              </div>
            </section>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-300 bg-slate-50 p-5">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) =>
                  setConfirmed(
                    event.target.checked,
                  )
                }
                className="mt-1 h-5 w-5"
              />

              <span className="text-sm leading-6 text-slate-700">
                Je confirme que les informations et
                les documents fournis sont exacts et
                correspondent à mes documents
                officiels.
              </span>
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/demande/etape-3",
                  )
                }
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← Précédent
              </button>

              <button
                type="submit"
                disabled={!confirmed}
                className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Continuer vers le paiement →
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

type DocumentRowProps = {
  label: string;
  file: File | null;
};

function DocumentRow({
  label,
  file,
}: DocumentRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">
          {label}
        </p>

        <p className="truncate text-sm text-slate-500">
          {file?.name ?? "Document absent"}
        </p>
      </div>

      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
          file
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {file ? "Ajouté" : "Absent"}
      </span>
    </div>
  );
}