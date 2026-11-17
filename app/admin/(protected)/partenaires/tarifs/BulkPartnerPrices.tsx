"use client";

import { useState } from "react";
import type { PartnerPriceSnapshot } from "@/lib/insurance/bulkPartnerPrices";
import PartnerPriceSettingsForm from "../[id]/PartnerPriceSettingsForm";

export default function BulkPartnerPrices({ snapshot }: { snapshot: PartnerPriceSnapshot }) {
  const [saving, setSaving] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [loadedId, setLoadedId] = useState("");
  const [version, setVersion] = useState(0);
  const source = snapshot.partners.find(partner => partner.id === loadedId);
  if (!snapshot.partners.length) return <p className="text-sm text-slate-600">Ajoutez d’abord un partenaire pour configurer ses tarifs.</p>;
  return (
    <div className="space-y-6">
      <p className="font-semibold text-brand-navy">{snapshot.partners.length} partenaires concernés</p>
      <details className="text-sm text-slate-600">
        <summary className="cursor-pointer">Voir les partenaires concernés</summary>
        <ul className="mt-2 list-inside list-disc">{snapshot.partners.map(partner => <li key={partner.id}>{partner.name}{!partner.isActive && " (inactif)"}</li>)}</ul>
      </details>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700">
          Partir d’une grille existante (facultatif)
          <select disabled={saving} value={sourceId} onChange={event => setSourceId(event.target.value)} className="h-12 max-w-full rounded-xl border border-slate-200 bg-white px-3">
            <option value="">Grille vide</option>
            {snapshot.partners.map(partner => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
          </select>
        </label>
        <button disabled={saving} type="button" className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm font-semibold" onClick={() => {
          if (!window.confirm("Remplacer les modifications de votre brouillon par cette grille ?")) return;
          setLoadedId(sourceId); setVersion(current => current + 1);
        }}>Charger la grille</button>
      </div>
      <p className="text-sm text-slate-500">Charger une grille prépare uniquement le formulaire. Aucun tarif n’est modifié avant l’application à tous.</p>
      <PartnerPriceSettingsForm onSavingChange={setSaving} key={`${loadedId}-${version}`} initialRanges={(source?.ranges ?? []).map(({ minimumAge, maximumAge, oneYearPrice, twoYearPrice, isActive }) => ({ minimumAge, maximumAge, oneYearPrice, twoYearPrice, isActive }))} bulk={{ revision: snapshot.revision, count: snapshot.partners.length }} />
    </div>
  );
}
