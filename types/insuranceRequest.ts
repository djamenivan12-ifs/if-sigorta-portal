export type InsuranceDuration = 1 | 2;

export type AddressData = {
  provinceId: string;
  districtId: string;
  neighborhoodId: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string;
};

export type InsuranceRequestData = {
  lastName: string;
  firstName: string;
  fatherName: string;
  birthDate: string;
  gender: string;
  nationality: string;

  whatsappCountryCode: string;
  whatsappNumber: string;

  address: AddressData;

  kimlikNumber: string;
  kimlikExpirationDate: string;
  passportNumber: string;

  duration: InsuranceDuration;
  calculatedAge: number | null;
  calculatedPrice: number | null;

  passportFile: File | null;
  kimlikFrontFile: File | null;
  kimlikBackFile: File | null;

  paymentReceiptFile: File | null;
};