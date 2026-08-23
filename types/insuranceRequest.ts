export type Gender = "male" | "female" | "";

export type InsuranceDuration = 1 | 2;

export type InsuranceAddress = {
  provinceId: string;
  districtId: string;
  neighborhoodId: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string;
};

export type InsuranceRequestData = {
  requestId: string;
  requestCode: string;

  lastName: string;
  firstName: string;
  fatherName: string;
  birthDate: string;
  gender: Gender;
  nationality: string;

  whatsappCountryCode: string;
  whatsappNumber: string;

  address: InsuranceAddress;

  hasKimlik: boolean;

  kimlikNumber: string;
  kimlikExpirationDate: string;

  /**
   * Demandée uniquement lorsque le client
   * ne possède pas encore de Kimlik.
   */
  insuranceStartDate: string;

  passportNumber: string;

  duration: InsuranceDuration;
  calculatedAge: number | null;
  calculatedPrice: number | null;

  passportFile: File | null;
  kimlikFrontFile: File | null;
  kimlikBackFile: File | null;

  paymentReceiptFile: File | null;
};