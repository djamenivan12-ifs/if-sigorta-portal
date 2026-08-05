"use client";

const BANK_INFORMATION = {
  beneficiary: "IVAN NEVILLE WANDJI DJAMEN",
  bankName: "Enpara",
  iban: "TR46 0015 7000 0000 0129 6575 41",
};

type BankCardProps = {
  requestCode: string;
};

export default function BankCard({
  requestCode,
}: BankCardProps) {
  async function copyText(
    value: string,
    successMessage: string,
  ) {
    try {
      await navigator.clipboard.writeText(value);
      alert(successMessage);
    } catch {
      alert(
        "La copie automatique a échoué. Vous pouvez copier le texte manuellement.",
      );
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold text-slate-900">
        Coordonnées bancaires
      </h2>

      <dl className="mt-6 space-y-5">
        <div>
          <dt className="text-sm text-slate-500">
            Bénéficiaire
          </dt>

          <dd className="mt-1 font-semibold text-slate-900">
            {BANK_INFORMATION.beneficiary}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-slate-500">
            Banque
          </dt>

          <dd className="mt-1 font-semibold text-slate-900">
            {BANK_INFORMATION.bankName}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-slate-500">
            IBAN
          </dt>

          <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="break-all font-mono font-semibold text-slate-900">
              {BANK_INFORMATION.iban}
            </span>

            <button
              type="button"
              onClick={() =>
                copyText(
                  BANK_INFORMATION.iban.replace(/\s/g, ""),
                  "IBAN copié.",
                )
              }
              className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Copier l’IBAN
            </button>
          </dd>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <dt className="text-sm text-slate-500">
            Référence obligatoire du virement
          </dt>

          <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="break-all font-semibold text-blue-700">
              {requestCode}
            </span>

            <button
              type="button"
              disabled={!requestCode}
              onClick={() =>
                copyText(
                  requestCode,
                  "Référence du virement copiée.",
                )
              }
              className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Copier la référence
            </button>
          </dd>
        </div>
      </dl>

      <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
        Indiquez exactement le code du dossier dans la description ou la
        référence du virement.
      </div>
    </section>
  );
}