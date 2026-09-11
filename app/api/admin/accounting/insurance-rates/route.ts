import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type RateRowPayload = {
  minAge?: number;
  maxAge?: number;
  oneYearCost?: number;
  twoYearCost?: number;
};

type CreateRatesPayload = {
  insuranceCompanyId?: string;
  effectiveFrom?: string;
  rows?: RateRowPayload[];
};

type NormalizedRateRow = {
  minAge: number;
  maxAge: number;
  oneYearCost: number;
  twoYearCost: number;
};

function isValidDateString(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

function hasOverlappingRanges(
  rows: NormalizedRateRow[],
) {
  const sortedRows = [
    ...rows,
  ].sort(
    (a, b) =>
      a.minAge -
      b.minAge,
  );

  for (
    let index = 1;
    index <
    sortedRows.length;
    index += 1
  ) {
    const previous =
      sortedRows[
        index - 1
      ];

    const current =
      sortedRows[index];

    if (
      current.minAge <=
      previous.maxAge
    ) {
      return true;
    }
  }

  return false;
}

export async function POST(
  request: Request,
) {
  try {
    await requireRole([
      "admin",
    ]);

    const body =
      (await request.json()) as CreateRatesPayload;

    const insuranceCompanyId =
      body.insuranceCompanyId?.trim();

    const effectiveFrom =
      body.effectiveFrom?.trim();

    const rows =
      body.rows ?? [];

    if (
      !insuranceCompanyId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Veuillez sélectionner un assureur.",
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
      rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ajoutez au moins une tranche tarifaire.",
        },
        {
          status: 400,
        },
      );
    }

    const normalizedRows: NormalizedRateRow[] =
      [];

    for (
      const row of rows
    ) {
      const minAge =
        Number(
          row.minAge,
        );

      const maxAge =
        Number(
          row.maxAge,
        );

      const oneYearCost =
        Number(
          row.oneYearCost,
        );

      const twoYearCost =
        Number(
          row.twoYearCost,
        );

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
              "Une tranche d’âge est invalide.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        !Number.isFinite(
          oneYearCost,
        ) ||
        !Number.isFinite(
          twoYearCost,
        ) ||
        oneYearCost < 0 ||
        twoYearCost < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Un coût d’assurance est invalide.",
          },
          {
            status: 400,
          },
        );
      }

      normalizedRows.push(
        {
          minAge,
          maxAge,
          oneYearCost,
          twoYearCost,
        },
      );
    }

    if (
      hasOverlappingRanges(
        normalizedRows,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Les tranches d’âge ne doivent pas se chevaucher.",
        },
        {
          status: 400,
        },
      );
    }

    const serviceClient =
      createServiceClient();

    const {
      data: company,
      error:
        companyError,
    } =
      await serviceClient
        .from(
          "insurance_companies",
        )
        .select(
          `
            id,
            name,
            is_active
          `,
        )
        .eq(
          "id",
          insuranceCompanyId,
        )
        .maybeSingle();

    if (
      companyError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            companyError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Assureur introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      !company.is_active
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cet assureur est actuellement inactif.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Vérification applicative avant l'insertion.
     * La contrainte UNIQUE en base reste la protection définitive
     * contre deux insertions concurrentes.
     */
    const {
      data: existingRates,
      error: existingRatesError,
    } =
      await serviceClient
        .from(
          "insurance_cost_rates",
        )
        .select(
          `
            min_age,
            max_age,
            duration_years
          `,
        )
        .eq(
          "insurance_company_id",
          insuranceCompanyId,
        )
        .eq(
          "effective_from",
          effectiveFrom,
        );

    if (
      existingRatesError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            existingRatesError.message,
        },
        {
          status: 500,
        },
      );
    }

    const duplicateRange =
      normalizedRows.find(
        (row) =>
          (existingRates ?? []).some(
            (existingRate) =>
              existingRate.min_age ===
                row.minAge &&
              existingRate.max_age ===
                row.maxAge,
          ),
      );

    if (
      duplicateRange
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Une grille existe déjà pour la tranche ${duplicateRange.minAge} – ${duplicateRange.maxAge} ans à cette date d’entrée en vigueur.`,
        },
        {
          status: 409,
        },
      );
    }

    const rowsToInsert =
      normalizedRows.flatMap(
        (row) => [
          {
            insurance_company_id:
              insuranceCompanyId,

            min_age:
              row.minAge,

            max_age:
              row.maxAge,

            duration_years:
              1,

            real_cost:
              row.oneYearCost,

            effective_from:
              effectiveFrom,

            is_active:
              true,
          },

          {
            insurance_company_id:
              insuranceCompanyId,

            min_age:
              row.minAge,

            max_age:
              row.maxAge,

            duration_years:
              2,

            real_cost:
              row.twoYearCost,

            effective_from:
              effectiveFrom,

            is_active:
              true,
          },
        ],
      );

    const {
      data: createdRates,
      error:
        insertError,
    } =
      await serviceClient
        .from(
          "insurance_cost_rates",
        )
        .insert(
          rowsToInsert,
        )
        .select(
          `
            id,
            insurance_company_id,
            min_age,
            max_age,
            duration_years,
            real_cost,
            effective_from,
            is_active
          `,
        );

    if (
      insertError
    ) {
      if (
        insertError.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cette grille tarifaire existe déjà pour cet assureur et cette date d’entrée en vigueur.",
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
            insertError.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,

        company: {
          id:
            company.id,
          name:
            company.name,
        },

        rates:
          createdRates ??
          [],
      },
      {
        status: 201,
      },
    );
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
