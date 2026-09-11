import Link from "next/link";
import {
  ArrowLeft,
  Building2,
} from "lucide-react";

import EditInsuranceRateForm from "@/components/admin/accounting/EditInsuranceRateForm";
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
            Modifiez le tarif réel utilisé pour les nouveaux dossiers.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3F8F2] text-[#0B5D3B]">
              <Building2 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Assureur
              </p>

              {typedCompany ? (
                <Link
                  href={`/admin/comptabilite/assureurs/${typedCompany.id}`}
                  className="block break-words font-black text-slate-900 transition hover:text-[#0B5D3B] hover:underline"
                >
                  {typedCompany.name}
                </Link>
              ) : (
                <h2 className="font-black text-slate-900">
                  Assureur inconnu
                </h2>
              )}
            </div>
          </div>

          <EditInsuranceRateForm
            rate={{
              id: typedRate.id,
              minAge: typedRate.min_age,
              maxAge: typedRate.max_age,
              durationYears:
                typedRate.duration_years,
              realCost: Number(
                typedRate.real_cost,
              ),
              effectiveFrom:
                typedRate.effective_from.slice(
                  0,
                  10,
                ),
              isActive:
                typedRate.is_active,
            }}
          />
        </section>
      </div>
    </main>
  );
}