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

type SearchParams = Promise<{
  status?: string;
  q?: string;
}>;

type ClientRelation =
  | {
      first_name: string;
      last_name: string;
      whatsapp_country_code: string | null;
      whatsapp_number: string | null;
    }
  | Array<{
      first_name: string;
      last_name: string;
      whatsapp_country_code: string | null;
      whatsapp_number: string | null;
    }>
  | null;

type PaymentRelation =
  | {
      status: string | null;
      expected_amount: number | string | null;
      submitted_at: string | null;
      verified_at: string | null;
      rejection_reason: string | null;
    }
  | Array<{
      status: string | null;
      expected_amount: number | string | null;
      submitted_at: string | null;
      verified_at: string | null;
      rejection_reason: string | null;
    }>
  | null;

type RequestRow = {
  id: string;
  request_code: string;
  status: string;
  assigned_agent_id: string | null;
  calculated_price: number | string | null;
  created_at: string;

  client: ClientRelation;
  payment: PaymentRelation;
};

type PaymentView = {
  requestId: string;
  requestCode: string;

  requestStatus: string;

  clientName: string;
  whatsapp: string;

  paymentStatus: string;

  amount: number;

  submittedAt: string | null;
  verifiedAt: string | null;

  rejectionReason: string | null;

  assignedAgentId: string | null;
};

const paymentStatusConfiguration: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "En attente",
    className:
      "bg-slate-100 text-slate-700",
  },

  submitted: {
    label: "À vérifier",
    className:
      "bg-orange-100 text-orange-800",
  },

  review: {
    label: "À vérifier",
    className:
      "bg-orange-100 text-orange-800",
  },

  confirmed: {
    label: "Confirmé",
    className:
      "bg-green-100 text-green-800",
  },

  rejected: {
    label: "Refusé",
    className:
      "bg-red-100 text-red-800",
  },
};

function unwrapClient(
  relation: ClientRelation,
) {
  if (
    Array.isArray(
      relation,
    )
  ) {
    return (
      relation[0] ??
      null
    );
  }

  return relation;
}

function unwrapPayment(
  relation: PaymentRelation,
) {
  if (
    Array.isArray(
      relation,
    )
  ) {
    return (
      relation[0] ??
      null
    );
  }

  return relation;
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

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
        "short",

      timeStyle:
        "short",

      timeZone:
        "Europe/Istanbul",
    },
  ).format(date);
}

function formatAmount(
  amount: number,
) {
  return `${amount.toLocaleString(
    "fr-FR",
    {
      maximumFractionDigits:
        2,
    },
  )} TL`;
}

