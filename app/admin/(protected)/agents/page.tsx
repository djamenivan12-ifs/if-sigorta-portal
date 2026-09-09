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
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-[1500px]">
        <header className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.75rem] sm:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
                Administration
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-3 sm:text-3xl lg:text-4xl">
                Gestion des agents
              </h1>

              <p className="mt-2 text-[13px] leading-6 text-slate-500 sm:mt-3 sm:text-sm sm:leading-7">
                Gérez les comptes agents et administrateurs du portail.
              </p>
            </div>

            <Link
              href="/admin/agents/nouveau"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#B8E83D] px-4 text-[13px] font-black text-[#15311F] transition hover:bg-[#C7F34E] sm:min-h-11 sm:w-auto sm:px-5 sm:text-sm"
            >
              + Ajouter un agent
            </Link>
          </div>
        </header>

        <section className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white sm:mt-6 sm:rounded-[1.5rem]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
                  Utilisateurs internes
                </h2>

                <p className="mt-1 text-[12px] text-slate-500 sm:text-sm">
                  {agents.length} compte
                  {agents.length >
                  1
                    ? "s"
                    : ""}
                </p>
              </div>

              <Link
                href="/admin/agents/performance"
                className="w-fit text-[12px] font-semibold text-[#0B5D3B] transition hover:text-[#084A2F] sm:text-sm"
              >
                Voir les performances →
              </Link>
            </div>
          </div>

          {agents.length ===
          0 ? (
            <div className="px-4 py-10 text-center sm:px-6 sm:py-16">
              <p className="text-[13px] text-slate-500 sm:text-sm">
                Aucun agent enregistré.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 lg:hidden">
                {agents.map(
                  (
                    agent,
                  ) => (
                    <article
                      key={
                        agent.id
                      }
                      className="min-w-0 p-4 sm:p-5"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-[15px] font-bold leading-5 text-[#102B20] sm:text-base">
                            {getDisplayName(
                              agent,
                            )}
                          </p>

                          <p className="mt-1 break-all text-[12px] leading-5 text-slate-500 sm:text-sm">
                            {
                              agent.email
                            }
                          </p>
                        </div>

                        <span
                          className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${
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
                      </div>

                      <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Créé le
                          </dt>

                          <dd className="mt-1 break-words text-[12px] font-semibold leading-5 text-slate-700 sm:text-sm">
                            {formatDate(
                              agent.createdAt,
                            )}
                          </dd>
                        </div>

                        <div className="min-w-0">
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Dernière connexion
                          </dt>

                          <dd className="mt-1 break-words text-[12px] font-semibold leading-5 text-slate-700 sm:text-sm">
                            {formatDate(
                              agent.lastSignInAt,
                            )}
                          </dd>
                        </div>
                      </dl>

                      <Link
                        href={`/admin/agents/${agent.id}`}
                        className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#CFE3CF] bg-white px-4 text-[12px] font-semibold text-[#0B5D3B] transition hover:bg-[#F3F8F2] sm:text-sm"
                      >
                        Modifier
                      </Link>
                    </article>
                  ),
                )}
              </div>

              <div className="hidden lg:block">
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
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
