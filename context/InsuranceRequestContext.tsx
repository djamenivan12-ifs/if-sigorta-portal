"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  InsuranceRequestData,
} from "@/types/insuranceRequest";

const STORAGE_KEY =
  "if-sigorta-insurance-request";

type PendingCancellation = {
  requestId: string;
  requestCode: string;
  whatsappCountryCode: string;
  whatsappNumber: string;
};

type InsuranceRequestContextValue = {
  requestData: InsuranceRequestData;

  pendingCancellation:
    PendingCancellation | null;

  updateRequestData: (
    values: Partial<InsuranceRequestData>,
  ) => void;

  clearPendingCancellation:
    () => void;

  resetRequestData:
    () => void;
};

const initialRequestData: InsuranceRequestData = {
  requestId: "",
  requestCode: "",

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

  hasKimlik: true,

  kimlikNumber: "",
  kimlikExpirationDate: "",

  insuranceStartDate: "",

  passportNumber: "",

  duration: 1,
  calculatedAge: null,
  calculatedPrice: null,

  passportFile: null,
  kimlikFrontFile: null,
  kimlikBackFile: null,

  paymentReceiptFile: null,
};

type StoredRequestData = Omit<
  InsuranceRequestData,
  | "passportFile"
  | "kimlikFrontFile"
  | "kimlikBackFile"
  | "paymentReceiptFile"
>;

type StoredSessionData = {
  requestData: StoredRequestData;

  pendingCancellation:
    PendingCancellation | null;
};

type RestoredSessionData = {
  requestData: InsuranceRequestData;

  pendingCancellation:
    PendingCancellation | null;
};

/*
 * ============================
 * DONNÉES À SAUVEGARDER
 * ============================
 *
 * Les objets File ne peuvent pas
 * être sérialisés dans sessionStorage.
 */

function createStoredRequestData(
  requestData: InsuranceRequestData,
): StoredRequestData {
  return {
    requestId:
      requestData.requestId,

    requestCode:
      requestData.requestCode,

    lastName:
      requestData.lastName,

    firstName:
      requestData.firstName,

    fatherName:
      requestData.fatherName,

    birthDate:
      requestData.birthDate,

    gender:
      requestData.gender,

    nationality:
      requestData.nationality,

    whatsappCountryCode:
      requestData.whatsappCountryCode,

    whatsappNumber:
      requestData.whatsappNumber,

    address: {
      ...requestData.address,
    },

    hasKimlik:
      requestData.hasKimlik,

    kimlikNumber:
      requestData.kimlikNumber,

    kimlikExpirationDate:
      requestData.kimlikExpirationDate,

    insuranceStartDate:
      requestData.insuranceStartDate,

    passportNumber:
      requestData.passportNumber,

    duration:
      requestData.duration,

    calculatedAge:
      requestData.calculatedAge,

    calculatedPrice:
      requestData.calculatedPrice,
  };
}

/*
 * ============================
 * RESTAURATION
 * ============================
 */

