import {
  Building2,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";

import {
  requirePartner,
} from "@/lib/auth/requirePartner";

export default async function PartnerProfilePage() {
  const {
    partner,
  } =
    await requirePartner();

  const rows = [
    {
      label:
        "Partenaire",
      value:
        partner.companyName,
      icon:
        Building2,
    },
    {
      label:
        "Responsable",
      value:
        partner.managerName,
      icon:
        UserRound,
    },
    {
      label:
        "Adresse e-mail",
      value:
        partner.email,
      icon:
        Mail,
    },
    {
      label:
        "WhatsApp",
      value:
        `${partner.whatsappCountryCode} ${partner.whatsappNumber}`,
      icon:
        Phone,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-5 lg:px-8 lg:py-8">
      <h1 className="text-2xl font-black tracking-tight text-[#102B20] sm:text-3xl">
        Mon profil
      </h1>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Informations liées à votre compte partenaire IF Sigorta.
      </p>

      <div className="mt-7 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-[#FAFCF9] px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#0B5D3B]">
            {
              partner.code
            }
          </p>

          <h2 className="mt-1 text-lg font-black text-[#102B20]">
            {
              partner.companyName
            }
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {rows.map(
            (row) => {
              const Icon =
                row.icon;

              return (
                <div
                  key={
                    row.label
                  }
                  className="flex items-start gap-4 px-6 py-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F8F2] text-[#0B5D3B]">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-400">
                      {
                        row.label
                      }
                    </p>

                    <p className="mt-1 break-words text-sm font-bold text-slate-700">
                      {
                        row.value
                      }
                    </p>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#DDEBD9] bg-[#F3F8F2] px-5 py-4">
        <p className="text-xs leading-5 text-[#46604C]">
          Pour modifier les informations administratives de ce compte, contactez IF Sigorta.
        </p>
      </div>
    </div>
  );
}