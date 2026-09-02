import type {
  PartnerRequestFormData,
} from "./partnerRequestTypes";

export const initialPartnerRequestData:
  PartnerRequestFormData = {
  lastName: "",
  firstName: "",
  fatherName: "",
  birthDate: "",

  gender: "",
  nationality: "",

  whatsappCountryCode: "+90",
  whatsappNumber: "",

  address: {
    provinceId: "",
    districtId: "",
    neighborhoodId: "",
    street: "",
    buildingNumber: "",
    apartmentNumber: "",
  },

  hasKimlik: false,

  kimlikNumber: "",
  kimlikExpirationDate: "",

  insuranceStartDate: "",

  passportNumber: "",

  duration: 1,

  passportFile: null,
  kimlikFrontFile: null,
  kimlikBackFile: null,

  calculatedAge: null,
  calculatedPrice: null,
};