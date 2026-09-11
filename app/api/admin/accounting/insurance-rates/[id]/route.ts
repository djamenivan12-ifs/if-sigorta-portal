import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type UpdateRatePayload = {
  minAge?: number;
  maxAge?: number;
  realCost?: number;
  effectiveFrom?: string;
  isActive?: boolean;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isValidDateString(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    await requireRole([
      "admin",
    ]);

    const { id } =
      await context.params;

    const body =
      (await request.json()) as UpdateRatePayload;

    const minAge =
      Number(body.minAge);

    const maxAge =
      Number(body.maxAge);

    const realCost =
      Number(body.realCost);

    const effectiveFrom =
      body.effectiveFrom?.trim();

    const isActive =
      body.isActive;

    if (
      !Number.isInteger(
        minAge,
      ) ||
      !Number.isInteger(
        maxAge,
      ) ||
      minAge < 0 ||
      maxAge < minAge
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La tranche d’âge est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(
        realCost,
      ) ||
      realCost < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le coût réel est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !effectiveFrom ||
      !isValidDateString(
        effectiveFrom,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La date d’entrée en vigueur est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      typeof isActive !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le statut du tarif est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    const serviceClient =
      createServiceClient();

    const {
      data: existingRate,
      error:
        existingRateError,
    } =
      await serviceClient
        .from(
          "insurance_cost_rates",
        )
        .select(`
          id,
          insurance_company_id,
          duration_years
        `)
        .eq(
          "id",
          id,
        )
        .maybeSingle();

    if (
      existingRateError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            existingRateError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (!existingRate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tarif introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    const {
      data:
        overlappingRates,
      error:
        overlapError,
    } =
      await serviceClient
        .from(
          "insurance_cost_rates",
        )
        .select(`
          id,
          min_age,
          max_age
        `)
        .eq(
          "insurance_company_id",
          existingRate.insurance_company_id,
        )
        .eq(
          "duration_years",
          existingRate.duration_years,
        )
        .eq(
          "is_active",
          true,
        )
        .neq(
          "id",
          id,
        );

    if (
      overlapError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            overlapError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (isActive) {
      const hasOverlap =
        (
          overlappingRates ??
          []
        ).some(
          (rate) =>
            minAge <=
              rate.max_age &&
            maxAge >=
              rate.min_age,
        );

      if (hasOverlap) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cette tranche chevauche déjà un tarif actif pour le même assureur et la même durée.",
          },
          {
            status: 409,
          },
        );
      }
    }

    const {
      data: updatedRate,
      error:
        updateError,
    } =
      await serviceClient
        .from(
          "insurance_cost_rates",
        )
        .update({
          min_age:
            minAge,

          max_age:
            maxAge,

          real_cost:
            realCost,

          effective_from:
            effectiveFrom,

          is_active:
            isActive,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          id,
        )
        .select(`
          id,
          insurance_company_id,
          min_age,
          max_age,
          duration_years,
          real_cost,
          effective_from,
          is_active,
          updated_at
        `)
        .single();

    if (
      updateError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            updateError.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      rate:
        updatedRate,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.",
      },
      {
        status: 500,
      },
    );
  }
}