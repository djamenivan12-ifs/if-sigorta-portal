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

function hasOverlappingActiveRanges(
  ranges: PriceRangePayload[],
) {
  const activeRanges =
    ranges
      .filter(
        (range) =>
          range.isActive,
      )
      .sort(
        (a, b) =>
          a.minimumAge -
          b.minimumAge,
      );

  for (
    let index = 1;
    index <
    activeRanges.length;
    index += 1
  ) {
    const previous =
      activeRanges[
        index - 1
      ];

    const current =
      activeRanges[
        index
      ];

    if (
      current.minimumAge <=
      previous.maximumAge
    ) {
      return true;
    }
  }

  return false;
}

export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const auth =
    await requireApiRole([
      "admin",
    ]);

  if (!auth.success) {
    return auth.response;
  }

  try {
    const {
      id: partnerId,
    } =
      await context.params;

    if (!partnerId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Partenaire invalide.",
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
        range.minimumAge <
          0 ||
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
        range.oneYearPrice <=
          0 ||
        range.twoYearPrice <=
          0
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

    if (
      hasOverlappingActiveRanges(
        ranges,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deux tranches d’âge actives se chevauchent.",
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

    const serviceClient =
      createServiceClient();

    const {
      data: partner,
      error:
        partnerError,
    } =
      await serviceClient
        .from(
          "partners",
        )
        .select(
          "id",
        )
        .eq(
          "id",
          partnerId,
        )
        .maybeSingle();

    if (partnerError) {
      throw new Error(
        partnerError.message,
      );
    }

    if (!partner) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Partenaire introuvable.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const {
      data:
        existingRanges,
      error:
        existingRangesError,
    } =
      await serviceClient
        .from(
          "partner_price_ranges",
        )
        .select(
          "id",
        )
        .eq(
          "partner_id",
          partnerId,
        );

    if (
      existingRangesError
    ) {
      throw new Error(
        existingRangesError.message,
      );
    }

    const submittedIds =
      new Set(
        ranges
          .filter(
            (range) =>
              range.id !==
              undefined,
          )
          .map(
            (range) =>
              range.id as number,
          ),
      );

    const idsToDelete =
      (
        existingRanges ??
        []
      )
        .map(
          (range) =>
            Number(
              range.id,
            ),
        )
        .filter(
          (id) =>
            !submittedIds.has(
              id,
            ),
        );

    if (
      idsToDelete.length >
      0
    ) {
      const {
        error:
          deleteError,
      } =
        await serviceClient
          .from(
            "partner_price_ranges",
          )
          .delete()
          .eq(
            "partner_id",
            partnerId,
          )
          .in(
            "id",
            idsToDelete,
          );

      if (deleteError) {
        throw new Error(
          deleteError.message,
        );
      }
    }

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
              "partner_price_ranges",
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
            )
            .eq(
              "partner_id",
              partnerId,
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
              "partner_price_ranges",
            )
            .insert({
              partner_id:
                partnerId,

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
      "Erreur tarifs partenaire :",
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