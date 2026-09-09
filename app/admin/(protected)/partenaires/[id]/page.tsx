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
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-5xl">
        <Link
          href="/admin/partenaires"
          className="inline-flex min-h-10 items-center gap-2 text-[13px] font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] sm:text-sm"
        >
          <span aria-hidden="true">
            ←
          </span>

          Retour aux partenaires
        </Link>

        <header className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white sm:mt-6 sm:rounded-[1.75rem]">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex min-w-0 flex-col gap-5 sm:gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3F8F2] text-lg font-black text-[#0B5D3B] sm:h-14 sm:w-14 sm:rounded-2xl sm:text-xl">
                  {partner.company_name
                    .charAt(
                      0,
                    )
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                    <h1 className="break-words text-xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-2xl lg:text-3xl">
                      {
                        partner.company_name
                      }
                    </h1>

                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${
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

                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 sm:mt-3 sm:gap-3">
                    <span className="inline-flex max-w-full break-all rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-700 sm:text-xs">
                      {
                        partner.code
                      }
                    </span>

                    <span className="break-words text-[12px] text-slate-500 sm:text-sm">
                      Responsable :{" "}
                      {
                        partner.manager_name
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-[#FAFBF9] px-4 py-3 sm:rounded-2xl sm:px-5 sm:py-4 lg:w-auto lg:min-w-[170px]">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 sm:text-xs">
                  Dossiers créés
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-2 sm:text-3xl">
                  {totalDossiers.toLocaleString(
                    "fr-FR",
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 border-t border-slate-100 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 border-b border-slate-100 px-4 py-3 sm:border-r sm:px-6 sm:py-4 lg:border-b-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-xs">
                Email
              </p>

              <p className="mt-1.5 break-all text-[12px] font-medium text-[#102B20] sm:mt-2 sm:text-sm">
                {
                  partner.email
                }
              </p>
            </div>

            <div className="min-w-0 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4 lg:border-b-0 lg:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-xs">
                WhatsApp
              </p>

              <p className="mt-1.5 break-words text-[12px] font-medium text-[#102B20] sm:mt-2 sm:text-sm">
                {
                  partner.whatsapp_country_code
                }{" "}
                {
                  partner.whatsapp_number
                }
              </p>
            </div>

            <div className="min-w-0 border-b border-slate-100 px-4 py-3 sm:border-r sm:border-b-0 sm:px-6 sm:py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-xs">
                Créé le
              </p>

              <p className="mt-1.5 break-words text-[12px] font-medium text-[#102B20] sm:mt-2 sm:text-sm">
                {formatDate(
                  partner.created_at,
                )}
              </p>
            </div>

            <div className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-xs">
                Dernière modification
              </p>

              <p className="mt-1.5 break-words text-[12px] font-medium text-[#102B20] sm:mt-2 sm:text-sm">
                {formatDate(
                  partner.updated_at,
                )}
              </p>
            </div>
          </div>
        </header>

        {/* INFORMATIONS DU PARTENAIRE */}

        <section className="mt-6 min-w-0 sm:mt-8">
          <div className="mb-4 min-w-0 sm:mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
              Informations
            </p>

            <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
              Informations du partenaire
            </h2>

            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500 sm:text-sm">
              Modifiez les coordonnées,
              le responsable et le statut
              de ce partenaire.
            </p>
          </div>

          <div className="min-w-0">
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
          </div>
        </section>

        {/* TARIFICATION DU PARTENAIRE */}

        <section className="mt-8 min-w-0 sm:mt-10 lg:mt-12">
          <div className="mb-4 min-w-0 sm:mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
              Tarification
            </p>

            <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
              Tarifs du partenaire
            </h2>

            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500 sm:text-sm">
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

          <div className="min-w-0">
            <PartnerPriceSettingsForm
            partnerId={
              partner.id
            }
            initialRanges={
              priceRanges
            }
            />
          </div>
        </section>
      </div>
    </main>
  );
}