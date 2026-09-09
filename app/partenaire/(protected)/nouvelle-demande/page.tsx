import PartnerRequestForm from "./PartnerRequestForm";

export default function NewPartnerRequestPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1100px] overflow-x-hidden px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mb-6 sm:mb-7">
        <h1 className="text-2xl font-black tracking-tight text-[#102B20] sm:text-3xl">
          Nouvelle demande
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Créez une assurance pour l’un de vos clients.
        </p>
      </div>

      <PartnerRequestForm />
    </div>
  );
}
