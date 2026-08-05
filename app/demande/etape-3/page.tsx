"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";

import DocumentUploader from "@/components/DocumentUploader";
import { useInsuranceRequest } from "@/context/InsuranceRequestContext";

export default function Etape3Page() {
  const router = useRouter();

  const { requestData, updateRequestData } =
    useInsuranceRequest();

  const documentsAreComplete =
    requestData.passportFile !== null &&
    requestData.kimlikFrontFile !== null &&
    requestData.kimlikBackFile !== null;

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!documentsAreComplete) {
      alert(
        "Veuillez ajouter le passeport, le Kimlik recto et le Kimlik verso.",
      );

      return;
    }

    router.push("/demande/etape-4");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() =>
            router.push("/demande/etape-2")
          }
          className="mb-6 font-medium text-blue-700 hover:underline"
        >
          ← Retour à l’étape 2
        </button>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold text-blue-700">
              Étape 3 sur 5
            </p>

            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-3/5 rounded-full bg-blue-700" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Documents obligatoires
          </h1>

          <p className="mt-2 text-slate-600">
            Ajoutez des photos lisibles ou des fichiers PDF.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6"
          >
            <DocumentUploader
              label="Passeport"
              description="Page contenant votre photo et vos informations personnelles."
              file={requestData.passportFile}
              onChange={(passportFile) =>
                updateRequestData({
                  passportFile,
                })
              }
            />

            <DocumentUploader
              label="Kimlik recto"
              description="Face avant de votre carte de séjour."
              file={requestData.kimlikFrontFile}
              onChange={(kimlikFrontFile) =>
                updateRequestData({
                  kimlikFrontFile,
                })
              }
            />

            <DocumentUploader
              label="Kimlik verso"
              description="Face arrière de votre carte de séjour."
              file={requestData.kimlikBackFile}
              onChange={(kimlikBackFile) =>
                updateRequestData({
                  kimlikBackFile,
                })
              }
            />

            <div
              className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                documentsAreComplete
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {documentsAreComplete
                ? "✓ Les trois documents obligatoires sont présents."
                : "Veuillez ajouter les trois documents obligatoires."}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  router.push("/demande/etape-2")
                }
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← Précédent
              </button>

              <button
                type="submit"
                disabled={!documentsAreComplete}
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