import { requireRole } from "@/lib/auth/requireRole";
import PageFrame from "@/components/admin/pages/PageFrame";
import { Mail, UserRound } from "lucide-react";

export default async function ProfilePage() {
  const { user, role } = await requireRole(["admin", "agent"]);
  return (
    <PageFrame section="Mon profil" href="/admin/profil">
      <div className="mx-auto max-w-4xl">
        <header data-admin-page-heading="plain">
          <h1 className="text-2xl font-bold text-brand-navy">Mon profil</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Les informations de votre compte IF Sigorta.
          </p>
        </header>
        <section
          className="mt-6 rounded-xl border border-brand-border bg-white p-5 sm:p-6"
          aria-label="Informations du compte"
        >
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-ice text-brand-navy">
              <UserRound size={24} aria-hidden="true" />
            </span>
            <h2 className="text-lg font-bold">Votre compte</h2>
          </div>
          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="flex items-center gap-2 text-xs font-medium text-brand-muted">
                <Mail size={15} aria-hidden="true" /> Adresse e-mail
              </dt>
              <dd className="mt-2 break-all text-sm font-semibold">
                {user.email ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-brand-muted">Rôle</dt>
              <dd className="mt-2 inline-flex rounded-md bg-brand-ice px-3 py-1.5 text-xs font-semibold">
                {role === "admin" ? "Administrateur" : "Agent"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </PageFrame>
  );
}
