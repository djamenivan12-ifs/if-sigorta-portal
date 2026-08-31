import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type PartnerRow = {
  id: string;
  code: string;
  company_name: string;
  manager_name: string;
  email: string;
  whatsapp_country_code: string;
  whatsapp_number: string;
  is_active: boolean;
  created_at: string;
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

function formatWhatsapp(
  countryCode: string,
  number: string,
) {
  return `${countryCode} ${number}`.trim();
}

export default async function PartnersPage() {
  /*
   * La gestion des partenaires
   * est réservée aux administrateurs.
   */
  await requireRole([
    "admin",
  ]);

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
          created_at
        `,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const partners =
    (data ??
      []) as PartnerRow[];

  const activePartners =
    partners.filter(
      (partner) =>
        partner.is_active,
    ).length;

  const inactivePartners =
    partners.length -
    activePartners;

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                Administration
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-4xl">
                Gestion des partenaires
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                Gérez les apporteurs d’affaires
                autorisés à créer et suivre leurs
                propres dossiers d’assurance.
              </p>
            </div>

            <Link
              href="/admin/partenaires/nouveau"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#B8E83D] px-5 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E]"
            >
              + Ajouter un partenaire
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Total partenaires
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#102B20]">
              {partners.length.toLocaleString(
                "fr-FR",
              )}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Partenaires actifs
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0B5D3B]">
              {activePartners.toLocaleString(
                "fr-FR",
              )}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Partenaires inactifs
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-500">
              {inactivePartners.toLocaleString(
                "fr-FR",
              )}
            </p>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
              Partenaires enregistrés
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {partners.length} partenaire
              {partners.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

          {partners.length ===
          0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3F8F2] text-xl font-black text-[#0B5D3B]">
                P
              </div>

              <p className="mt-5 font-semibold text-[#102B20]">
                Aucun partenaire enregistré
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Commencez par ajouter votre premier
                partenaire commercial.
              </p>

              <Link
                href="/admin/partenaires/nouveau"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#B8E83D] px-5 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E]"
              >
                Ajouter un partenaire
              </Link>
            </div>
          ) : (
            <TableContainer className="rounded-none border-0 shadow-none">
              <Table className="min-w-[1250px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Partenaire
                    </TableHead>

                    <TableHead>
                      Code
                    </TableHead>

                    <TableHead>
                      Responsable
                    </TableHead>

                    <TableHead>
                      Email
                    </TableHead>

                    <TableHead>
                      WhatsApp
                    </TableHead>

                    <TableHead>
                      Statut
                    </TableHead>

                    <TableHead>
                      Créé le
                    </TableHead>

                    <TableHead className="text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {partners.map(
                    (partner) => (
                      <TableRow
                        key={
                          partner.id
                        }
                      >
                        <TableCell className="whitespace-nowrap font-semibold text-[#102B20]">
                          {
                            partner.company_name
                          }
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                            {
                              partner.code
                            }
                          </span>
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-slate-600">
                          {
                            partner.manager_name
                          }
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-slate-600">
                          {
                            partner.email
                          }
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-slate-600">
                          {formatWhatsapp(
                            partner.whatsapp_country_code,
                            partner.whatsapp_number,
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
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
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-slate-600">
                          {formatDate(
                            partner.created_at,
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-right">
                          <Link
                            href={`/admin/partenaires/${partner.id}`}
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#CFE3CF] bg-white px-4 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#F3F8F2]"
                          >
                            Ouvrir
                          </Link>
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </section>
      </div>
    </main>
  );
}