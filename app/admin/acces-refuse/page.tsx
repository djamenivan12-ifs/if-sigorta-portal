import Link from "next/link";
export default function AccessDeniedPage() {
    return <main className="mx-auto max-w-lg px-6 py-20"><h1 className="text-2xl font-bold">Accès refusé</h1><p className="my-6">Votre compte ne permet pas de consulter cette page.</p><Link className="underline" href="/">Retour à l’accueil</Link></main>;
}
