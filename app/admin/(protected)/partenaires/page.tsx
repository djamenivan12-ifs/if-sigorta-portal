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
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-[1500px]">
        <header className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.75rem] sm:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
                Administration
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-3 sm:text-3xl lg:text-4xl">
                Gestion des partenaires
              </h1>

              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500 sm:mt-3 sm:text-sm sm:leading-7">
                Gérez les apporteurs d’affaires
                autorisés à créer et suivre leurs
                propres dossiers d’assurance.
              </p>
            </div>

            <Link
              href="/admin/partenaires/nouveau"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#B8E83D] px-4 text-[13px] font-black text-[#15311F] transition hover:bg-[#C7F34E] sm:min-h-11 sm:w-auto sm:px-5 sm:text-sm"
            >
              + Ajouter un partenaire
            </Link>
          </div>
        </header>

        <section className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-4">
          <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 sm:rounded-[1.5rem] sm:p-5">
            <p className="text-[11px] font-medium leading-4 text-slate-500 sm:text-sm">
              Total partenaires
            </p>

            <p className="mt-2 break-words text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-3 sm:text-3xl">
              {partners.length.toLocaleString(
                "fr-FR",
              )}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 sm:rounded-[1.5rem] sm:p-5">
            <p className="text-[11px] font-medium leading-4 text-slate-500 sm:text-sm">
              Partenaires actifs
            </p>

            <p className="mt-2 break-words text-2xl font-semibold tracking-[-0.04em] text-[#0B5D3B] sm:mt-3 sm:text-3xl">
              {activePartners.toLocaleString(
                "fr-FR",
              )}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 sm:rounded-[1.5rem] sm:p-5">
            <p className="text-[11px] font-medium leading-4 text-slate-500 sm:text-sm">
              Partenaires inactifs
            </p>

            <p className="mt-2 break-words text-2xl font-semibold tracking-[-0.04em] text-slate-500 sm:mt-3 sm:text-3xl">
              {inactivePartners.toLocaleString(
                "fr-FR",
              )}
            </p>
          </div>
        </section>

        <section className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white sm:mt-6 sm:rounded-[1.5rem]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
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
            <div className="px-4 py-10 text-center sm:px-6 sm:py-16">
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
            <>
              <div className="divide-y divide-slate-100 lg:hidden">
                {partners.map((partner) => (
                  <article
                    key={partner.id}
                    className="min-w-0 p-4 sm:p-5"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-[15px] font-bold leading-5 text-[#102B20] sm:text-base">
                          {partner.company_name}
                        </p>

                        <span className="mt-1.5 inline-flex max-w-full break-all rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-700 sm:text-xs">
                          {partner.code}
                        </span>
                      </div>

                      <span
                        className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${
                          partner.is_active
                            ? "border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {partner.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>

                    <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                      <div className="min-w-0">
                        <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Responsable
                        </dt>
                        <dd className="mt-1 break-words text-[12px] font-semibold text-slate-700 sm:text-sm">
                          {partner.manager_name}
                        </dd>
                      </div>

                      <div className="min-w-0">
                        <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          WhatsApp
                        </dt>
                        <dd className="mt-1 break-words text-[12px] font-semibold text-slate-700 sm:text-sm">
                          {formatWhatsapp(
                            partner.whatsapp_country_code,
                            partner.whatsapp_number,
                          )}
                        </dd>
                      </div>

                      <div className="min-w-0 sm:col-span-2">
                        <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Email
                        </dt>
                        <dd className="mt-1 break-all text-[12px] font-semibold text-slate-700 sm:text-sm">
                          {partner.email}
                        </dd>
                      </div>

                      <div className="min-w-0 sm:col-span-2">
                        <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Créé le
                        </dt>
                        <dd className="mt-1 break-words text-[12px] font-semibold text-slate-700 sm:text-sm">
                          {formatDate(partner.created_at)}
                        </dd>
                      </div>
                    </dl>

                    <Link
                      href={`/admin/partenaires/${partner.id}`}
                      className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#CFE3CF] bg-white px-4 text-[12px] font-semibold text-[#0B5D3B] transition hover:bg-[#F3F8F2] sm:min-h-11 sm:text-sm"
                    >
                      Ouvrir
                    </Link>
                  </article>
                ))}
              </div>

              <div className="hidden lg:block">
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
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}