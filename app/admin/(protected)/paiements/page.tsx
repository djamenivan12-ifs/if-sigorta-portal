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
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-[1500px]">
        {/* HEADER */}

        <header className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.75rem] sm:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
                Finance
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-3 sm:text-3xl lg:text-4xl">
                Paiements
              </h1>

              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500 sm:mt-3 sm:text-sm sm:leading-7 lg:text-base">
                Consultez et traitez les paiements associés aux demandes d’assurance.
              </p>
            </div>

            <Link
              href="/admin/dashboard"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-11 sm:w-auto sm:px-5 sm:text-sm"
            >
              ← Tableau de bord
            </Link>
          </div>
        </header>

        {/* KPI */}

        <section className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:mt-6 sm:gap-4 xl:grid-cols-4">
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
            className="bg-[#EEF6EC] text-[#0B5D3B]"
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
            className="bg-[#F3F8F2] text-[#31513B]"
          />
        </section>

        {/* FILTRES */}

        <section className="mt-4 min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:mt-6 sm:rounded-[1.5rem] sm:p-5">
          <form
            method="GET"
            className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_240px_auto_auto]"
          >
            <input
              type="search"
              name="q"
              defaultValue={
                search
              }
              placeholder="Client, code dossier ou WhatsApp..."
              className="min-h-10 min-w-0 w-full rounded-xl border border-slate-300 px-3 text-[13px] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:min-h-11 sm:px-4 sm:text-sm"
            />

            <select
              name="status"
              defaultValue={
                statusFilter
              }
              className="min-h-10 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10 sm:min-h-11 sm:px-4 sm:text-sm"
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
              className="min-h-10 w-full rounded-xl bg-[#0B5D3B] px-4 text-[13px] font-black text-white transition hover:bg-[#084A2F] sm:min-h-11 sm:px-5 sm:text-sm"
            >
              Filtrer
            </button>

            <Link
              href="/admin/paiements"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-11 sm:w-auto sm:px-5 sm:text-sm"
            >
              Réinitialiser
            </Link>
          </form>
        </section>

        {/* TABLE */}

        <section className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white sm:mt-6 sm:rounded-[1.5rem]">
          <div className="border-b border-slate-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
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
            <div className="px-4 py-10 text-center sm:p-12">
              <p className="font-semibold text-slate-700">
                Aucun paiement trouvé
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 lg:hidden">
                {payments.map((payment) => {
                  const paymentStatus =
                    paymentStatusConfiguration[payment.paymentStatus] ??
                    paymentStatusConfiguration[
                      payment.requestStatus === "payment_confirmed"
                        ? "confirmed"
                        : payment.requestStatus === "payment_rejected"
                          ? "rejected"
                          : "review"
                    ];

                  return (
                    <article
                      key={payment.requestId}
                      className="min-w-0 p-4 sm:p-5"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-[15px] font-bold leading-5 text-[#102B20] sm:text-base">
                            {payment.clientName}
                          </p>

                          <Link
                            href={`/admin/dossiers/${payment.requestId}`}
                            className="mt-1 inline-block break-all text-[12px] font-bold text-[#0B5D3B] transition hover:text-[#084A2F] sm:text-sm"
                          >
                            {payment.requestCode}
                          </Link>
                        </div>

                        <span
                          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${paymentStatus.className}`}
                        >
                          {paymentStatus.label}
                        </span>
                      </div>

                      <dl className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:gap-4">
                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Montant
                          </dt>
                          <dd className="mt-1 break-words text-[13px] font-bold text-slate-800 sm:text-sm">
                            {formatAmount(payment.amount)}
                          </dd>
                        </div>

                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            WhatsApp
                          </dt>
                          <dd className="mt-1 min-w-0 text-[12px] font-semibold sm:text-sm">
                            {payment.whatsapp ? (
                              <a
                                href={`https://wa.me/${payment.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="break-all text-[#0B5D3B] transition hover:text-[#084A2F]"
                              >
                                {payment.whatsapp}
                              </a>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </dd>
                        </div>

                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Soumis le
                          </dt>
                          <dd className="mt-1 break-words text-[12px] font-semibold leading-5 text-slate-700 sm:text-sm">
                            {formatDate(payment.submittedAt)}
                          </dd>
                        </div>

                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Vérifié le
                          </dt>
                          <dd className="mt-1 break-words text-[12px] font-semibold leading-5 text-slate-700 sm:text-sm">
                            {formatDate(payment.verifiedAt)}
                          </dd>
                        </div>
                      </dl>

                      {payment.rejectionReason && (
                        <div className="mt-4 min-w-0 rounded-xl bg-red-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-red-500">
                            Motif du refus
                          </p>
                          <p className="mt-1 break-words text-[12px] leading-5 text-red-700 sm:text-sm">
                            {payment.rejectionReason}
                          </p>
                        </div>
                      )}

                      <Link
                        href={`/admin/dossiers/${payment.requestId}`}
                        className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#0B5D3B] px-4 text-[12px] font-black text-white transition hover:bg-[#084A2F] sm:min-h-11 sm:text-sm"
                      >
                        {payment.requestStatus === "payment_review"
                          ? "Vérifier"
                          : "Ouvrir"}
                      </Link>
                    </article>
                  );
                })}
              </div>

              <div className="hidden lg:block">
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
                              className="font-semibold text-[#0B5D3B] transition hover:text-[#084A2F]"
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
                                className="font-medium text-[#0B5D3B] transition hover:text-[#084A2F]"
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
                              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0B5D3B] px-4 text-sm font-black text-white transition hover:bg-[#084A2F]"
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
              </div>
            </>
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
    <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 sm:rounded-[1.5rem] sm:p-5">
      <span
        className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${className}`}
      >
        {
          label
        }
      </span>

      <p className="mt-3 break-words text-xl font-semibold tracking-[-0.03em] text-[#102B20] sm:mt-4 sm:text-2xl">
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