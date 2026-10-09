import { LockKeyhole, Tags } from "lucide-react";
import PageFrame from "@/components/admin/pages/PageFrame";
import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";
import { readAll } from "@/lib/supabase/readAll";

export const metadata = { title: "Grille de prix | IF Sigorta" };

function priceLabel(value: number | string | null) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "TRY" }).format(price)
    : "Non disponible";
}

export default async function AgentPriceGridPage() {
  await requireRole(["agent", "admin"]);
  const db = createServiceClient();
  const { data, error } = await readAll(
    db.from("insurance_price_ranges")
      .select("id, minimum_age, maximum_age, one_year_price, two_year_price")
      .eq("is_active", true)
      .order("minimum_age", { ascending: true })
      .order("id"),
  );
  if (error) throw new Error("La grille de prix est temporairement indisponible. Veuillez réessayer.");

  return (
    <PageFrame section="Grille de prix" href="/admin/grille-de-prix">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-muted">IF Sigorta · Tarifs de vente</p>
          <h1 className="text-2xl font-bold text-brand-navy sm:text-3xl">Grille de prix</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Consultez les tarifs actifs d’assurance santé pour étrangers, par tranche d’âge et durée de couverture.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg bg-brand-ice px-3 py-2 text-xs font-semibold text-brand-navy"><LockKeyhole size={15} />Consultation uniquement</span>
      </header>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Tarifs en livres turques">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
          <span className="rounded-lg bg-brand-lime p-2 text-brand-navy"><Tags size={20} /></span>
          <div><h2 className="text-sm font-bold text-brand-navy">Demandes directes</h2><p className="mt-1 text-xs text-slate-500">Montants en livres turques (TRY) · grille définie par l’administration</p></div>
        </div>
        {data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Tarifs actifs pour une assurance de 1 an ou de 2 ans</caption>
              <thead><tr className="border-b border-slate-200 text-slate-500"><th scope="col" className="px-4 py-4 sm:px-6">Âge</th><th scope="col" className="px-4 py-4 text-right sm:px-6">1 an</th><th scope="col" className="px-4 py-4 text-right sm:px-6">2 ans</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.map(row => <tr key={row.id} className="hover:bg-brand-ice/50"><th scope="row" className="px-4 py-4 font-semibold text-brand-navy sm:px-6">{row.minimum_age}–{row.maximum_age} ans</th><td className="px-4 py-4 text-right font-semibold tabular-nums sm:px-6">{priceLabel(row.one_year_price)}</td><td className="px-4 py-4 text-right font-semibold tabular-nums sm:px-6">{priceLabel(row.two_year_price)}</td></tr>)}
              </tbody>
            </table>
          </div>
        ) : <p role="status" className="px-6 py-12 text-center text-sm text-slate-500">Aucun tarif actif pour le moment. Contactez l’administration.</p>}
      </section>
      <div className="mt-5 space-y-2 text-xs leading-6 text-slate-500">
        <p>Les bornes des tranches d’âge sont incluses. L’âge d’assurance correspond à l’année d’émission moins l’année de naissance.</p>
        <p>Cette grille s’applique aux demandes directes. Les partenaires disposent de leurs propres tarifs. Le montant enregistré sur un dossier existant reste la référence pour ce dossier.</p>
      </div>
    </PageFrame>
  );
}
