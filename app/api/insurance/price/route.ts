import { NextResponse } from "next/server";

import {
  calculateInsurancePriceServer,
  InsuranceDuration,
} from "@/lib/insurance/calculatePriceServer";

type RequestBody = {
  birthDate?: string;
  nationality?: string;
  duration?: InsuranceDuration;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    const birthDate = body.birthDate?.trim() ?? "";

    const duration = body.duration;

    if (!birthDate || (duration !== 1 && duration !== 2)) {
      return NextResponse.json(
        {
          error: "Les informations de calcul du tarif sont invalides.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const result = await calculateInsurancePriceServer(
      birthDate,
      duration,
      new Date(),
      typeof body.nationality === "string" ? body.nationality : "",
    );

    if (!result) {
      return NextResponse.json(
        {
          error: "La date de naissance est invalide.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erreur calcul tarif assurance :", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de calculer le tarif pour le moment.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
// Keep an empty response for older clients that request the retired special grid.
export async function GET() {
  return NextResponse.json(
    { currency: "TRY", effectiveFrom: null, rows: [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
