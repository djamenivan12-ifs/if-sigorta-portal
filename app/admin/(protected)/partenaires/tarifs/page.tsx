import PageFrame from "@/components/admin/pages/PageFrame";
import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";
import type { PartnerPriceSnapshot } from "@/lib/insurance/bulkPartnerPrices";
import BulkPartnerPrices from "./BulkPartnerPrices";

export default async function BulkPartnerPricesPage() {
  await requireRole(["admin"]);
  const { data, error } = await createServiceClient().rpc("all_partner_price_snapshot");
  if (error || !data) throw new Error("Impossible de charger les grilles des partenaires.");
  const snapshot = data as PartnerPriceSnapshot;
  return (
    <PageFrame section="Partenaires" href="/admin/partenaires" sections={[{ id: "tarifs", label: "Tarifs groupés" }]}>
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        <header data-admin-page-heading="plain" className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-brand-navy">Tarifs groupés des partenaires</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Préparez une grille commune pour tous les partenaires existants, actifs et inactifs. Vous pourrez ensuite modifier chaque grille individuellement depuis la fiche du partenaire.</p>
          <p className="mt-2 text-sm text-slate-500">Les montants sont en livres turques (₺). Les dossiers déjà créés conservent leur prix enregistré.</p>
        </header>
        <section id="tarifs" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <BulkPartnerPrices snapshot={snapshot} />
        </section>
      </div>
    </PageFrame>
  );
}
