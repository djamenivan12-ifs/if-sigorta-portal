import type { AddressValue } from "@/components/AddressSelector";

type Language = "fr" | "en" | "tr";
const labels = {
  fr: { provinceId: "province", districtId: "district", neighborhoodId: "quartier", street: "rue (Cadde / Sokak)", buildingNumber: "numéro du bâtiment (Bina No)" },
  en: { provinceId: "province", districtId: "district", neighborhoodId: "neighborhood", street: "street", buildingNumber: "building number" },
  tr: { provinceId: "il", districtId: "ilçe", neighborhoodId: "mahalle", street: "cadde / sokak", buildingNumber: "bina no" },
};
export function addressError(address: Partial<AddressValue> | null | undefined, language: Language = "fr"): string | null {
  const fields = ["provinceId", "districtId", "neighborhoodId", "street", "buildingNumber"] as const;
  const missing = fields.filter(field => {
    const value = address?.[field];
    if (typeof value !== "string" || !value.trim()) return true;
    return field.endsWith("Id") && (!Number.isSafeInteger(Number(value)) || Number(value) <= 0);
  }).map(field => labels[language][field]);
  if (!missing.length) return null;
  return language === "fr" ? `Adresse : veuillez compléter ou sélectionner ${missing.join(", ")}.`
    : language === "en" ? `Address: please complete or select ${missing.join(", ")}.`
    : `Adres: lütfen şu alanları doldurun veya seçin: ${missing.join(", ")}.`;
}

// Read the visible inputs too: browser autofill does not always fire React change events.
export function addressFromForm(form: HTMLFormElement, address: AddressValue): AddressValue {
  const fields = new FormData(form);
  const text = (name: "street" | "buildingNumber" | "apartmentNumber") => {
    const value = fields.get(name);
    return typeof value === "string" ? value.trim() : address[name];
  };
  return { ...address, street: text("street"), buildingNumber: text("buildingNumber"), apartmentNumber: text("apartmentNumber") };
}
