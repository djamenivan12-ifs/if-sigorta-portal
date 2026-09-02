export type PartnerRequestAddress = {
  provinceId: string;
  districtId: string;
  neighborhoodId: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string;
};

export type PartnerRequestFormData = {
  lastName: string;
  firstName: string;
  fatherName: string;
  birthDate: string;

  gender:
    | ""
    | "male"
    | "female";

  nationality: string;

  whatsappCountryCode: string;
  whatsappNumber: string;

  address:
    PartnerRequestAddress;

  hasKimlik: boolean;

  kimlikNumber: string;
  kimlikExpirationDate: string;

  insuranceStartDate: string;

  passportNumber: string;

  duration: 1 | 2;

  passportFile: File | null;
  kimlikFrontFile: File | null;
  kimlikBackFile: File | null;

  calculatedAge: number | null;
  calculatedPrice: number | null;
};

export type PartnerDocumentType =
  | "passport"
  | "kimlik_front"
  | "kimlik_back";

export type UploadedPartnerDocument = {
  documentType:
    PartnerDocumentType;

  storagePath: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
};

export type PartnerPriceResponse = {
  success?: boolean;
  available?: boolean;

  age?: number | null;

  duration?: 1 | 2;

  price?: number | null;

  error?: string;
};

export type PartnerUploadUrlResponse = {
  success?: boolean;

  uploadSessionId?: string;

  documentType?:
    PartnerDocumentType;

  storagePath?: string;

  token?: string;

  error?: string;
};

export type PartnerCreateRequestResponse = {
  success?: boolean;

  requestId?: string;
  requestCode?: string;

  status?: string;

  source?: "partner";

  calculatedAge?: number;
  calculatedPrice?: number;

  duration?: 1 | 2;

  hasKimlik?: boolean;

  insuranceStartDate?:
    string | null;

  error?: string;
};