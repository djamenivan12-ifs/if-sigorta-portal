export type InsuranceDuration = 1 | 2;

export type PriceCalculationResult = {
  age: number;
  duration: InsuranceDuration;
  price: number | null;
  available: boolean;
};

type PriceRange = {
  minimumAge: number;
  maximumAge: number;
  oneYearPrice: number;
  twoYearPrice: number;
};

const priceRanges: PriceRange[] = [
  {
    minimumAge: 0,
    maximumAge: 17,
    oneYearPrice: 1400,
    twoYearPrice: 2800,
  },
  {
    minimumAge: 18,
    maximumAge: 25,
    oneYearPrice: 450,
    twoYearPrice: 950,
  },
  {
    minimumAge: 26,
    maximumAge: 30,
    oneYearPrice: 625,
    twoYearPrice: 1280,
  },
  {
    minimumAge: 31,
    maximumAge: 40,
    oneYearPrice: 695,
    twoYearPrice: 1400,
  },
];

export function calculateInsuranceAge(
  birthDate: string,
  issueDate: Date = new Date(),
): number | null {
  if (!birthDate) {
    return null;
  }

  const birthYear = Number(birthDate.slice(0, 4));

  if (!Number.isInteger(birthYear)) {
    return null;
  }

  const age = issueDate.getFullYear() - birthYear;

  if (age < 0 || age > 120) {
    return null;
  }

  return age;
}

export function calculateInsurancePrice(
  birthDate: string,
  duration: InsuranceDuration,
  issueDate: Date = new Date(),
): PriceCalculationResult | null {
  const age = calculateInsuranceAge(birthDate, issueDate);

  if (age === null) {
    return null;
  }

  const matchingRange = priceRanges.find(
    (range) => age >= range.minimumAge && age <= range.maximumAge,
  );

  if (!matchingRange) {
    return {
      age,
      duration,
      price: null,
      available: false,
    };
  }

  return {
    age,
    duration,
    price:
      duration === 1
        ? matchingRange.oneYearPrice
        : matchingRange.twoYearPrice,
    available: true,
  };
}