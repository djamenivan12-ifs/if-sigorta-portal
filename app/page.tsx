export default function Home() {
  return (
    <main className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold text-blue-900 mb-4">
        IF SIGORTA
      </h1>

      <p className="text-2xl text-gray-700 mb-10">
        Assurance Santé pour Étrangers
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <a
  href="/demande"
  className="bg-blue-700 hover:bg-blue-800 text-white py-4 rounded-xl text-xl font-semibold text-center"
>
  Faire une demande
</a>

        <a
  href="/suivi"
  className="bg-white border-2 border-blue-700 text-blue-700 py-4 rounded-xl text-xl font-semibold text-center"
>
  Suivre ma demande
</a>
      </div>

      <div className="mt-12 text-4xl">
        🇫🇷 🇬🇧 🇹🇷
      </div>
    </main>
  );
}