import Link from "next/link";

import {
  CalendarDays,
  ChevronRight,
  FilePlus2,
  FolderOpen,
  Search,
  UserRound,
} from "lucide-react";

import { requirePartner } from "@/lib/auth/requirePartner";
import { createServiceClient } from "@/lib/supabase/service";

type RequestRow = {
  id: string;
  request_code: string;
  status: string;
  insurance_duration_years: number;
  calculated_price: number | string;
  created_at: string;

  client:
    | {
        first_name: string;
        last_name: string;
        passport_number?: string | null;
      }
    | {
        first_name: string;
        last_name: string;
        passport_number?: string | null;
      }[]
    | null;
};

const statusLabels: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  draft: {
    label: "Brouillon",
    className:
      "bg-slate-100 text-slate-700",
  },

  waiting_payment: {
    label: "Paiement attendu",
    className:
      "bg-amber-100 text-amber-800",
  },

  payment_review: {
    label: "Paiement en vérification",
    className:
      "bg-orange-100 text-orange-800",
  },

  payment_confirmed: {
    label: "Paiement confirmé",
    className:
      "bg-green-100 text-green-800",
  },

  policy_preparation: {
    label: "Assurance en préparation",
    className:
      "bg-blue-100 text-blue-800",
  },

  policy_available: {
    label: "Assurance disponible",
    className:
      "bg-emerald-100 text-emerald-800",
  },

  payment_rejected: {
    label: "Paiement refusé",
    className:
      "bg-red-100 text-red-800",
  },

  cancelled: {
    label: "Dossier annulé",
    className:
      "bg-slate-200 text-slate-800",
  },
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
    },
  ).format(date);
}

function getClient(
  client: RequestRow["client"],
) {
  if (
    Array.isArray(client)
  ) {
    return (
      client[0] ??
      null
    );
  }

  return client;
}