function restoreSessionData():
  RestoredSessionData {
  if (
    typeof window ===
    "undefined"
  ) {
    return {
      requestData:
        initialRequestData,

      pendingCancellation:
        null,
    };
  }

  try {
    const savedValue =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      );

    if (!savedValue) {
      return {
        requestData:
          initialRequestData,

        pendingCancellation:
          null,
      };
    }

    const parsedValue =
      JSON.parse(
        savedValue,
      ) as
        | Partial<StoredSessionData>
        | Partial<StoredRequestData>;

    /*
     * Compatibilité avec l'ancienne
     * version du sessionStorage.
     *
     * Ancienne structure :
     * {
     *   requestId,
     *   requestCode,
     *   lastName,
     *   ...
     * }
     *
     * Nouvelle structure :
     * {
     *   requestData: {...},
     *   pendingCancellation: {...}
     * }
     */

    const hasNewStructure =
      typeof parsedValue ===
        "object" &&
      parsedValue !== null &&
      "requestData" in
        parsedValue;

    const storedRequestData =
      hasNewStructure
        ? (
            (
              parsedValue as
                Partial<StoredSessionData>
            ).requestData ??
            {}
          )
        : (
            parsedValue as
              Partial<StoredRequestData>
          );

    const storedPendingCancellation =
      hasNewStructure
        ? (
            (
              parsedValue as
                Partial<StoredSessionData>
            ).pendingCancellation ??
            null
          )
        : null;

    return {
      requestData: {
        ...initialRequestData,

        ...storedRequestData,

        address: {
          ...initialRequestData.address,

          ...(
            storedRequestData.address ??
            {}
          ),
        },

        /*
         * Les fichiers doivent être
         * sélectionnés à nouveau
         * après actualisation.
         */

        passportFile:
          null,

        kimlikFrontFile:
          null,

        kimlikBackFile:
          null,

        paymentReceiptFile:
          null,
      },

      pendingCancellation:
        storedPendingCancellation,
    };
  } catch (error) {
    console.error(
      "Impossible de restaurer la demande d’assurance :",
      error,
    );

    return {
      requestData:
        initialRequestData,

      pendingCancellation:
        null,
    };
  }
}

/*
 * ============================
 * COMPARAISON DES MODIFICATIONS
 * ============================
 */

