import {
  CircleCheckBig,
  Clock3,
  CreditCard,
  FileText,
  FolderOpen,
} from "lucide-react";

import {
  requirePartner,
} from "@/lib/auth/requirePartner";

import {
  createServiceClient,
} from "@/lib/supabase/service";

async function getPartnerDashboardCounts(
  partnerId: string,
) {
  const supabase =
    createServiceClient();

  const baseQuery = () =>
    supabase
      .from(
        "insurance_requests",
      )
      .select(
        "id",
        {
          count:
            "exact",
          head:
            true,
        },
      )
      .eq(
        "source",
        "partner",
      )
      .eq(
        "partner_id",
        partnerId,
      );

  const [
    totalResult,
    waitingPaymentResult,
    paymentRejectedResult,
    paymentReviewResult,
    paymentConfirmedResult,
    policyPreparationResult,
    policyAvailableResult,
  ] =
    await Promise.all([
      baseQuery(),

      baseQuery().eq(
        "status",
        "waiting_payment",
      ),

      baseQuery().eq(
        "status",
        "payment_rejected",
      ),

      baseQuery().eq(
        "status",
        "payment_review",
      ),

      baseQuery().eq(
        "status",
        "payment_confirmed",
      ),

      baseQuery().eq(
        "status",
        "policy_preparation",
      ),

      baseQuery().eq(
        "status",
        "policy_available",
      ),
    ]);

  const results = [
    totalResult,
    waitingPaymentResult,
    paymentRejectedResult,
    paymentReviewResult,
    paymentConfirmedResult,
    policyPreparationResult,
    policyAvailableResult,
  ];

  const firstError =
    results.find(
      (result) =>
        result.error,
    )?.error;

  if (firstError) {
    throw new Error(
      firstError.message,
    );
  }

  return {
    total:
      totalResult.count ??
      0,

    waitingPayment:
      (waitingPaymentResult.count ??
        0) +
      (paymentRejectedResult.count ??
        0),

    paymentReview:
      paymentReviewResult.count ??
      0,

    processing:
      (paymentConfirmedResult.count ??
        0) +
      (policyPreparationResult.count ??
        0),

    policyAvailable:
      policyAvailableResult.count ??
      0,
  };
}

export default async function PartnerDashboardPage() {
  const {
    partner,
  } =
    await requirePartner();

  let counts = {
    total: 0,
    waitingPayment: 0,
    paymentReview: 0,
    processing: 0,
    policyAvailable: 0,
  };

  try {
    counts =
      await getPartnerDashboardCounts(
        partner.id,
      );
  } catch (error) {
    console.error(
      "Erreur compteurs tableau de bord partenaire :",
      error,
    );
  }

  const cards = [
    {
      label:
        "Mes dossiers",

      value:
        counts.total,

      icon:
        FolderOpen,
    },
    {
      label:
        "En attente de paiement",

      value:
        counts.waitingPayment,

      icon:
        CreditCard,
    },
    {
      label:
        "Paiements en vérification",

      value:
        counts.paymentReview,

      icon:
        Clock3,
    },
    {
      label:
        "En traitement",

      value:
        counts.processing,

      icon:
        FileText,
    },
    {
      label:
        "Assurances disponibles",

      value:
        counts.policyAvailable,

      icon:
        CircleCheckBig,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-5 lg:px-8 lg:py-8">
      <div>
        <p className="text-sm font-semibold text-[#0B5D3B]">
          Bonjour{" "}
          {
            partner.managerName
          }
        </p>

        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#102B20] sm:text-3xl">
          Tableau de bord
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Suivez les demandes
          d’assurance réalisées
          pour vos clients.
        </p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(
          (card) => {
            const Icon =
              card.icon;

            return (
              <div
                key={
                  card.label
                }
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F8F2] text-[#0B5D3B]">
                    <Icon className="h-5 w-5" />
                  </div>

                  <span className="text-2xl font-black text-[#102B20]">
                    {
                      card.value
                    }
                  </span>
                </div>

                <p className="mt-5 text-sm font-bold leading-5 text-slate-600">
                  {
                    card.label
                  }
                </p>
              </div>
            );
          },
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
        <h2 className="text-lg font-black text-[#102B20]">
          Activité récente
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Les derniers dossiers
          de{" "}
          {
            partner.companyName
          }{" "}
          apparaîtront ici.
        </p>

        {counts.total ===
        0 ? (
          <div className="mt-6 flex min-h-44 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[#FAFCF9] px-6 text-center">
            <div>
              <FolderOpen className="mx-auto h-7 w-7 text-slate-300" />

              <p className="mt-3 text-sm font-bold text-slate-500">
                Aucun dossier
                partenaire pour le
                moment
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Vos dossiers
                apparaîtront ici
                après leur création.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-100 bg-[#FAFCF9] px-5 py-6">
            <p className="text-sm font-semibold text-slate-600">
              Vous avez{" "}
              <span className="font-black text-[#0B5D3B]">
                {
                  counts.total
                }
              </span>{" "}
              dossier
              {counts.total >
              1
                ? "s"
                : ""}{" "}
              dans votre espace
              partenaire.
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Le détail de
              l’activité récente
              sera affiché ici
              lorsque la gestion
              des dossiers
              partenaire sera
              activée.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}