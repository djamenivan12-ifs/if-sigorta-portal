import Link from "next/link";
import { notFound } from "next/navigation";

import PartnerForm from "./PartnerForm";

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
      dateStyle: "medium",
      timeStyle: "short",
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

  const {
    data,
    error,
  } =
    await supabase
      .from("partners")
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
                    .charAt(0)
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
                {partner.email}
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

        <div className="mt-6">
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
      </div>
    </main>
  );
}