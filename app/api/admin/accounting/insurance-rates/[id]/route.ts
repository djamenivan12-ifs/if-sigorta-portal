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
    const { user } =
      await requireRole([
        "admin",
      ]);

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tarif invalide.",
        },
        {
          status: 400,
        },
      );
    }

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
      !Number.isInteger(minAge) ||
      !Number.isInteger(maxAge) ||
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
      !Number.isFinite(realCost) ||
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
          min_age,
          max_age,
          duration_years,
          real_cost,
          effective_from,
          is_active
        `)
        .eq(
          "id",
          id,
        )
        .maybeSingle();

    if (existingRateError) {
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

    if (isActive) {
      const {
        data: overlappingRates,
        error: overlapError,
      } =
        await serviceClient
          .from(
            "insurance_cost_rates",
          )
          .select(`
            id,
            min_age,
            max_age,
            effective_from
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

      if (overlapError) {
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

      const hasOverlap =
        (
          overlappingRates ??
          []
        ).some(
          (rate) =>
            minAge <=
              rate.max_age &&
            maxAge >=
              rate.min_age &&
            effectiveFrom ===
              rate.effective_from,
        );

      if (hasOverlap) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cette tranche chevauche déjà un tarif actif pour le même assureur, la même durée et la même date d’entrée en vigueur.",
          },
          {
            status: 409,
          },
        );
      }
    }

    const hasChanged =
      existingRate.min_age !==
        minAge ||
      existingRate.max_age !==
        maxAge ||
      Number(
        existingRate.real_cost,
      ) !== realCost ||
      existingRate.effective_from !==
        effectiveFrom ||
      existingRate.is_active !==
        isActive;

    if (!hasChanged) {
      return NextResponse.json({
        success: true,
        rate: existingRate,
        changed: false,
      });
    }

    /*
     * On conserve l'ancienne version AVANT
     * de modifier le tarif actuel.
     */
    const {
      error: historyError,
    } =
      await serviceClient
        .from(
          "insurance_cost_rate_history",
        )
        .insert({
          insurance_cost_rate_id:
            existingRate.id,

          insurance_company_id:
            existingRate.insurance_company_id,

          min_age:
            existingRate.min_age,

          max_age:
            existingRate.max_age,

          duration_years:
            existingRate.duration_years,

          real_cost:
            Number(
              existingRate.real_cost,
            ),

          effective_from:
            existingRate.effective_from,

          is_active:
            existingRate.is_active,

          changed_by:
            user.id,

          changed_at:
            new Date().toISOString(),
        });

    if (historyError) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Impossible d’enregistrer l’historique du tarif : ${historyError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    const {
      data: updatedRate,
      error: updateError,
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

    if (updateError) {
      /*
       * L'UPDATE a échoué alors que l'ancienne
       * version a déjà été inscrite dans
       * l'historique.
       *
       * On supprime cette entrée afin de ne pas
       * conserver un faux changement.
       */
      await serviceClient
        .from(
          "insurance_cost_rate_history",
        )
        .delete()
        .eq(
          "insurance_cost_rate_id",
          existingRate.id,
        )
        .eq(
          "changed_by",
          user.id,
        )
        .eq(
          "changed_at",
          (
            await serviceClient
              .from(
                "insurance_cost_rate_history",
              )
              .select(
                "changed_at",
              )
              .eq(
                "insurance_cost_rate_id",
                existingRate.id,
              )
              .eq(
                "changed_by",
                user.id,
              )
              .order(
                "changed_at",
                {
                  ascending: false,
                },
              )
              .limit(1)
              .maybeSingle()
          ).data?.changed_at ??
            "",
        );

      if (
        updateError.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Un tarif identique existe déjà pour cet assureur.",
          },
          {
            status: 409,
          },
        );
      }

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
      rate: updatedRate,
      changed: true,
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