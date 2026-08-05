"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  InsuranceRequestData,
} from "@/types/insuranceRequest";

type InsuranceRequestContextValue = {
  requestData: InsuranceRequestData;
  updateRequestData: (
    values: Partial<InsuranceRequestData>,
  ) => void;
  resetRequestData: () => void;
};

const initialRequestData: InsuranceRequestData = {
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

  kimlikNumber: "",
  kimlikExpirationDate: "",
  passportNumber: "",

  duration: 1,
  calculatedAge: null,
  calculatedPrice: null,

  passportFile: null,
  kimlikFrontFile: null,
  kimlikBackFile: null,

  paymentReceiptFile: null,
};

const InsuranceRequestContext =
  createContext<InsuranceRequestContextValue | null>(
    null,
  );

type InsuranceRequestProviderProps = {
  children: ReactNode;
};

export function InsuranceRequestProvider({
  children,
}: InsuranceRequestProviderProps) {
  const [requestData, setRequestData] =
    useState<InsuranceRequestData>(
      initialRequestData,
    );

  function updateRequestData(
    values: Partial<InsuranceRequestData>,
  ) {
    setRequestData((currentData) => ({
      ...currentData,
      ...values,
    }));
  }

  function resetRequestData() {
    setRequestData(initialRequestData);
  }

  const contextValue = useMemo(
    () => ({
      requestData,
      updateRequestData,
      resetRequestData,
    }),
    [requestData],
  );

  return (
    <InsuranceRequestContext.Provider
      value={contextValue}
    >
      {children}
    </InsuranceRequestContext.Provider>
  );
}

export function useInsuranceRequest() {
  const context = useContext(
    InsuranceRequestContext,
  );

  if (!context) {
    throw new Error(
      "useInsuranceRequest doit être utilisé dans InsuranceRequestProvider.",
    );
  }

  return context;
}