import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  q?: string;
  status?: string;
}>;

type RequestRow = {
  id: string;
  request_code: string;
  status: string;
  calculated_price: number;
  insurance_duration_years: number;
  created_at: string;
  client: {
    first_name: string;
    last_name: string;
    nationality: string;
    whatsapp_country_code: string;
    whatsapp_number: string;
  } | null;
};

const statusOptions = [
  { value: "", label: "Tous les statuts" },
  { value: "draft", label: "Brouillon" },
  {
    value: "waiting_payment",
    label: "Paiement attendu",
  },
  {
    value: "payment_review",
    label: "Paiement à vérifier",
  },
  {
    value: "payment_confirmed",
    label: "Paiement confirmé",
  },
  {
    value: "policy_preparation",
    label: "Assurance en préparation",
  },
  {
    value: "policy_available",
    label: "Assurance disponible",
  },
  {
    value: "payment_rejected",
    label: "Paiement refusé",
  },
  {
    value: "cancelled",
    label: "Dossier annulé",
  },
];

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

async function getRequests({
  search,
  status,
}: {
  search: string;
  status: string;
}) {
  const supabase = createAdminClient();

  let query = supabase
    .from("insurance_requests")
    .select(
      `
        id,
        request_code,
        status,
        calculated_price,
        insurance_duration_years,
        created_at,
        client:clients (
          first_name,
          last_name,
          nationality,
          whatsapp_country_code,
          whatsapp_number
        )
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as RequestRow[];

  if (!search) {
    return rows;
  }

  const normalizedSearch = search
    .trim()
    .toLocaleLowerCase("fr-FR");

  return rows.filter((request) => {
    const fullName = request.client
      ? `${request.client.first_name} ${request.client.last_name}`
      : "";

    return (
      request.request_code
        .toLocaleLowerCase("fr-FR")
        .includes(normalizedSearch) ||
      fullName
        .toLocaleLowerCase("fr-FR")
        .includes(normalizedSearch)
    );
  });
}

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sessionClient =
    await createServerSupabaseClient();

  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    redirect("/admin/connexion");
  }

  const params = await searchParams;

  const search = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "";

  let requests: RequestRow[] = [];
  let errorMessage = "";

  try {
    requests = await getRequests({
      search,
      status,
    });
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Les dossiers n’ont pas pu être chargés.";
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
                Tous les dossiers
              </h1>

              <p className="mt-2 text-slate-600">
                Recherchez, filtrez et ouvrez les demandes clients.
              </p>
            </div>

            <Link
              href="/admin/tableau-de-bord"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← Tableau de bord
            </Link>
          </div>
        </header>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <form
            method="GET"
            className="grid gap-4 lg:grid-cols-[1fr_260px_auto]"
          >
            <div>
              <label
                htmlFor="q"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Recherche
              </label>

              <input
                id="q"
                name="q"
                type="search"
                defaultValue={search}
                placeholder="Code, nom ou prénom"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Statut
              </label>

              <select
                id="status"
                name="status"
                defaultValue={status}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              >
                {statusOptions.map((option) => (
                  <option
                    key={option.value || "all"}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
              >
                Rechercher
              </button>

              <Link
                href="/admin/dossiers"
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Réinitialiser
              </Link>
            </div>
          </form>
        </section>

        {errorMessage && (
          <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Résultats
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {requests.length.toLocaleString("fr-FR")} dossier
              {requests.length > 1 ? "s" : ""}
            </p>
          </div>

          {requests.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              Aucun dossier ne correspond aux critères.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHeader>Code</TableHeader>
                    <TableHeader>Client</TableHeader>
                    <TableHeader>Nationalité</TableHeader>
                    <TableHeader>WhatsApp</TableHeader>
                    <TableHeader>Durée</TableHeader>
                    <TableHeader>Montant</TableHeader>
                    <TableHeader>Statut</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Action</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {requests.map((request) => {
                    const statusInformation =
                      statusLabels[request.status] ?? {
                        label: request.status,
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
                            {request.request_code}
                          </span>
                        </TableCell>

                        <TableCell>
                          {request.client
                            ? `${request.client.first_name} ${request.client.last_name}`
                            : "Client inconnu"}
                        </TableCell>

                        <TableCell>
                          {request.client?.nationality ?? "—"}
                        </TableCell>

                        <TableCell>
                          {request.client
                            ? `${request.client.whatsapp_country_code}${request.client.whatsapp_number}`
                            : "—"}
                        </TableCell>

                        <TableCell>
                          {request.insurance_duration_years} an
                          {request.insurance_duration_years === 2
                            ? "s"
                            : ""}
                        </TableCell>

                        <TableCell>
                          {Number(
                            request.calculated_price,
                          ).toLocaleString("fr-FR")}{" "}
                          TL
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusInformation.className}`}
                          >
                            {statusInformation.label}
                          </span>
                        </TableCell>

                        <TableCell>
                          {formatDate(request.created_at)}
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
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
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