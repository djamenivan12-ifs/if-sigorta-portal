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
  const date = new Date(value);

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
  ).format(date);
}

function getInitials(
  name: string,
) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join("");
}

export default function RecentRequestsTable({
  requests = [],
}: {
  requests?: RecentRequest[];
}) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
            Activité
          </p>

          <h2 className="mt-2 text-xl font-semibold text-[#102B20]">
            Dossiers récents
          </h2>
        </div>

        <Link
          href="/admin/dossiers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B5D3B]"
        >
          Voir tous les dossiers
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="font-semibold text-slate-700">
            Aucun dossier récent
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Les nouvelles demandes apparaîtront ici.
          </p>
        </div>
      ) : (
        <TableContainer className="rounded-none border-0 shadow-none">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {requests.map((request) => {
                const status =
                  statusConfiguration[
                    request.status
                  ];

                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex min-w-[190px] items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF6EC] text-xs font-black text-[#0B5D3B]">
                          {getInitials(
                            request.clientName,
                          )}
                        </div>

                        <p className="truncate font-semibold text-slate-800">
                          {request.clientName}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap font-semibold text-slate-800">
                      {request.requestCode}
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {request.durationYears} an
                      {request.durationYears === 2 ? "s" : ""}
                    </TableCell>

                    <TableCell className="whitespace-nowrap font-semibold text-slate-800">
                      {request.amount.toLocaleString("fr-FR")} TL
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      <Badge
                        variant={status.variant}
                        dot
                      >
                        {status.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-2 text-slate-500">
                        <Clock3 className="h-4 w-4 text-slate-300" />
                        {formatDate(request.createdAt)}
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
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </section>
  );
}