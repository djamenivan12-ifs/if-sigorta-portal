import Link from "next/link";
import { notFound } from "next/navigation";

import PartnerForm from "./PartnerForm";
import PartnerPriceSettingsForm from "./PartnerPriceSettingsForm";

import {
  requireRole,
} from "@/lib/auth/requireRole";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type Partner = {
  id: string;
  code: string;
  company_name: string;
  manager_name: string;
  email: string;
  whatsapp_country_code: string;
  whatsapp_number: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type PartnerPriceRangeRow = {
  id: number;
  minimum_age: number;
  maximum_age: number;
  one_year_price:
    | number
    | string;
  two_year_price:
    | number
    | string;
  is_active: boolean;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(
  value: string,
) {
  const date =
    new Date(value);

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
      dateStyle:
        "medium",
      timeStyle:
        "short",
      timeZone:
        "Europe/Istanbul",
    },
  ).format(date);
}

export default async function PartnerPage({
  params,
}: PageProps) {
  await requireRole([
    "admin",
  ]);

  const {
    id,
  } =
    await params;

  const supabase =
    createServiceClient();

  /*
   * ============================
   * PARTENAIRE
   * ============================
   */

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "partners",
      )
      .select(
        `
          id,
          code,
          company_name,
          manager_name,
          email,
          whatsapp_country_code,
          whatsapp_number,
          is_active,
          created_at,
          updated_at
        `,
      )
      .eq(
        "id",
        id,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  if (!data) {
    notFound();
  }

  const partner =
    data as Partner;

  /*
   * ============================
   * NOMBRE DE DOSSIERS
   * ============================
   */

  const {
    count:
      dossierCount,
    error:
      dossierCountError,
  } =
    await supabase
      .from(
        "insurance_requests",
      )
      .select(
        "id",
        {
          count:
            "exact",
          head:
            true,
        },
      )
      .eq(
        "partner_id",
        partner.id,
      );

  if (
    dossierCountError
  ) {
    throw new Error(
      dossierCountError.message,
    );
  }

  const totalDossiers =
    dossierCount ?? 0;

  /*
   * ============================
   * TARIFS DU PARTENAIRE
   * ============================
   */

  const {
    data:
      priceRangesData,
    error:
      priceRangesError,
  } =
    await supabase
      .from(
        "partner_price_ranges",
      )
      .select(
        `
          id,
          minimum_age,
          maximum_age,
          one_year_price,
          two_year_price,
          is_active
        `,
      )
      .eq(
        "partner_id",
        partner.id,
      )
      .order(
        "minimum_age",
        {
          ascending:
            true,
        },
      );

  if (
    priceRangesError
  ) {
    throw new Error(
      priceRangesError.message,
    );
  }

  const priceRanges =
    (
      priceRangesData ??
      []
    ).map(
      (row) => {
        const item =
          row as PartnerPriceRangeRow;

        return {
          id:
            item.id,

          minimumAge:
            item.minimum_age,

          maximumAge:
            item.maximum_age,

          oneYearPrice:
            Number(
              item.one_year_price,
            ),

          twoYearPrice:
            Number(
              item.two_year_price,
            ),

          isActive:
            item.is_active,
        };
      },
    );

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/partenaires"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B5D3B] transition hover:text-[#084A2F]"
        >
          <span aria-hidden="true">
            ←
          </span>

          Retour aux partenaires
        </Link>

        <header className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F3F8F2] text-xl font-black text-[#0B5D3B]">
                  {partner.company_name
                    .charAt(
                      0,
                    )
                    .toUpperCase()}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#102B20]">
                      {
                        partner.company_name
                      }
                    </h1>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        partner.is_active
                          ? "border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {partner.is_active
                        ? "Actif"
                        : "Inactif"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                      {
                        partner.code
                      }
                    </span>

                    <span className="text-sm text-slate-500">
                      Responsable :{" "}
                      {
                        partner.manager_name
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#FAFBF9] px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Dossiers créés
                </p>

                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#102B20]">
                  {totalDossiers.toLocaleString(
                    "fr-FR",
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid border-t border-slate-100 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-b border-slate-100 px-6 py-4 sm:border-r lg:border-b-0">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Email
              </p>

              <p className="mt-2 break-all text-sm font-medium text-[#102B20]">
                {
                  partner.email
                }
              </p>
            </div>

            <div className="border-b border-slate-100 px-6 py-4 lg:border-b-0 lg:border-r">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                WhatsApp
              </p>

              <p className="mt-2 text-sm font-medium text-[#102B20]">
                {
                  partner.whatsapp_country_code
                }{" "}
                {
                  partner.whatsapp_number
                }
              </p>
            </div>

            <div className="border-b border-slate-100 px-6 py-4 sm:border-r sm:border-b-0">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Créé le
              </p>

              <p className="mt-2 text-sm font-medium text-[#102B20]">
                {formatDate(
                  partner.created_at,
                )}
              </p>
            </div>

            <div className="px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Dernière modification
              </p>

              <p className="mt-2 text-sm font-medium text-[#102B20]">
                {formatDate(
                  partner.updated_at,
                )}
              </p>
            </div>
          </div>
        </header>

        {/* INFORMATIONS DU PARTENAIRE */}

        <section className="mt-8">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
              Informations
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
              Informations du partenaire
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Modifiez les coordonnées,
              le responsable et le statut
              de ce partenaire.
            </p>
          </div>

          <PartnerForm
            partner={{
              id:
                partner.id,

              code:
                partner.code,

              companyName:
                partner.company_name,

              managerName:
                partner.manager_name,

              email:
                partner.email,

              whatsappCountryCode:
                partner.whatsapp_country_code,

              whatsappNumber:
                partner.whatsapp_number,

              isActive:
                partner.is_active,
            }}
            dossierCount={
              totalDossiers
            }
          />
        </section>

        {/* TARIFICATION DU PARTENAIRE */}

        <section className="mt-12">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
              Tarification
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
              Tarifs du partenaire
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Cette grille est propre à{" "}
              <span className="font-semibold text-[#102B20]">
                {
                  partner.company_name
                }
              </span>
              . Les modifications
              effectuées ici n’affectent
              ni les tarifs publics ni
              les autres partenaires.
            </p>
          </div>

          <PartnerPriceSettingsForm
            partnerId={
              partner.id
            }
            initialRanges={
              priceRanges
            }
          />
        </section>
      </div>
    </main>
  );
}