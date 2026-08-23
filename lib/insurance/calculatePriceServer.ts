import { createServiceClient } from "@/lib/supabase/service";

export type InsuranceDuration =
  | 1
  | 2;

export type ServerPriceCalculationResult = {
  age: number;
  duration: InsuranceDuration;
  price: number | null;
  available: boolean;
};

type PriceRangeRow = {
  minimum_age: number;
  maximum_age: number;
  one_year_price:
    | number
    | string;
  two_year_price:
    | number
    | string;
  is_active: boolean;
};

export function calculateInsuranceAge(
  birthDate: string,
  issueDate: Date = new Date(),
): number | null {
  if (!birthDate) {
    return null;
  }

  const birthYear =
    Number(
      birthDate.slice(
        0,
        4,
      ),
    );

  if (
    !Number.isInteger(
      birthYear,
    )
  ) {
    return null;
  }

  const age =
    issueDate.getFullYear() -
    birthYear;

  if (
    age < 0 ||
    age > 120
  ) {
    return null;
  }

  return age;
}

export async function calculateInsurancePriceServer(
  birthDate: string,
  duration: InsuranceDuration,
  issueDate: Date = new Date(),
): Promise<ServerPriceCalculationResult | null> {
  const age =
    calculateInsuranceAge(
      birthDate,
      issueDate,
    );

  if (
    age === null
  ) {
    return null;
  }

  const serviceClient =
    createServiceClient();

  const {
    data,
    error,
  } =
    await serviceClient
      .from(
        "insurance_price_ranges",
      )
      .select(
        `
          minimum_age,
          maximum_age,
          one_year_price,
          two_year_price,
          is_active
        `,
      )
      .eq(
        "is_active",
        true,
      )
      .lte(
        "minimum_age",
        age,
      )
      .gte(
        "maximum_age",
        age,
      )
      .order(
        "minimum_age",
        {
          ascending:
            true,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  if (!data) {
    return {
      age,
      duration,
      price:
        null,
      available:
        false,
    };
  }

  const priceRange =
    data as PriceRangeRow;

  const price =
    duration === 1
      ? Number(
          priceRange.one_year_price,
        )
      : Number(
          priceRange.two_year_price,
        );

  if (
    !Number.isFinite(
      price,
    ) ||
    price <= 0
  ) {
    return {
      age,
      duration,
      price:
        null,
      available:
        false,
    };
  }

  return {
    age,
    duration,
    price,
    available:
      true,
  };
}