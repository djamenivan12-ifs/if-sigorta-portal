import {
  FilePlus2,
} from "lucide-react";

export default function NewPartnerRequestPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-5 lg:px-8 lg:py-8">
      <h1 className="text-2xl font-black tracking-tight text-[#102B20] sm:text-3xl">
        Nouvelle demande
      </h1>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Créez une assurance pour l’un de vos clients.
      </p>

      <div className="mt-7 rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm">
        <div className="mx-auto max-w-lg py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3F8F2] text-[#0B5D3B]">
            <FilePlus2 className="h-7 w-7" />
          </div>

          <h2 className="mt-5 text-lg font-black text-[#102B20]">
            Formulaire partenaire
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Le formulaire complet avec calcul du tarif partenaire, documents du client et création du dossier sera développé pendant la Phase 6.
          </p>
        </div>
      </div>
    </div>
  );
}