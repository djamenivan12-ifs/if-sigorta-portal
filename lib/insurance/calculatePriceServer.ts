import {
  createServiceClient,
} from "@/lib/supabase/service";

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

function getPriceFromRange(
  priceRange: PriceRangeRow,
  duration: InsuranceDuration,
): number | null {
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
    return null;
  }

  return price;
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
      price: null,
      available: false,
    };
  }

  const price =
    getPriceFromRange(
      data as PriceRangeRow,
      duration,
    );

  return {
    age,
    duration,
    price,
    available:
      price !== null,
  };
}

export async function calculatePartnerInsurancePriceServer(
  partnerId: string,
  birthDate: string,
  duration: InsuranceDuration,
  issueDate: Date = new Date(),
): Promise<ServerPriceCalculationResult | null> {
  if (!partnerId) {
    return null;
  }

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

  /*
   * Le partenaire doit exister et être actif.
   * Un partenaire désactivé ne peut donc pas
   * obtenir de nouveau tarif.
   */
  const {
    data: partner,
    error: partnerError,
  } =
    await serviceClient
      .from(
        "partners",
      )
      .select(
        `
          id,
          is_active
        `,
      )
      .eq(
        "id",
        partnerId,
      )
      .eq(
        "is_active",
        true,
      )
      .maybeSingle();

  if (partnerError) {
    throw new Error(
      partnerError.message,
    );
  }

  if (!partner) {
    return {
      age,
      duration,
      price: null,
      available: false,
    };
  }

  /*
   * Recherche uniquement dans la grille
   * appartenant à CE partenaire.
   */
  const {
    data,
    error,
  } =
    await serviceClient
      .from(
        "partner_price_ranges",
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
        "partner_id",
        partnerId,
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
      price: null,
      available: false,
    };
  }

  const price =
    getPriceFromRange(
      data as PriceRangeRow,
      duration,
    );

  return {
    age,
    duration,
    price,
    available:
      price !== null,
  };
}