import {
  NextResponse,
} from "next/server";

import {
  requireApiPartner,
} from "@/lib/auth/requireApiPartner";

import {
  calculatePartnerInsurancePriceServer,
} from "@/lib/insurance/calculatePriceServer";

type PriceRequestBody = {
  birthDate?: string;
  duration?: number;
};

function jsonError(
  error: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

export async function POST(
  request: Request,
) {
  const auth =
    await requireApiPartner();

  if (!auth.success) {
    return auth.response;
  }

  try {
    const body =
      (await request.json()) as
        PriceRequestBody;

    const birthDate =
      typeof body.birthDate ===
      "string"
        ? body.birthDate.trim()
        : "";

    const duration =
      body.duration;

    if (!birthDate) {
      return jsonError(
        "La date de naissance est obligatoire.",
        400,
      );
    }

    if (
      duration !== 1 &&
      duration !== 2
    ) {
      return jsonError(
        "La durée de l’assurance est invalide.",
        400,
      );
    }

    const result =
      await calculatePartnerInsurancePriceServer(
        auth.partner.id,
        birthDate,
        duration,
      );

    if (
      !result ||
      !result.available ||
      result.price === null
    ) {
      return NextResponse.json(
        {
          success: true,
          available: false,
          age:
            result?.age ??
            null,
          duration,
          price: null,
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        available: true,
        age:
          result.age,
        duration:
          result.duration,
        price:
          result.price,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Erreur calcul tarif partenaire :",
      error,
    );

    return jsonError(
      "Impossible de calculer le tarif partenaire.",
      500,
    );
  }
}