import {
  FolderOpen,
} from "lucide-react";

export default function PartnerDossiersPage() {
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-5 lg:px-8 lg:py-8">
      <h1 className="text-2xl font-black tracking-tight text-[#102B20] sm:text-3xl">
        Mes dossiers
      </h1>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Retrouvez ici uniquement les dossiers créés par votre compte partenaire.
      </p>

      <div className="mt-7 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex min-h-64 items-center justify-center text-center">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F8F2] text-[#0B5D3B]">
              <FolderOpen className="h-6 w-6" />
            </div>

            <p className="mt-4 text-sm font-bold text-slate-600">
              Aucun dossier
            </p>

            <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
              La liste réelle des dossiers partenaires sera connectée pendant la création du workflow partenaire.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}