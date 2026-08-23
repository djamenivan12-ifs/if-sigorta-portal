import { NextResponse } from "next/server";

import {
  requireApiRole,
} from "@/lib/auth/requireApiRole";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type PriceRangePayload = {
  id?: number;
  minimumAge: number;
  maximumAge: number;
  oneYearPrice: number;
  twoYearPrice: number;
  isActive: boolean;
};

type RequestBody = {
  ranges?: PriceRangePayload[];
};

export async function PUT(
  request: Request,
) {
  const auth =
    await requireApiRole([
      "admin",
    ]);

  if (!auth.success) {
    return auth.response;
  }

  try {
    const body =
      (await request.json()) as RequestBody;

    const ranges =
      body.ranges ?? [];

    if (
      ranges.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Aucun tarif à enregistrer.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    for (
      const range of ranges
    ) {
      if (
        !Number.isInteger(
          range.minimumAge,
        ) ||
        !Number.isInteger(
          range.maximumAge,
        ) ||
        range.minimumAge < 0 ||
        range.maximumAge <
          range.minimumAge
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Une tranche d’âge est invalide.",
          },
          {
            status: 400,
            headers: {
              "Cache-Control":
                "no-store",
            },
          },
        );
      }

      if (
        !Number.isFinite(
          range.oneYearPrice,
        ) ||
        !Number.isFinite(
          range.twoYearPrice,
        ) ||
        range.oneYearPrice <= 0 ||
        range.twoYearPrice <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Un tarif est invalide.",
          },
          {
            status: 400,
            headers: {
              "Cache-Control":
                "no-store",
            },
          },
        );
      }
    }

    const serviceClient =
      createServiceClient();

    const now =
      new Date().toISOString();

    for (
      const range of ranges
    ) {
      if (range.id) {
        const {
          error:
            updateError,
        } =
          await serviceClient
            .from(
              "insurance_price_ranges",
            )
            .update({
              minimum_age:
                range.minimumAge,

              maximum_age:
                range.maximumAge,

              one_year_price:
                range.oneYearPrice,

              two_year_price:
                range.twoYearPrice,

              is_active:
                range.isActive,

              updated_at:
                now,
            })
            .eq(
              "id",
              range.id,
            );

        if (updateError) {
          throw new Error(
            updateError.message,
          );
        }
      } else {
        const {
          error:
            insertError,
        } =
          await serviceClient
            .from(
              "insurance_price_ranges",
            )
            .insert({
              minimum_age:
                range.minimumAge,

              maximum_age:
                range.maximumAge,

              one_year_price:
                range.oneYearPrice,

              two_year_price:
                range.twoYearPrice,

              is_active:
                range.isActive,
            });

        if (insertError) {
          throw new Error(
            insertError.message,
          );
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Erreur paramètres tarifs :",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}