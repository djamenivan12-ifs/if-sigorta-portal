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

type RecentRequestsTableProps = {
  requests?: RecentRequest[];
};

const defaultRequests: RecentRequest[] = [
  {
    id: "1",
    requestCode: "IFS-260806-WIC7",
    clientName: "WANDJI IVAN",
    durationYears: 2,
    amount: 3200,
    status: "payment_review",
    createdAt: "2026-08-06T10:42:00",
  },
  {
    id: "2",
    requestCode: "IFS-260806-NK28",
    clientName: "NGONO KARINE",
    durationYears: 1,
    amount: 1850,
    status: "policy_preparation",
    createdAt: "2026-08-06T09:58:00",
  },
  {
    id: "3",
    requestCode: "IFS-260806-AB91",
    clientName: "ABDOUL BILAL",
    durationYears: 1,
    amount: 2100,
    status: "policy_available",
    createdAt: "2026-08-05T17:15:00",
  },
];

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

function formatAmount(
  amount: number,
) {
  return `${amount.toLocaleString(
    "fr-FR",
  )} TL`;
}

function formatDate(
  value: string,
) {
  const date =
    new Date(
      value,
    );

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
      timeZone: "Europe/Istanbul",
    },
  ).format(
    date,
  );
}

function getInitials(
  name: string,
) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (
        part,
      ) =>
        part
          .charAt(0)
          .toUpperCase(),
    )
    .join("");
}

export default function RecentRequestsTable({
  requests = defaultRequests,
}: RecentRequestsTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Activité
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Dossiers récents
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Les dernières demandes enregistrées.
          </p>
        </div>

        <Link
          href="/admin/dossiers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800"
        >
          Voir tous les dossiers

          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {requests.length ===
      0 ? (
        <div className="px-6 py-12 text-center">
          <p className="font-semibold text-slate-800">
            Aucun dossier récent
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Les nouvelles demandes apparaîtront ici.
          </p>
        </div>
      ) : (
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
                      request.status
                    ];

                  return (
                    <TableRow
                      key={
                        request.id
                      }
                    >
                      <TableCell>
                        <div className="flex min-w-[190px] items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            {getInitials(
                              request.clientName,
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {
                                request.clientName
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Client assuré
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap font-semibold text-slate-900">
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

                      <TableCell className="whitespace-nowrap font-semibold text-slate-900">
                        {formatAmount(
                          request.amount,
                        )}
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
                        <span className="inline-flex items-center gap-2 text-slate-600">
                          <Clock3 className="h-4 w-4 text-slate-400" />

                          {formatDate(
                            request.createdAt,
                          )}
                        </span>
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-right">
                        <Link
                          href={`/admin/dossiers/${request.id}`}
                          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
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
      )}
    </section>
  );
}