function valueHasChanged(
  currentData: InsuranceRequestData,
  values: Partial<InsuranceRequestData>,
  field: keyof InsuranceRequestData,
): boolean {
  if (
    !Object.prototype.hasOwnProperty.call(
      values,
      field,
    )
  ) {
    return false;
  }

  /*
   * Adresse :
   * comparaison du résultat fusionné.
   */

  if (
    field ===
    "address"
  ) {
    const nextAddress = {
      ...currentData.address,

      ...(values.address ?? {}),
    };

    return (
      JSON.stringify(
        nextAddress,
      ) !==
      JSON.stringify(
        currentData.address,
      )
    );
  }

  /*
   * Les objets File sont comparés
   * par référence.
   */

  if (
    field ===
      "passportFile" ||
    field ===
      "kimlikFrontFile" ||
    field ===
      "kimlikBackFile"
  ) {
    return (
      currentData[field] !==
      values[field]
    );
  }

  return (
    currentData[field] !==
    values[field]
  );
}

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
  const [
    requestData,
    setRequestData,
  ] =
    useState<InsuranceRequestData>(
      initialRequestData,
    );

  const [
    pendingCancellation,
    setPendingCancellation,
  ] =
    useState<PendingCancellation | null>(
      null,
    );

  const [
    hydrationCompleted,
    setHydrationCompleted,
  ] =
    useState(false);

  /*
   * ============================
   * RESTAURATION AU CHARGEMENT
   * ============================
   */

  useEffect(() => {
    const restored =
      restoreSessionData();

    setRequestData(
      restored.requestData,
    );

    setPendingCancellation(
      restored.pendingCancellation,
    );

    setHydrationCompleted(
      true,
    );
  }, []);

  /*
   * ============================
   * SAUVEGARDE AUTOMATIQUE
   * ============================
   */

  useEffect(() => {
    if (
      !hydrationCompleted
    ) {
      return;
    }

    try {
      const storedData:
        StoredSessionData = {
          requestData:
            createStoredRequestData(
              requestData,
            ),

          pendingCancellation,
        };

      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          storedData,
        ),
      );
    } catch (error) {
      console.error(
        "Impossible de sauvegarder temporairement la demande d’assurance :",
        error,
      );
    }
  }, [
    hydrationCompleted,
    requestData,
    pendingCancellation,
  ]);

  /*
   * ============================
   * MISE À JOUR DES DONNÉES
   * ============================
   */

  function updateRequestData(
    values: Partial<InsuranceRequestData>,
  ) {
    setRequestData(
      (
        currentData,
      ) => {
        /*
         * Champs dont la modification
         * rend le dossier déjà créé
         * obsolète.
         *
         * paymentReceiptFile est
         * volontairement absent :
         * ajouter un dekont à l'étape 5
         * ne doit jamais invalider
         * requestId/requestCode.
         */

        const dossierFields: Array<
          keyof InsuranceRequestData
        > = [
          "lastName",
          "firstName",
          "fatherName",
          "birthDate",
          "gender",
          "nationality",

          "whatsappCountryCode",
          "whatsappNumber",

          "address",

          "hasKimlik",
          "kimlikNumber",
          "kimlikExpirationDate",

          "insuranceStartDate",

          "passportNumber",

          "duration",
          "calculatedAge",
          "calculatedPrice",

          "passportFile",
          "kimlikFrontFile",
          "kimlikBackFile",
        ];

        const dossierWasModified =
          currentData.requestId !== "" &&
          currentData.requestCode !== "" &&
          dossierFields.some(
            (
              field,
            ) =>
              valueHasChanged(
                currentData,
                values,
                field,
              ),
          );

        /*
         * Avant de retirer la référence
         * du dossier courant, on la
         * sauvegarde afin que l'étape 4
         * puisse l'annuler proprement.
         *
         * Important :
         * on conserve le WhatsApp AVANT
         * modification car la route
         * /cancel vérifie l'identité avec
         * les coordonnées enregistrées
         * sur l'ancien dossier.
         */

        if (
          dossierWasModified
        ) {
          setPendingCancellation(
            (
              currentPending,
            ) => {
              /*
               * Si un dossier attend déjà
               * d'être annulé, on ne perd
               * pas sa référence.
               */

              if (
                currentPending
              ) {
                return currentPending;
              }

              return {
                requestId:
                  currentData.requestId,

                requestCode:
                  currentData.requestCode,

                whatsappCountryCode:
                  currentData.whatsappCountryCode,

                whatsappNumber:
                  currentData.whatsappNumber,
              };
            },
          );
        }

        return {
          ...currentData,
          ...values,

          address:
            values.address
              ? {
                  ...currentData.address,
                  ...values.address,
                }
              : currentData.address,

          /*
           * Si le dossier est devenu
           * obsolète, l'étape 4 devra
           * en créer un nouveau.
           */

          requestId:
            dossierWasModified
              ? ""
              : (
                  values.requestId ??
                  currentData.requestId
                ),

          requestCode:
            dossierWasModified
              ? ""
              : (
                  values.requestCode ??
                  currentData.requestCode
                ),
        };
      },
    );
  }

  /*
   * ============================
   * ANNULATION TERMINÉE
   * ============================
   */

  function clearPendingCancellation() {
    setPendingCancellation(
      null,
    );
  }

  /*
   * ============================
   * RÉINITIALISATION COMPLÈTE
   * ============================
   */

  function resetRequestData() {
    setRequestData(
      initialRequestData,
    );

    setPendingCancellation(
      null,
    );

    if (
      typeof window !==
      "undefined"
    ) {
      window.sessionStorage.removeItem(
        STORAGE_KEY,
      );
    }
  }

  const contextValue =
    useMemo(
      () => ({
        requestData,

        pendingCancellation,

        updateRequestData,

        clearPendingCancellation,

        resetRequestData,
      }),
      [
        requestData,
        pendingCancellation,
      ],
    );

  return (
    <InsuranceRequestContext.Provider
      value={
        contextValue
      }
    >
      {
        children
      }
    </InsuranceRequestContext.Provider>
  );
}

export function useInsuranceRequest() {
  const context =
    useContext(
      InsuranceRequestContext,
    );

  if (!context) {
    throw new Error(
      "useInsuranceRequest doit être utilisé dans InsuranceRequestProvider.",
    );
  }

  return context;
}