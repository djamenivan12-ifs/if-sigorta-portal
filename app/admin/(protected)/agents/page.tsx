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

type AgentRow = {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  createdAt: string | null;
  lastSignInAt: string | null;
};

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "Jamais";
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
        "medium",

      timeStyle:
        "short",

      timeZone:
        "Europe/Istanbul",
    },
  ).format(date);
}

function getDisplayName(
  agent: AgentRow,
) {
  const fullName =
    `${agent.firstName} ${agent.lastName}`.trim();

  return (
    fullName ||
    agent.email
  );
}

export default async function AgentsPage() {
  await requireRole([
    "admin",
  ]);

  const serviceClient =
    createServiceClient();

  const {
    data,
    error,
  } =
    await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const agents: AgentRow[] =
    data.users
      .filter(
        (
          user,
        ) => {
          const role =
            user.app_metadata
              ?.role;

          return (
            role ===
              "agent" ||
            role ===
              "admin"
          );
        },
      )
      .map(
        (
          user,
        ) => ({
          id:
            user.id,

          email:
            user.email ??
            "Email inconnu",

          role:
            user.app_metadata
              ?.role ??
            "agent",

          firstName:
            user.user_metadata
              ?.first_name
              ?.toString()
              .trim() ??
            "",

          lastName:
            user.user_metadata
              ?.last_name
              ?.toString()
              .trim() ??
            "",

          createdAt:
            user.created_at ??
            null,

          lastSignInAt:
            user.last_sign_in_at ??
            null,
        }),
      );

  return (
    <main className="min-h-screen bg-[#F6F8F5] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
                Administration
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-4xl">
                Gestion des agents
              </h1>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                Gérez les comptes agents et administrateurs du portail.
              </p>
            </div>

            <Link
              href="/admin/agents/nouveau"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#B8E83D] px-5 text-sm font-black text-[#15311F] transition hover:bg-[#C7F34E]"
            >
              + Ajouter un agent
            </Link>
          </div>
        </header>

        <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
                  Utilisateurs internes
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {agents.length} compte
                  {agents.length >
                  1
                    ? "s"
                    : ""}
                </p>
              </div>

              <Link
                href="/admin/agents/performance"
                className="text-sm font-semibold text-[#0B5D3B] transition hover:text-[#084A2F]"
              >
                Voir les performances →
              </Link>
            </div>
          </div>

          {agents.length ===
          0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-slate-500">
                Aucun agent enregistré.
              </p>
            </div>
          ) : (
            <TableContainer className="rounded-none border-0 shadow-none">
              <Table className="min-w-[1050px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Nom
                    </TableHead>

                    <TableHead>
                      Email
                    </TableHead>

                    <TableHead>
                      Rôle
                    </TableHead>

                    <TableHead>
                      Créé le
                    </TableHead>

                    <TableHead>
                      Dernière connexion
                    </TableHead>

                    <TableHead className="text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {agents.map(
                    (
                      agent,
                    ) => (
                      <TableRow
                        key={
                          agent.id
                        }
                      >
                        <TableCell className="whitespace-nowrap font-semibold text-[#102B20]">
                          {getDisplayName(
                            agent,
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-slate-600">
                          {
                            agent.email
                          }
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                              agent.role ===
                              "admin"
                                ? "border-[#CFE3CF] bg-[#F3F8F2] text-[#0B5D3B]"
                                : "border-[#DDE7D8] bg-[#EEF6EC] text-[#31513B]"
                            }`}
                          >
                            {agent.role ===
                            "admin"
                              ? "Administrateur"
                              : "Agent"}
                          </span>
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-slate-600">
                          {formatDate(
                            agent.createdAt,
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-slate-600">
                          {formatDate(
                            agent.lastSignInAt,
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-right">
                          <Link
                            href={`/admin/agents/${agent.id}`}
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#CFE3CF] bg-white px-4 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#F3F8F2]"
                          >
                            Modifier
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