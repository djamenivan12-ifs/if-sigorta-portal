type PaymentSummaryProps = {
  amount: number | null;
};

export default function PaymentSummary({
  amount,
}: PaymentSummaryProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">
        Montant total à payer
      </p>

      <p className="mt-2 text-4xl font-bold text-blue-700">
        {amount !== null
          ? `${amount.toLocaleString("fr-FR")} TL`
          : "Montant indisponible"}
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        Vérifiez que le montant du virement correspond exactement au montant
        affiché.
      </p>
    </section>
  );
}