import type { PriceRangeInput } from "./validatePriceRanges";

export type PartnerPriceSnapshot = {
  revision: string;
  partners: { id: string; name: string; isActive: boolean; ranges: PriceRangeInput[] }[];
};
