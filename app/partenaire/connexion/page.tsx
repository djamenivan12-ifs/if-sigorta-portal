"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  Eye,
  EyeOff,
  Handshake,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/client";

function getUrlError(
  error: string | null,
) {
  switch (error) {
    case "inactive":
      return "Votre compte partenaire est actuellement désactivé. Contactez IF Sigorta.";

    case "unauthorized":
      return "Ce compte n’est pas autorisé à accéder à l’espace partenaire.";

    case "account":
      return "Aucun compte partenaire valide n’est associé à cet utilisateur.";

    default:
      return "";
  }
}

export default function ConnexionPartenairePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F6F8F5]">
          <p className="text-sm font-semibold text-slate-500">
            Chargement...
          </p>
        </main>
      }
    >
      <ConnexionPartenaireContent />
    </Suspense>
  );
}

function ConnexionPartenaireContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    const urlError =
      getUrlError(
        searchParams.get(
          "error",
        ),
      );

    if (urlError) {
      setErrorMessage(
        urlError,
      );

      const supabase =
        createClient();

      void supabase.auth.signOut();
    }
  }, [searchParams]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase =
        createClient();

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email:
            email
              .trim()
              .toLowerCase(),

          password,
        });

      if (
        error ||
        !data.user
      ) {
        throw new Error(
          "Adresse e-mail ou mot de passe incorrect.",
        );
      }

      const role =
        data.user.app_metadata
          ?.role;

      if (
        role !== "partner"
      ) {
        await supabase.auth.signOut();

        setErrorMessage(
          "Ce compte n’est pas autorisé à accéder à l’espace partenaire.",
        );

        return;
      }

      router.push(
        "/partenaire/tableau-de-bord",
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "La connexion a échoué.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F8F5]">
      <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[#123F2C] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#B8E83D]/10" />

          <div className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full bg-white/5" />

          <div className="relative z-10">
            <Link
              href="/"
              aria-label="IF Sigorta"
              className="inline-flex items-center"
            >
              <img
                src="/if-sigorta-logo.png"
                alt="IF Sigorta"
                className="h-[110px] w-auto object-contain object-left"
              />
            </Link>
          </div>

          <div className="relative z-10 max-w-md">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B8E83D] text-[#15311F]">
              <Handshake className="h-6 w-6" />
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.04] tracking-[-0.04em] xl:text-5xl">
              Votre espace partenaire IF Sigorta.
            </h1>

            <p className="mt-5 text-base leading-8 text-white/65">
              Gérez les demandes d’assurance de vos
              clients depuis un espace sécurisé qui
              vous est entièrement dédié.
            </p>

            <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
              <FeatureLine>
                Créez les dossiers de vos clients
              </FeatureLine>

              <FeatureLine>
                Suivez le traitement de chaque demande
              </FeatureLine>

              <FeatureLine>
                Téléchargez les assurances disponibles
              </FeatureLine>
            </div>
          </div>

          <div className="relative z-10 text-xs text-white/35">
            IF Sigorta • Espace partenaire sécurisé
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center lg:hidden">
              <Link
                href="/"
                aria-label="IF Sigorta"
              >
                <img
                  src="/if-sigorta-logo.png"
                  alt="IF Sigorta"
                  className="h-[105px] w-auto object-contain"
                />
              </Link>
            </div>

            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.3)] sm:p-8 lg:p-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#F3F8F2] px-3 py-1.5 text-xs font-bold text-[#0B5D3B]">
                  <ShieldCheck className="h-4 w-4" />

                  Espace sécurisé
                </div>

                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-4xl">
                  Connexion partenaire
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-500">
                  Connectez-vous avec les identifiants
                  fournis par IF Sigorta.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Adresse e-mail
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(
                          event.target.value,
                        );

                        setErrorMessage("");
                      }}
                      autoComplete="email"
                      placeholder="partenaire@exemple.com"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Mot de passe
                  </label>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) => {
                        setPassword(
                          event.target.value,
                        );

                        setErrorMessage("");
                      }}
                      autoComplete="current-password"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-[15px] text-slate-900 outline-none transition hover:border-slate-300 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) =>
                            !current,
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-6 text-red-700">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0B5D3B] px-5 text-sm font-black text-white shadow-lg shadow-[#0B5D3B]/10 transition hover:-translate-y-0.5 hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {loading
                    ? "Connexion en cours..."
                    : "Se connecter"}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-100 pt-6 text-center">
                <Link
                  href="/"
                  className="text-sm font-semibold text-slate-500 transition hover:text-[#0B5D3B]"
                >
                  ← Retour à l’accueil
                </Link>
              </div>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-slate-400">
              L’accès est réservé aux partenaires
              autorisés par IF Sigorta.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureLine({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#B8E83D]">
        ✓
      </div>

      <p className="text-sm leading-6 text-white/70">
        {children}
      </p>
    </div>
  );
}