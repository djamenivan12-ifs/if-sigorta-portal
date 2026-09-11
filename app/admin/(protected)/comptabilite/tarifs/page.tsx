import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Pencil,
  Power,
  PowerOff,
} from "lucide-react";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

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
  is_active: boolean;
};

type RateGroup = {
  key: string;
  minAge: number;
  maxAge: number;
  effectiveFrom: string;
  oneYearId: string | null;
  twoYearId: string | null;
  oneYearCost: number;
  twoYearCost: number;
  isActive: boolean;
};

function formatCurrency(
  value: number,
) {
  return `${value.toLocaleString(
    "fr-FR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  )} TL`;
}

function formatDate(
  value: string,
) {
  const date = new Date(
    `${value}T00:00:00`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      timeZone:
        "Europe/Istanbul",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

async function toggleRateGroupStatus(
  formData: FormData,
) {
  "use server";

  await requireRole(["admin"]);

  const oneYearId =
    String(
      formData.get(
        "oneYearId",
      ) ?? "",
    ).trim();

  const twoYearId =
    String(
      formData.get(
        "twoYearId",
      ) ?? "",
    ).trim();

  const nextActive =
    String(
      formData.get(
        "nextActive",
      ) ?? "",
    ) === "true";

  const ids = [
    oneYearId,
    twoYearId,
  ].filter(Boolean);

  if (ids.length === 0) {
    throw new Error(
      "Aucun tarif à modifier.",
    );
  }

  const serviceClient =
    createServiceClient();

  const { error } =
    await serviceClient
      .from(
        "insurance_cost_rates",
      )
      .update({
        is_active:
          nextActive,
        updated_at:
          new Date().toISOString(),
      })
      .in("id", ids);

  if (error) {
    throw new Error(
      error.message,
    );
  }

  revalidatePath(
    "/admin/comptabilite/tarifs",
  );

  revalidatePath(
    "/admin/comptabilite",
  );
}

function groupRates(
  rates: RateRow[],
) {
  const groups =
    new Map<
      string,
      RateGroup
    >();

  for (const rate of rates) {
    const key =
      `${rate.min_age}-${rate.max_age}-${rate.effective_from}`;

    const existing =
      groups.get(key);

    if (!existing) {
      groups.set(
        key,
        {
          key,
          minAge:
            rate.min_age,
          maxAge:
            rate.max_age,
          effectiveFrom:
            rate.effective_from,
          oneYearId:
            rate.duration_years ===
            1
              ? rate.id
              : null,
          twoYearId:
            rate.duration_years ===
            2
              ? rate.id
              : null,
          oneYearCost:
            rate.duration_years ===
            1
              ? Number(
                  rate.real_cost,
                )
              : 0,
          twoYearCost:
            rate.duration_years ===
            2
              ? Number(
                  rate.real_cost,
                )
              : 0,
          isActive:
            rate.is_active,
        },
      );

      continue;
    }

    if (
      rate.duration_years ===
      1
    ) {
      existing.oneYearId =
        rate.id;

      existing.oneYearCost =
        Number(
          rate.real_cost,
        );
    }

    if (
      rate.duration_years ===
      2
    ) {
      existing.twoYearId =
        rate.id;

      existing.twoYearCost =
        Number(
          rate.real_cost,
        );
    }

    existing.isActive =
      existing.isActive &&
      rate.is_active;
  }

  return Array.from(
    groups.values(),
  ).sort(
    (a, b) => {
      const dateCompare =
        b.effectiveFrom.localeCompare(
          a.effectiveFrom,
        );

      if (
        dateCompare !== 0
      ) {
        return dateCompare;
      }

      return (
        a.minAge -
        b.minAge
      );
    },
  );
}

export default async function AccountingRatesPage() {
  await requireRole(["admin"]);

  const serviceClient =
    createServiceClient();

  const [
    companiesResult,
    ratesResult,
  ] = await Promise.all([
    serviceClient
      .from(
        "insurance_companies",
      )
      .select(`
        id,
        name,
        is_active
      `)
      .order(
        "name",
        {
          ascending: true,
        },
      ),

    serviceClient
      .from(
        "insurance_cost_rates",
      )
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
      .order(
        "effective_from",
        {
          ascending: false,
        },
      )
      .order(
        "min_age",
        {
          ascending: true,
        },
      ),
  ]);

  if (
    companiesResult.error
  ) {
    throw new Error(
      companiesResult.error.message,
    );
  }

  if (ratesResult.error) {
    throw new Error(
      ratesResult.error.message,
    );
  }

  const companies =
    (companiesResult.data ??
      []) as CompanyRow[];

  const rates =
    (ratesResult.data ??
      []) as RateRow[];

  return (
    <main className="w-full px-4 pb-10 pt-5 sm:px-6 sm:pt-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mx-auto w-full max-w-[1600px] space-y-7">
        <header>
          <Link
            href="/admin/comptabilite"
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0B5D3B]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la comptabilité
          </Link>

          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Gestion des tarifs
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Consultez et modifiez les coûts réels utilisés pour les nouveaux dossiers. Les tarifs 1 an et 2 ans peuvent être modifiés séparément.
          </p>
        </header>

        {companies.length ===
        0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Building2 className="mx-auto h-10 w-10 text-slate-300" />

            <p className="mt-3 font-bold text-slate-700">
              Aucun assureur enregistré.
            </p>
          </section>
        ) : (
          <div className="space-y-6">
            {companies.map(
              (company) => {
                const companyRates =
                  rates.filter(
                    (rate) =>
                      rate.insurance_company_id ===
                      company.id,
                  );

                const groups =
                  groupRates(
                    companyRates,
                  );

                return (
                  <section
                    key={
                      company.id
                    }
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3F8F2] text-[#0B5D3B]">
                          <Building2 className="h-5 w-5" />
                        </div>

                        <div>
                          <Link
                            href={`/admin/comptabilite/assureurs/${company.id}`}
                            className="font-black text-slate-950 transition hover:text-[#0B5D3B] hover:underline"
                          >
                            {company.name}
                          </Link>

                          <p className="mt-0.5 text-xs font-semibold text-slate-500">
                            {company.is_active
                              ? "Assureur actif"
                              : "Assureur inactif"}
                          </p>
                        </div>
                      </div>

                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {groups.length}{" "}
                        grille
                        {groups.length >
                        1
                          ? "s"
                          : ""}
                      </span>
                    </div>

                    {groups.length ===
                    0 ? (
                      <div className="p-8 text-center text-sm font-semibold text-slate-400">
                        Aucun tarif pour cet assureur.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {groups.map(
                          (
                            group,
                            index,
                          ) => (
                            <div
                              key={`${group.key}-${index}`}
                              className="p-4 sm:p-5 lg:px-6"
                            >
                              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                  <DataBlock
                                    label="Tranche d’âge"
                                    value={`${group.minAge} – ${group.maxAge} ans`}
                                  />

                                  <RateCostBlock
                                    label="Coût réel 1 an"
                                    value={formatCurrency(
                                      group.oneYearCost,
                                    )}
                                    rateId={
                                      group.oneYearId
                                    }
                                  />

                                  <RateCostBlock
                                    label="Coût réel 2 ans"
                                    value={formatCurrency(
                                      group.twoYearCost,
                                    )}
                                    rateId={
                                      group.twoYearId
                                    }
                                  />

                                  <DataBlock
                                    label="Entrée en vigueur"
                                    value={formatDate(
                                      group.effectiveFrom,
                                    )}
                                    icon={
                                      <CalendarDays className="h-4 w-4" />
                                    }
                                  />
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
                                  <span
                                    className={[
                                      "inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-black",
                                      group.isActive
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-slate-100 text-slate-500",
                                    ].join(
                                      " ",
                                    )}
                                  >
                                    {group.isActive
                                      ? "Actif"
                                      : "Inactif"}
                                  </span>

                                  <form
                                    action={
                                      toggleRateGroupStatus
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="oneYearId"
                                      value={
                                        group.oneYearId ??
                                        ""
                                      }
                                    />

                                    <input
                                      type="hidden"
                                      name="twoYearId"
                                      value={
                                        group.twoYearId ??
                                        ""
                                      }
                                    />

                                    <input
                                      type="hidden"
                                      name="nextActive"
                                      value={
                                        group.isActive
                                          ? "false"
                                          : "true"
                                      }
                                    />

                                    <button
                                      type="submit"
                                      className={[
                                        "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition sm:w-auto",
                                        group.isActive
                                          ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                          : "border-[#0B5D3B]/20 bg-[#F3F8F2] text-[#0B5D3B] hover:border-[#0B5D3B] hover:bg-[#E7F2E5]",
                                      ].join(
                                        " ",
                                      )}
                                    >
                                      {group.isActive ? (
                                        <PowerOff className="h-4 w-4" />
                                      ) : (
                                        <Power className="h-4 w-4" />
                                      )}

                                      {group.isActive
                                        ? "Désactiver"
                                        : "Activer"}
                                    </button>
                                  </form>
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </section>
                );
              },
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function RateCostBlock({
  label,
  value,
  rateId,
}: {
  label: string;
  value: string;
  rateId: string | null;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3.5">
      <p className="text-xs font-bold text-slate-500">
        {label}
      </p>

      <div className="mt-1.5 flex items-center gap-2 text-sm font-black text-slate-900">
        <CircleDollarSign className="h-4 w-4 shrink-0 text-[#0B5D3B]" />

        <span className="break-words">
          {rateId
            ? value
            : "Non défini"}
        </span>
      </div>

      {rateId ? (
        <Link
          href={`/admin/comptabilite/tarifs/${rateId}`}
          className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#0B5D3B]/20 bg-white px-3 text-xs font-black text-[#0B5D3B] transition hover:border-[#0B5D3B] hover:bg-[#F3F8F2] sm:w-auto"
        >
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </Link>
      ) : (
        <p className="mt-3 text-xs font-semibold text-slate-400">
          Aucun tarif enregistré
        </p>
      )}
    </div>
  );
}

function DataBlock({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3.5">
      <p className="text-xs font-bold text-slate-500">
        {label}
      </p>

      <div className="mt-1.5 flex items-center gap-2 text-sm font-black text-slate-900">
        {icon ? (
          <span className="shrink-0 text-[#0B5D3B]">
            {icon}
          </span>
        ) : null}

        <span className="break-words">
          {value}
        </span>
      </div>
    </div>
  );
}
