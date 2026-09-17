import { skylineNationalityGrid } from "@/lib/insurance/nationalityRates";
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
export async function GET() {
  try {
    const rates = await skylineNationalityGrid();
    return NextResponse.json(
      {
        insurer: "Skyline",
        nationality: "CG",
        currency: "TRY",
        effectiveFrom: rates[0]?.effective_from ?? null,
        rows: rates.map((r) => ({
          minAge: r.min_age,
          maxAge: r.max_age,
          oneYearPrice: Number(r.one_year_price),
          twoYearPrice: Number(r.two_year_price),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Tarifs temporairement indisponibles." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
