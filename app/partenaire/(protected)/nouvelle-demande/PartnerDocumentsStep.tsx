"use client";

import DocumentUploader from "@/components/DocumentUploader";

import type {
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

export default function PartnerDocumentsStep({
  data,
  onChange,
  onPrevious,
  onNext,
}: Props) {
  const passportPresent =
    data.passportFile !== null;

  const kimlikComplete =
    data.kimlikFrontFile !== null &&
    data.kimlikBackFile !== null;

  const complete =
    passportPresent &&
    (
      !data.hasKimlik ||
      kimlikComplete
    );

  function update(
    values: Partial<PartnerRequestFormData>,
  ) {
    onChange({
      ...data,
      ...values,
    });
  }

  function handleNext() {
    if (!data.passportFile) {
      alert(
        "Veuillez ajouter le passeport du client.",
      );

      return;
    }

    if (
      data.hasKimlik &&
      (
        !data.kimlikFrontFile ||
        !data.kimlikBackFile
      )
    ) {
      alert(
        "Veuillez ajouter le Kimlik recto et verso du client.",
      );

      return;
    }

    onNext();
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
          Étape 3 sur 4
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-tight text-[#102B20] sm:text-3xl">
          Documents du client
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Ajoutez des fichiers lisibles en PDF, JPG ou PNG.
        </p>
      </div>

      {!data.hasKimlik && (
        <div className="rounded-2xl border border-[#D9E9D9] bg-[#F3F8F2] px-4 py-3.5 text-sm leading-6 text-[#31513B]">
          Le client ne possède pas encore de Kimlik. Seul son passeport est obligatoire.
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-[#FCFDFC] p-5">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
            01
          </p>

          <h3 className="mt-1 text-lg font-bold text-slate-900">
            Passeport
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Page contenant la photo et les informations personnelles du client.
          </p>
        </div>

        <DocumentUploader
          label="Passeport"
          description="Page contenant la photo et les informations personnelles."
          file={data.passportFile}
          language="fr"
          onChange={(passportFile) =>
            update({
              passportFile,
            })
          }
        />
      </section>

      {data.hasKimlik && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-[#FCFDFC] p-5">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                02
              </p>

              <h3 className="mt-1 text-lg font-bold text-slate-900">
                Kimlik recto
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Face avant de la carte de séjour.
              </p>
            </div>

            <DocumentUploader
              label="Kimlik recto"
              description="Face avant de la carte de séjour."
              file={data.kimlikFrontFile}
              language="fr"
              onChange={(kimlikFrontFile) =>
                update({
                  kimlikFrontFile,
                })
              }
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-[#FCFDFC] p-5">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
                03
              </p>

              <h3 className="mt-1 text-lg font-bold text-slate-900">
                Kimlik verso
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Face arrière de la carte de séjour.
              </p>
            </div>

            <DocumentUploader
              label="Kimlik verso"
              description="Face arrière de la carte de séjour."
              file={data.kimlikBackFile}
              language="fr"
              onChange={(kimlikBackFile) =>
                update({
                  kimlikBackFile,
                })
              }
            />
          </section>
        </>
      )}

      <div
        className={`rounded-2xl border px-4 py-4 text-sm font-semibold ${
          complete
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        {complete
          ? data.hasKimlik
            ? "✓ Passeport et deux faces du Kimlik ajoutés."
            : "✓ Passeport ajouté."
          : data.hasKimlik
            ? "Ajoutez le passeport et les deux faces du Kimlik."
            : "Ajoutez le passeport."}
      </div>

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
          disabled={!complete}
          onClick={handleNext}
          className="min-h-12 rounded-xl bg-[#0B5D3B] px-7 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Continuer →
        </button>
      </div>
    </div>
  );
}