import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Pencil,
} from "lucide-react";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type RateRow = {
  id: string;
  insurance_company_id: string;
  min_age: number;
  max_age: number;
  duration_years: number;
  real_cost: number | string;
  effective_from: string;
  is_active: boolean;
};

type CompanyRow = {
  id: string;
  name: string;
};

export default async function EditAccountingRatePage({
  params,
}: PageProps) {
  await requireRole(["admin"]);

  const { id } = await params;

  const serviceClient =
    createServiceClient();

  const {
    data: rate,
    error: rateError,
  } = await serviceClient
    .from("insurance_cost_rates")
    .select(`
      id,
      insurance_company_id,
      min_age,
      max_age,
      duration_years,
      real_cost,
      effective_from,
      is_active
    `)
    .eq("id", id)
    .maybeSingle();

  if (
    rateError ||
    !rate
  ) {
    return (
      <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
            <h1 className="text-lg font-black text-red-800">
              Tarif introuvable
            </h1>

            <p className="mt-2 text-sm text-red-700">
              Ce tarif n’existe pas ou n’est plus disponible.
            </p>

            <Link
              href="/admin/comptabilite/tarifs"
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-red-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux tarifs
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const typedRate =
    rate as RateRow;

  const {
    data: company,
  } = await serviceClient
    .from("insurance_companies")
    .select(`
      id,
      name
    `)
    .eq(
      "id",
      typedRate.insurance_company_id,
    )
    .maybeSingle();

  const typedCompany =
    company as CompanyRow | null;

  return (
    <main className="w-full px-4 pb-10 pt-5 sm:px-6 sm:pt-6 lg:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <Link
            href="/admin/comptabilite/tarifs"
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0B5D3B]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux tarifs
          </Link>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Modifier le tarif
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Modifiez les informations de ce tarif réel.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3F8F2] text-[#0B5D3B]">
              <Building2 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Assureur
              </p>

              <h2 className="font-black text-slate-900">
                {typedCompany?.name ??
                  "Assureur inconnu"}
              </h2>
            </div>
          </div>

          <form className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Âge minimum
                </label>

                <input
                  type="number"
                  defaultValue={
                    typedRate.min_age
                  }
                  min={0}
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Âge maximum
                </label>

                <input
                  type="number"
                  defaultValue={
                    typedRate.max_age
                  }
                  min={0}
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Durée
              </label>

              <div className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700">
                <CalendarDays className="h-4 w-4 text-slate-400" />

                {typedRate.duration_years}{" "}
                an
                {typedRate.duration_years > 1
                  ? "s"
                  : ""}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Coût réel
              </label>

              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={Number(
                    typedRate.real_cost,
                  )}
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 pr-14 text-sm font-semibold outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
                />

                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  TL
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Date d’entrée en vigueur
              </label>

              <input
                type="date"
                defaultValue={
                  typedRate.effective_from
                }
                className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
              />
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Tarif actif
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Un tarif inactif ne devra plus être utilisé pour les nouveaux dossiers.
                </p>
              </div>

              <input
                type="checkbox"
                defaultChecked={
                  typedRate.is_active
                }
                className="h-5 w-5 accent-[#0B5D3B]"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link
                href="/admin/comptabilite/tarifs"
                className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Annuler
              </Link>

              <button
                type="button"
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0B5D3B] px-5 text-sm font-bold text-white transition hover:bg-[#084B30]"
              >
                <Pencil className="h-4 w-4" />
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}