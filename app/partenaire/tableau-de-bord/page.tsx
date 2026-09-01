import {
  requirePartner,
} from "@/lib/auth/requirePartner";

export default async function PartnerDashboardTestPage() {
  const {
    partner,
  } =
    await requirePartner();

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
            Espace partenaire
          </p>

          <h1 className="mt-3 text-3xl font-semibold text-[#102B20]">
            Connexion réussie
          </h1>

          <p className="mt-3 text-slate-500">
            Cette page est temporaire. Le véritable
            tableau de bord sera construit pendant
            la Phase 5.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Info
              label="Partenaire"
              value={
                partner.companyName
              }
            />

            <Info
              label="Responsable"
              value={
                partner.managerName
              }
            />

            <Info
              label="Code partenaire"
              value={
                partner.code
              }
            />

            <Info
              label="Adresse e-mail"
              value={
                partner.email
              }
            />
          </div>

          <div className="mt-8 rounded-2xl border border-[#CFE3CF] bg-[#F3F8F2] p-5">
            <p className="font-semibold text-[#0B5D3B]">
              ✓ Compte partenaire authentifié
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Le rôle partenaire, le lien avec le
              compte Supabase et le statut actif ont
              été vérifiés côté serveur.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 font-semibold text-[#102B20]">
        {value}
      </p>
    </div>
  );
}