import Link from "next/link";

import {
  ArrowRight,
  Clock3,
} from "lucide-react";

import Badge from "@/components/ui/Badge";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

type RequestStatus =
  | "waiting_payment"
  | "payment_review"
  | "payment_confirmed"
  | "policy_preparation"
  | "policy_available"
  | "payment_rejected"
  | "cancelled";

type RecentRequest = {
  id: string;
  requestCode: string;
  clientName: string;
  durationYears: 1 | 2;
  amount: number;
  status: RequestStatus;
  createdAt: string;
};

const statusConfiguration: Record<
  RequestStatus,
  {
    label: string;
    variant:
      | "neutral"
      | "info"
      | "success"
      | "warning"
      | "danger";
  }
> = {
  waiting_payment: {
    label: "En attente de paiement",
    variant: "warning",
  },
  payment_review: {
    label: "Paiement à vérifier",
    variant: "warning",
  },
  payment_confirmed: {
    label: "Paiement confirmé",
    variant: "success",
  },
  policy_preparation: {
    label: "Police en préparation",
    variant: "info",
  },
  policy_available: {
    label: "Assurance disponible",
    variant: "success",
  },
  payment_rejected: {
    label: "Paiement refusé",
    variant: "danger",
  },
  cancelled: {
    label: "Dossier annulé",
    variant: "neutral",
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
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Europe/Istanbul",
    },
  ).format(date);
}

function getInitials(
  name: string,
) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase(),
    )
    .join("");
}

export default function RecentRequestsTable({
  requests = [],
}: {
  requests?: RecentRequest[];
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white sm:rounded-[1.5rem]">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
            Activité
          </p>

          <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:mt-2 sm:text-xl">
            Dossiers récents
          </h2>
        </div>

        <Link
          href="/admin/dossiers"
          className="inline-flex w-fit items-center gap-1.5 text-[12px] font-semibold text-[#0B5D3B] sm:gap-2 sm:text-sm"
        >
          Voir tous les dossiers

          <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="px-4 py-9 text-center sm:px-6 sm:py-12">
          <p className="text-[13px] font-semibold text-slate-700 sm:text-base">
            Aucun dossier récent
          </p>

          <p className="mt-1.5 text-[11px] leading-5 text-slate-400 sm:mt-2 sm:text-sm">
            Les nouvelles demandes apparaîtront ici.
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE / TABLETTE */}

          <div className="divide-y divide-slate-100 lg:hidden">
            {requests.map(
              (request) => {
                const status =
                  statusConfiguration[
                    request.status
                  ];

                return (
                  <article
                    key={
                      request.id
                    }
                    className="p-4 sm:p-5"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF6EC] text-[11px] font-black text-[#0B5D3B] sm:h-11 sm:w-11 sm:text-xs">
                        {getInitials(
                          request.clientName,
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-slate-800 sm:text-sm">
                          {
                            request.clientName
                          }
                        </p>

                        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400 sm:text-xs">
                          {
                            request.requestCode
                          }
                        </p>
                      </div>

                      <div className="shrink-0">
                        <Badge
                          variant={
                            status.variant
                          }
                          dot
                        >
                          {
                            status.label
                          }
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Durée
                        </p>

                        <p className="mt-1 text-[12px] font-semibold text-slate-700 sm:text-[13px]">
                          {
                            request.durationYears
                          }{" "}
                          an
                          {request.durationYears ===
                          2
                            ? "s"
                            : ""}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Montant
                        </p>

                        <p className="mt-1 break-words text-[12px] font-semibold text-slate-700 sm:text-[13px]">
                          {request.amount.toLocaleString(
                            "fr-FR",
                          )}{" "}
                          TL
                        </p>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Date
                        </p>

                        <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-slate-500 sm:text-xs">
                          <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-300" />

                          {formatDate(
                            request.createdAt,
                          )}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/admin/dossiers/${request.id}`}
                      className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 transition hover:border-[#CFE3CF] hover:bg-[#F3F8F2] hover:text-[#0B5D3B] sm:min-h-11 sm:text-sm"
                    >
                      Ouvrir le dossier
                    </Link>
                  </article>
                );
              },
            )}
          </div>

          {/* ORDINATEUR */}

          <div className="hidden lg:block">
            <TableContainer className="rounded-none border-0 shadow-none">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Client
                    </TableHead>

                    <TableHead>
                      Code
                    </TableHead>

                    <TableHead>
                      Durée
                    </TableHead>

                    <TableHead>
                      Montant
                    </TableHead>

                    <TableHead>
                      Statut
                    </TableHead>

                    <TableHead>
                      Date
                    </TableHead>

                    <TableHead className="text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {requests.map(
                    (
                      request,
                    ) => {
                      const status =
                        statusConfiguration[
                          request
                            .status
                        ];

                      return (
                        <TableRow
                          key={
                            request.id
                          }
                        >
                          <TableCell>
                            <div className="flex min-w-[190px] items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF6EC] text-xs font-black text-[#0B5D3B]">
                                {getInitials(
                                  request.clientName,
                                )}
                              </div>

                              <p className="truncate font-semibold text-slate-800">
                                {
                                  request.clientName
                                }
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className="whitespace-nowrap font-semibold text-slate-800">
                            {
                              request.requestCode
                            }
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {
                              request.durationYears
                            }{" "}
                            an
                            {request.durationYears ===
                            2
                              ? "s"
                              : ""}
                          </TableCell>

                          <TableCell className="whitespace-nowrap font-semibold text-slate-800">
                            {request.amount.toLocaleString(
                              "fr-FR",
                            )}{" "}
                            TL
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            <Badge
                              variant={
                                status.variant
                              }
                              dot
                            >
                              {
                                status.label
                              }
                            </Badge>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-2 text-slate-500">
                              <Clock3 className="h-4 w-4 text-slate-300" />

                              {formatDate(
                                request.createdAt,
                              )}
                            </span>
                          </TableCell>

                          <TableCell className="text-right">
                            <Link
                              href={`/admin/dossiers/${request.id}`}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-[#CFE3CF] hover:bg-[#F3F8F2] hover:text-[#0B5D3B]"
                            >
                              Ouvrir
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    },
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </>
      )}
    </section>
  );
}