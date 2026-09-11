import {
  NextResponse,
} from "next/server";

import {
  requireRole,
} from "@/lib/auth/requireRole";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTurkeyDateString() {
  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          "Europe/Istanbul",
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const year =
    parts.find(
      (part) =>
        part.type === "year",
    )?.value ?? "";

  const month =
    parts.find(
      (part) =>
        part.type === "month",
    )?.value ?? "";

  const day =
    parts.find(
      (part) =>
        part.type === "day",
    )?.value ?? "";

  return `${year}-${month}-${day}`;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { user } =
      await requireRole([
        "agent",
        "admin",
      ]);

    const {
      id,
    } =
      await context.params;

    const serviceClient =
      createServiceClient();

    const {
      data:
        insuranceRequest,
      error:
        requestError,
    } =
      await serviceClient
        .from(
          "insurance_requests",
        )
        .select(
          `
            id,
            status,
            assigned_agent_id,
            calculated_age,
            insurance_duration_years
          `,
        )
        .eq(
          "id",
          id,
        )
        .maybeSingle();

    if (
      requestError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            requestError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (
      !insuranceRequest
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Dossier introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    const role =
      user.app_metadata
        ?.role;

    if (
      role ===
        "agent" &&
      insuranceRequest
        .assigned_agent_id !==
        user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vous ne pouvez pas traiter ce dossier.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      insuranceRequest
        .status !==
      "payment_confirmed"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "L’assureur ne peut être choisi qu’après validation du paiement.",
        },
        {
          status: 400,
        },
      );
    }

    const age =
      Number(
        insuranceRequest
          .calculated_age,
      );

    const durationYears =
      Number(
        insuranceRequest
          .insurance_duration_years,
      );

    if (
      !Number.isInteger(
        age,
      ) ||
      age < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "L’âge calculé du client est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      durationYears !== 1 &&
      durationYears !== 2
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La durée d’assurance est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    const today =
      getTurkeyDateString();

    const {
      data: companies,
      error:
        companiesError,
    } =
      await serviceClient
        .from(
          "insurance_companies",
        )
        .select(
          `
            id,
            name
          `,
        )
        .eq(
          "is_active",
          true,
        )
        .order(
          "name",
          {
            ascending:
              true,
          },
        );

    if (
      companiesError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            companiesError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (
      !companies ||
      companies.length ===
        0
    ) {
      return NextResponse.json({
        success: true,
        insurers: [],
      });
    }

    const companyIds =
      companies.map(
        (company) =>
          company.id,
      );

    const {
      data: rates,
      error:
        ratesError,
    } =
      await serviceClient
        .from(
          "insurance_cost_rates",
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
            created_at
          `,
        )
        .in(
          "insurance_company_id",
          companyIds,
        )
        .eq(
          "is_active",
          true,
        )
        .eq(
          "duration_years",
          durationYears,
        )
        .lte(
          "min_age",
          age,
        )
        .gte(
          "max_age",
          age,
        )
        .lte(
          "effective_from",
          today,
        )
        .order(
          "effective_from",
          {
            ascending:
              false,
          },
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        );

    if (
      ratesError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            ratesError.message,
        },
        {
          status: 500,
        },
      );
    }

    const latestRateByCompany =
      new Map<
        string,
        {
          realCost: number;
          effectiveFrom: string;
        }
      >();

    for (
      const rate of
        rates ?? []
    ) {
      if (
        latestRateByCompany.has(
          rate
            .insurance_company_id,
        )
      ) {
        continue;
      }

      const realCost =
        Number(
          rate.real_cost,
        );

      if (
        !Number.isFinite(
          realCost,
        ) ||
        realCost < 0
      ) {
        continue;
      }

      latestRateByCompany.set(
        rate
          .insurance_company_id,
        {
          realCost,

          effectiveFrom:
            rate.effective_from,
        },
      );
    }

    const insurers =
      companies
        .filter(
          (company) =>
            latestRateByCompany.has(
              company.id,
            ),
        )
        .map(
          (company) => ({
            id:
              company.id,
            name:
              company.name,
          }),
        );

    return NextResponse.json({
      success: true,
      insurers,
    });
  } catch (
    error
  ) {
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
