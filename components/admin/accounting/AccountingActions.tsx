"use client";

import Link from "next/link";
import { useState } from "react";
import { Settings2 } from "lucide-react";

import AddInsuranceCompanyModal from "./AddInsuranceCompanyModal";
import AddInsuranceDepositModal from "./AddInsuranceDepositModal";
import AddInsuranceRateModal from "./AddInsuranceRateModal";

export default function AccountingActions() {
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);

  const [isAddRateOpen, setIsAddRateOpen] = useState(false);

  const [isAddDepositOpen, setIsAddDepositOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setIsAddCompanyOpen(true)}
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-brand-navy hover:bg-brand-ice hover:text-brand-navy"
        >
          + Ajouter un assureur
        </button>

        <button
          type="button"
          onClick={() => setIsAddRateOpen(true)}
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-brand-navy hover:bg-brand-ice hover:text-brand-navy"
        >
          + Ajouter un tarif
        </button>

        <Link
          href="/admin/comptabilite/tarifs"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-brand-navy/20 bg-brand-ice px-4 py-3 text-center text-sm font-bold text-brand-navy transition hover:border-brand-navy hover:bg-brand-ice"
        >
          <Settings2 className="h-4 w-4 shrink-0" />
          Gérer les tarifs
        </Link>

        <button
          type="button"
          onClick={() => setIsAddDepositOpen(true)}
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-brand-navy hover:bg-brand-ice hover:text-brand-navy"
        >
          + Enregistrer un dépôt
        </button>
      </div>

      <AddInsuranceCompanyModal
        isOpen={isAddCompanyOpen}
        onClose={() => setIsAddCompanyOpen(false)}
      />

      <AddInsuranceRateModal isOpen={isAddRateOpen} onClose={() => setIsAddRateOpen(false)} />

      <AddInsuranceDepositModal
        isOpen={isAddDepositOpen}
        onClose={() => setIsAddDepositOpen(false)}
      />
    </>
  );
}