function normalize(
  value:
    | string
    | null
    | undefined,
) {
  return (
    value ??
    ""
  )
    .trim()
    .toLocaleLowerCase(
      "fr-FR",
    );
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams:
    SearchParams;
}) {
  const {
    user,
    role,
  } =
    await requireRole([
      "admin",
      "agent",
    ]);

  const params =
    await searchParams;

  const statusFilter =
    params.status?.trim() ??
    "";

  const search =
    params.q?.trim() ??
    "";

  const serviceClient =
    createServiceClient();

  let query =
    serviceClient
      .from(
        "insurance_requests",
      )
      .select(
        `
          id,
          request_code,
          status,
          assigned_agent_id,
          calculated_price,
          created_at,

          client:clients (
            first_name,
            last_name,
            whatsapp_country_code,
            whatsapp_number
          ),

          payment:payments (
            status,
            expected_amount,
            submitted_at,
            verified_at,
            rejection_reason
          )
        `,
      )
      .in(
        "status",
        [
          "payment_review",
          "payment_confirmed",
          "payment_rejected",
        ],
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      );

  /*
   * Agent :
   * uniquement ses dossiers.
   *
   * Admin :
   * tous les paiements.
   */
  if (
    role ===
    "agent"
  ) {
    query =
      query.eq(
        "assigned_agent_id",
        user.id,
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    throw new Error(
      error.message,
    );
  }

  let payments:
    PaymentView[] =
    (
      (data ??
        []) as unknown as RequestRow[]
    )
      .map(
        (
          request,
        ) => {
          const client =
            unwrapClient(
              request.client,
            );

          const payment =
            unwrapPayment(
              request.payment,
            );

          if (!payment) {
            return null;
          }

          const clientName =
            client
              ? `${client.first_name} ${client.last_name}`.trim()
              : "Client inconnu";

          const whatsapp =
            client
              ? `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`.trim()
              : "";

          return {
            requestId:
              request.id,

            requestCode:
              request.request_code,

            requestStatus:
              request.status,

            clientName,

            whatsapp,

            paymentStatus:
              payment.status ??
              "",

            amount:
              Number(
                payment.expected_amount ??
                  request.calculated_price ??
                  0,
              ),

            submittedAt:
              payment.submitted_at,

            verifiedAt:
              payment.verified_at,

            rejectionReason:
              payment.rejection_reason,

            assignedAgentId:
              request.assigned_agent_id,
          };
        },
      )
      .filter(
        (
          value,
        ): value is PaymentView =>
          value !==
          null,
      );

  /*
   * Filtre par état du dossier.
   */
  if (
    statusFilter ===
    "review"
  ) {
    payments =
      payments.filter(
        (
          payment,
        ) =>
          payment.requestStatus ===
          "payment_review",
      );
  }

  if (
    statusFilter ===
    "confirmed"
  ) {
    payments =
      payments.filter(
        (
          payment,
        ) =>
          payment.requestStatus ===
          "payment_confirmed",
      );
  }

  if (
    statusFilter ===
    "rejected"
  ) {
    payments =
      payments.filter(
        (
          payment,
        ) =>
          payment.requestStatus ===
          "payment_rejected",
      );
  }

  /*
   * Recherche.
   */
  if (search) {
    const normalizedSearch =
      normalize(
        search,
      );

    payments =
      payments.filter(
        (
          payment,
        ) =>
          normalize(
            payment.clientName,
          ).includes(
            normalizedSearch,
          ) ||
          normalize(
            payment.requestCode,
          ).includes(
            normalizedSearch,
          ) ||
          normalize(
            payment.whatsapp,
          ).includes(
            normalizedSearch,
          ),
      );
  }

  const reviewCount =
    payments.filter(
      (
        payment,
      ) =>
        payment.requestStatus ===
        "payment_review",
    ).length;

  const confirmedCount =
    payments.filter(
      (
        payment,
      ) =>
        payment.requestStatus ===
        "payment_confirmed",
    ).length;

  const rejectedCount =
    payments.filter(
      (
        payment,
      ) =>
        payment.requestStatus ===
        "payment_rejected",
    ).length;

  const totalAmount =
    payments.reduce(
      (
        total,
        payment,
      ) =>
        total +
        payment.amount,
      0,
    );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        {/* HEADER */}

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
                Finance
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Paiements
              </h1>

              <p className="mt-2 max-w-3xl text-slate-600">
                Consultez et traitez les paiements associés aux demandes d’assurance.
              </p>
            </div>

            <Link
              href="/admin/tableau-de-bord"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← Tableau de bord
            </Link>
          </div>
        </header>

        {/* KPI */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="À vérifier"
            value={
              reviewCount.toLocaleString(
                "fr-FR",
              )
            }
            description="Dekonts à contrôler"
            className="bg-orange-50 text-orange-700"
          />

          <StatCard
            label="Confirmés"
            value={
              confirmedCount.toLocaleString(
                "fr-FR",
              )
            }
            description="Paiements validés"
            className="bg-green-50 text-green-700"
          />

          <StatCard
            label="Refusés"
            value={
              rejectedCount.toLocaleString(
                "fr-FR",
              )
            }
            description="Paiements rejetés"
            className="bg-red-50 text-red-700"
          />

          <StatCard
            label="Montant"
            value={
              formatAmount(
                totalAmount,
              )
            }
            description="Valeur des paiements affichés"
            className="bg-violet-50 text-violet-700"
          />
        </section>

        {/* FILTRES */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form
            method="GET"
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_auto_auto]"
          >
            <input
              type="search"
              name="q"
              defaultValue={
                search
              }
              placeholder="Client, code dossier ou WhatsApp..."
              className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10"
            />

            <select
              name="status"
              defaultValue={
                statusFilter
              }
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none"
            >
              <option value="">
                Tous les paiements
              </option>

              <option value="review">
                À vérifier
              </option>

              <option value="confirmed">
                Confirmés
              </option>

              <option value="rejected">
                Refusés
              </option>
            </select>

            <button
              type="submit"
              className="min-h-11 rounded-xl bg-[#2F2963] px-5 text-sm font-semibold text-white hover:bg-[#24204F]"
            >
              Filtrer
            </button>

            <Link
              href="/admin/paiements"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Réinitialiser
            </Link>
          </form>
        </section>

        {/* TABLE */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Liste des paiements
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {payments.length.toLocaleString(
                "fr-FR",
              )}{" "}
              paiement
              {payments.length !==
              1
                ? "s"
                : ""}
            </p>
          </div>

          {payments.length ===
          0 ? (
            <div className="p-12 text-center">
              <p className="font-semibold text-slate-700">
                Aucun paiement trouvé
              </p>
            </div>
          ) : (
            <TableContainer className="rounded-none border-0 shadow-none">
              <Table className="min-w-[1300px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Client
                    </TableHead>

                    <TableHead>
                      Dossier
                    </TableHead>

                    <TableHead>
                      WhatsApp
                    </TableHead>

                    <TableHead>
                      Montant
                    </TableHead>

                    <TableHead>
                      Statut
                    </TableHead>

                    <TableHead>
                      Soumis le
                    </TableHead>

                    <TableHead>
                      Vérifié le
                    </TableHead>

                    <TableHead>
                      Motif
                    </TableHead>

                    <TableHead className="text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {payments.map(
                    (
                      payment,
                    ) => {
                      const paymentStatus =
                        paymentStatusConfiguration[
                          payment.paymentStatus
                        ] ??
                        paymentStatusConfiguration[
                          payment.requestStatus ===
                          "payment_confirmed"
                            ? "confirmed"
                            : payment.requestStatus ===
                                "payment_rejected"
                              ? "rejected"
                              : "review"
                        ];

                      return (
                        <TableRow
                          key={
                            payment.requestId
                          }
                        >
                          <TableCell>
                            <div className="min-w-[180px]">
                              <p className="font-semibold text-slate-900">
                                {
                                  payment.clientName
                                }
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            <Link
                              href={`/admin/dossiers/${payment.requestId}`}
                              className="font-semibold text-[#2F2963] hover:underline"
                            >
                              {
                                payment.requestCode
                              }
                            </Link>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {payment.whatsapp ? (
                              <a
                                href={`https://wa.me/${payment.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-green-700 hover:underline"
                              >
                                {
                                  payment.whatsapp
                                }
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap font-semibold text-slate-900">
                            {formatAmount(
                              payment.amount,
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${paymentStatus.className}`}
                            >
                              {
                                paymentStatus.label
                              }
                            </span>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatDate(
                              payment.submittedAt,
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatDate(
                              payment.verifiedAt,
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="max-w-[260px] whitespace-normal text-sm text-slate-600">
                              {payment.rejectionReason ??
                                "—"}
                            </div>
                          </TableCell>

                          <TableCell className="whitespace-nowrap text-right">
                            <Link
                              href={`/admin/dossiers/${payment.requestId}`}
                              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#2F2963] px-4 text-sm font-semibold text-white transition hover:bg-[#24204F]"
                            >
                              {payment.requestStatus ===
                              "payment_review"
                                ? "Vérifier"
                                : "Ouvrir"}
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
      </div>
    </main>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  description: string;
  className: string;
};

function StatCard({
  label,
  value,
  description,
  className,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span
        className={`inline-flex rounded-xl px-3 py-1 text-xs font-semibold ${className}`}
      >
        {
          label
        }
      </span>

      <p className="mt-4 text-2xl font-bold text-slate-900">
        {
          value
        }
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {
          description
        }
      </p>
    </div>
  );
}