export default async function PartnerDossiersPage() {
  /*
   * L'identité du partenaire vient
   * exclusivement de la session
   * authentifiée.
   */
  const { partner } =
    await requirePartner();

  const serviceClient =
    createServiceClient();

  /*
   * Sécurité :
   *
   * - uniquement les dossiers
   *   provenant d'un partenaire ;
   *
   * - uniquement ceux du partenaire
   *   actuellement connecté.
   */
  const {
    data,
    error,
  } =
    await serviceClient
      .from(
        "insurance_requests",
      )
      .select(
        `
          id,
          request_code,
          status,
          insurance_duration_years,
          calculated_price,
          created_at,

          client:clients (
            first_name,
            last_name
          )
        `,
      )
      .eq(
        "source",
        "partner",
      )
      .eq(
        "partner_id",
        partner.id,
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

  const requests =
    (data ??
      []) as RequestRow[];

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-5 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
            Espace partenaire
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight text-[#102B20] sm:text-3xl">
            Mes dossiers
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Retrouvez ici uniquement
            les dossiers créés par
            votre compte partenaire.
          </p>
        </div>

        <Link
          href="/partenaire/nouvelle-demande"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0B5D3B] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#084A2F]"
        >
          <FilePlus2 className="h-4 w-4" />

          Nouvelle demande
        </Link>
      </div>

      <div className="mt-7 rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-black text-[#102B20]">
              Dossiers enregistrés
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {requests.length}{" "}
              {requests.length === 1
                ? "dossier"
                : "dossiers"}
            </p>
          </div>

          {requests.length >
            0 && (
            <div className="flex items-center gap-2 rounded-xl bg-[#F3F8F2] px-3 py-2 text-xs font-bold text-[#0B5D3B]">
              <Search className="h-4 w-4" />

              Les plus récents en premier
            </div>
          )}
        </div>

        {requests.length ===
        0 ? (
          <div className="flex min-h-72 items-center justify-center p-6 text-center">
            <div>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3F8F2] text-[#0B5D3B]">
                <FolderOpen className="h-7 w-7" />
              </div>

              <p className="mt-4 font-black text-[#102B20]">
                Aucun dossier
              </p>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Vous n’avez encore créé
                aucun dossier
                d’assurance depuis
                votre espace
                partenaire.
              </p>

              <Link
                href="/partenaire/nouvelle-demande"
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0B5D3B] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#084A2F]"
              >
                <FilePlus2 className="h-4 w-4" />

                Créer un dossier
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Version ordinateur */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-[#FAFCF9] text-left">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                      Client
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                      Matricule
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                      Durée
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                      Prix
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                      Statut
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                      Créé le
                    </th>

                    <th className="w-16 px-6 py-4">
                      <span className="sr-only">
                        Ouvrir
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map(
                    (
                      request,
                    ) => {
                      const client =
                        getClient(
                          request.client,
                        );

                      const status =
                        statusLabels[
                          request.status
                        ] ?? {
                          label:
                            request.status,

                          className:
                            "bg-slate-100 text-slate-700",
                        };

                      const duration =
                        request.insurance_duration_years ===
                        2
                          ? 2
                          : 1;

                      return (
                        <tr
                          key={
                            request.id
                          }
                          className="border-b border-slate-100 transition last:border-b-0 hover:bg-[#FAFCF9]"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F8F2] text-[#0B5D3B]">
                                <UserRound className="h-5 w-5" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-black text-[#102B20]">
                                  {client
                                    ? `${client.first_name} ${client.last_name}`
                                    : "Client"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <span className="font-mono text-sm font-bold text-slate-700">
                              {
                                request.request_code
                              }
                            </span>
                          </td>

                          <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                            {duration}{" "}
                            {duration ===
                            1
                              ? "an"
                              : "ans"}
                          </td>

                          <td className="px-6 py-5 text-sm font-black text-[#102B20]">
                            {Number(
                              request.calculated_price,
                            ).toLocaleString(
                              "fr-FR",
                            )}{" "}
                            TL
                          </td>

                          <td className="px-6 py-5">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${status.className}`}
                            >
                              {
                                status.label
                              }
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <CalendarDays className="h-4 w-4" />

                              {formatDate(
                                request.created_at,
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-5 text-right">
                            <Link
                              href={`/partenaire/dossiers/${request.id}`}
                              aria-label={`Ouvrir le dossier ${request.request_code}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#0B5D3B] transition hover:bg-[#F3F8F2]"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            {/* Version mobile / tablette */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {requests.map(
                (
                  request,
                ) => {
                  const client =
                    getClient(
                      request.client,
                    );

                  const status =
                    statusLabels[
                      request.status
                    ] ?? {
                      label:
                        request.status,

                      className:
                        "bg-slate-100 text-slate-700",
                    };

                  const duration =
                    request.insurance_duration_years ===
                    2
                      ? 2
                      : 1;

                  return (
                    <Link
                      key={
                        request.id
                      }
                      href={`/partenaire/dossiers/${request.id}`}
                      className="block p-5 transition hover:bg-[#FAFCF9]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F8F2] text-[#0B5D3B]">
                            <UserRound className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-black text-[#102B20]">
                              {client
                                ? `${client.first_name} ${client.last_name}`
                                : "Client"}
                            </p>

                            <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-500">
                              {
                                request.request_code
                              }
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-slate-400" />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${status.className}`}
                        >
                          {
                            status.label
                          }
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                          {duration}{" "}
                          {duration ===
                          1
                            ? "an"
                            : "ans"}
                        </span>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <CalendarDays className="h-4 w-4" />

                          {formatDate(
                            request.created_at,
                          )}
                        </div>

                        <p className="text-sm font-black text-[#0B5D3B]">
                          {Number(
                            request.calculated_price,
                          ).toLocaleString(
                            "fr-FR",
                          )}{" "}
                          TL
                        </p>
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}