import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type LatestRequest = {
  id: string;
  request_code: string;
  status: string;
  calculated_price: number;
  created_at: string;
  client: {
    first_name: string;
    last_name: string;
    nationality: string;
  } | null;
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
    className: "bg-slate-100 text-slate-700",
  },

  waiting_payment: {
    label: "Paiement attendu",
    className: "bg-amber-100 text-amber-800",
  },

  payment_review: {
    label: "Paiement à vérifier",
    className: "bg-orange-100 text-orange-800",
  },

  payment_confirmed: {
    label: "Paiement confirmé",
    className: "bg-green-100 text-green-800",
  },

  policy_preparation: {
    label: "Assurance en préparation",
    className: "bg-blue-100 text-blue-800",
  },

  policy_available: {
    label: "Assurance disponible",
    className: "bg-emerald-100 text-emerald-800",
  },

  payment_rejected: {
    label: "Paiement refusé",
    className: "bg-red-100 text-red-800",
  },

  cancelled: {
    label: "Dossier annulé",
    className: "bg-slate-200 text-slate-800",
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

async function getDashboardData() {
  const supabase = createAdminClient();

  const [
    totalResult,
    paymentReviewResult,
    policyPreparationResult,
    policyAvailableResult,
    latestRequestsResult,
  ] = await Promise.all([
    supabase
      .from("insurance_requests")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("insurance_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "payment_review"),

    supabase
      .from("insurance_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "policy_preparation"),

    supabase
      .from("insurance_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "policy_available"),

    supabase
      .from("insurance_requests")
      .select(
        `
          id,
          request_code,
          status,
          calculated_price,
          created_at,
          client:clients (
            first_name,
            last_name,
            nationality
          )
        `,
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(10),
  ]);

  const firstError =
    totalResult.error ||
    paymentReviewResult.error ||
    policyPreparationResult.error ||
    policyAvailableResult.error ||
    latestRequestsResult.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    total: totalResult.count ?? 0,

    paymentReview:
      paymentReviewResult.count ?? 0,

    policyPreparation:
      policyPreparationResult.count ?? 0,

    policyAvailable:
      policyAvailableResult.count ?? 0,

    latestRequests:
      (latestRequestsResult.data ??
        []) as unknown as LatestRequest[],
  };
}

export default async function TableauDeBordPage() {
  const sessionClient =
    await createServerSupabaseClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    redirect("/admin/connexion");
  }

  let dashboardData: Awaited<
    ReturnType<typeof getDashboardData>
  > | null = null;

  let errorMessage = "";

  try {
    dashboardData =
      await getDashboardData();
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Les données du tableau de bord n’ont pas pu être chargées.";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                IF Sigorta
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Tableau de bord agent
              </h1>

              <p className="mt-2 text-slate-600">
                Connecté avec {user.email}
              </p>
            </div>

            <Link
              href="/admin/dossiers"
              className="rounded-xl bg-blue-700 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-800"
            >
              Voir tous les dossiers
            </Link>
          </div>
        </header>

        {errorMessage && (
          <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {dashboardData && (
          <>
            <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardCard
                title="Total des demandes"
                value={dashboardData.total}
              />

              <DashboardCard
                title="Paiements à vérifier"
                value={
                  dashboardData.paymentReview
                }
              />

              <DashboardCard
                title="Assurances en préparation"
                value={
                  dashboardData.policyPreparation
                }
              />

              <DashboardCard
                title="Assurances disponibles"
                value={
                  dashboardData.policyAvailable
                }
              />
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Dernières demandes
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Les dix dossiers les plus récents.
                  </p>
                </div>

                <Link
                  href="/admin/dossiers"
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  Afficher la liste complète →
                </Link>
              </div>

              {dashboardData.latestRequests
                .length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  Aucun dossier enregistré.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <TableHeader>
                          Code
                        </TableHeader>

                        <TableHeader>
                          Client
                        </TableHeader>

                        <TableHeader>
                          Nationalité
                        </TableHeader>

                        <TableHeader>
                          Montant
                        </TableHeader>

                        <TableHeader>
                          Statut
                        </TableHeader>

                        <TableHeader>
                          Date
                        </TableHeader>

                        <TableHeader>
                          Action
                        </TableHeader>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {dashboardData.latestRequests.map(
                        (request) => {
                          const status =
                            statusLabels[
                              request.status
                            ] ?? {
                              label:
                                request.status,
                              className:
                                "bg-slate-100 text-slate-700",
                            };

                          return (
                            <tr
                              key={request.id}
                              className="hover:bg-slate-50"
                            >
                              <TableCell>
                                <span className="font-semibold text-slate-900">
                                  {
                                    request.request_code
                                  }
                                </span>
                              </TableCell>

                              <TableCell>
                                {request.client
                                  ? `${request.client.first_name} ${request.client.last_name}`
                                  : "Client inconnu"}
                              </TableCell>

                              <TableCell>
                                {request.client
                                  ?.nationality ??
                                  "—"}
                              </TableCell>

                              <TableCell>
                                {Number(
                                  request.calculated_price,
                                ).toLocaleString(
                                  "fr-FR",
                                )}{" "}
                                TL
                              </TableCell>

                              <TableCell>
                                <span
                                  className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                                >
                                  {
                                    status.label
                                  }
                                </span>
                              </TableCell>

                              <TableCell>
                                {formatDate(
                                  request.created_at,
                                )}
                              </TableCell>

                              <TableCell>
                                <Link
                                  href={`/admin/dossiers/${request.id}`}
                                  className="font-semibold text-blue-700 hover:underline"
                                >
                                  Ouvrir
                                </Link>
                              </TableCell>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

type DashboardCardProps = {
  title: string;
  value: number;
};

function DashboardCard({
  title,
  value,
}: DashboardCardProps) {
  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-4xl font-bold text-slate-900">
        {value.toLocaleString("fr-FR")}
      </p>
    </article>
  );
}

type TableContentProps = {
  children: React.ReactNode;
};

function TableHeader({
  children,
}: TableContentProps) {
  return (
    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function TableCell({
  children,
}: TableContentProps) {
  return (
    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
      {children}
    </td>
  );
}