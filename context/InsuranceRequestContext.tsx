"use client";
import { createContext, ReactNode, useContext, useEffect, useMemo, useReducer, useCallback, useState, } from "react";
import type { InsuranceRequestData, } from "@/types/insuranceRequest";
const STORAGE_KEY = "if-sigorta-insurance-request";
type PendingCancellation = {
    requestId: string;
    requestCode: string;
    whatsappCountryCode: string;
    whatsappNumber: string;
};
type InsuranceRequestContextValue = {
    requestData: InsuranceRequestData;
    pendingCancellation: PendingCancellation | null;
    updateRequestData: (values: Partial<InsuranceRequestData>) => void;
    clearPendingCancellation: () => void;
    resetRequestData: () => void;
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
type StoredRequestData = Omit<InsuranceRequestData, "passportFile" | "kimlikFrontFile" | "kimlikBackFile" | "paymentReceiptFile">;
type StoredSessionData = {
    requestData: StoredRequestData;
    pendingCancellation: PendingCancellation | null;
};
type RestoredSessionData = {
    requestData: InsuranceRequestData;
    pendingCancellation: PendingCancellation | null;
};
/*
 * ============================
 * DONNÉES À SAUVEGARDER
 * ============================
 *
 * Les objets File ne peuvent pas
 * être sérialisés dans sessionStorage.
 */
function createStoredRequestData(requestData: InsuranceRequestData): StoredRequestData {
    return {
        requestId: requestData.requestId,
        requestCode: requestData.requestCode,
        lastName: requestData.lastName,
        firstName: requestData.firstName,
        fatherName: requestData.fatherName,
        birthDate: requestData.birthDate,
        gender: requestData.gender,
        nationality: requestData.nationality,
        whatsappCountryCode: requestData.whatsappCountryCode,
        whatsappNumber: requestData.whatsappNumber,
        address: {
            ...requestData.address,
        },
        hasKimlik: requestData.hasKimlik,
        kimlikNumber: requestData.kimlikNumber,
        kimlikExpirationDate: requestData.kimlikExpirationDate,
        insuranceStartDate: requestData.insuranceStartDate,
        passportNumber: requestData.passportNumber,
        duration: requestData.duration,
        calculatedAge: requestData.calculatedAge,
        calculatedPrice: requestData.calculatedPrice,
    };
}
/*
 * ============================
 * RESTAURATION
 * ============================
 */
function restoreSessionData(): RestoredSessionData {
    if (typeof window ===
        "undefined") {
        return {
            requestData: initialRequestData,
            pendingCancellation: null,
        };
    }
    try {
        const savedValue = window.sessionStorage.getItem(STORAGE_KEY);
        if (!savedValue) {
            return {
                requestData: initialRequestData,
                pendingCancellation: null,
            };
        }
        const parsedValue = JSON.parse(savedValue) as Partial<StoredSessionData> | Partial<StoredRequestData>;
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
        const hasNewStructure = typeof parsedValue ===
            "object" &&
            parsedValue !== null &&
            "requestData" in
                parsedValue;
        const storedRequestData = hasNewStructure
            ? ((parsedValue as Partial<StoredSessionData>).requestData ??
                {})
            : (parsedValue as Partial<StoredRequestData>);
        const storedPendingCancellation = hasNewStructure
            ? ((parsedValue as Partial<StoredSessionData>).pendingCancellation ??
                null)
            : null;
        return {
            requestData: {
                ...initialRequestData,
                ...storedRequestData,
                address: {
                    ...initialRequestData.address,
                    ...(storedRequestData.address ??
                        {}),
                },
                /*
                 * Les fichiers doivent être
                 * sélectionnés à nouveau
                 * après actualisation.
                 */
                passportFile: null,
                kimlikFrontFile: null,
                kimlikBackFile: null,
                paymentReceiptFile: null,
            },
            pendingCancellation: storedPendingCancellation,
        };
    }
    catch (error) {
        console.error("Impossible de restaurer la demande d’assurance :", error);
        return {
            requestData: initialRequestData,
            pendingCancellation: null,
        };
    }
}
/*
 * ============================
 * COMPARAISON DES MODIFICATIONS
 * ============================
 */
function valueHasChanged(currentData: InsuranceRequestData, values: Partial<InsuranceRequestData>, field: keyof InsuranceRequestData): boolean {
    if (!Object.prototype.hasOwnProperty.call(values, field)) {
        return false;
    }
    /*
     * Adresse :
     * comparaison du résultat fusionné.
     */
    if (field ===
        "address") {
        const nextAddress = {
            ...currentData.address,
            ...(values.address ?? {}),
        };
        return (JSON.stringify(nextAddress) !==
            JSON.stringify(currentData.address));
    }
    /*
     * Les objets File sont comparés
     * par référence.
     */
    if (field ===
        "passportFile" ||
        field ===
            "kimlikFrontFile" ||
        field ===
            "kimlikBackFile") {
        return (currentData[field] !==
            values[field]);
    }
    return (currentData[field] !==
        values[field]);
}
type SessionAction = {
    type: "restore";
    value: RestoredSessionData;
} | {
    type: "update";
    values: Partial<InsuranceRequestData>;
} | {
    type: "clear";
} | {
    type: "reset";
};
function sessionReducer(state: RestoredSessionData, action: SessionAction): RestoredSessionData {
    if (action.type === "restore")
        return action.value;
    if (action.type === "clear")
        return { ...state, pendingCancellation: null };
    if (action.type === "reset")
        return { requestData: initialRequestData, pendingCancellation: null };
    const currentData = state.requestData, values = action.values;
    const dossierFields: Array<keyof InsuranceRequestData> = ["lastName", "firstName", "fatherName", "birthDate", "gender", "nationality", "whatsappCountryCode", "whatsappNumber", "address", "hasKimlik", "kimlikNumber", "kimlikExpirationDate", "insuranceStartDate", "passportNumber", "duration", "calculatedAge", "calculatedPrice", "passportFile", "kimlikFrontFile", "kimlikBackFile"];
    const dossierWasModified = Boolean(currentData.requestId && currentData.requestCode && dossierFields.some(field => valueHasChanged(currentData, values, field)));
    const pendingCancellation = dossierWasModified && !state.pendingCancellation ? { requestId: currentData.requestId, requestCode: currentData.requestCode, whatsappCountryCode: currentData.whatsappCountryCode, whatsappNumber: currentData.whatsappNumber } : state.pendingCancellation;
    return { pendingCancellation, requestData: { ...currentData, ...values, address: values.address ? { ...currentData.address, ...values.address } : currentData.address, requestId: dossierWasModified ? "" : values.requestId ?? currentData.requestId, requestCode: dossierWasModified ? "" : values.requestCode ?? currentData.requestCode } };
}
const InsuranceRequestContext = createContext<InsuranceRequestContextValue | null>(null);
type InsuranceRequestProviderProps = {
    children: ReactNode;
};
export function InsuranceRequestProvider({ children }: InsuranceRequestProviderProps) {
    const [session, dispatch] = useReducer(sessionReducer, { requestData: initialRequestData, pendingCancellation: null });
    const [hydrationCompleted, setHydrationCompleted] = useState(false);
    useEffect(() => {
        // Restore external browser storage after hydration; do not render a mismatched server snapshot.
        const restored = restoreSessionData();
        queueMicrotask(() => { dispatch({ type: "restore", value: restored }); setHydrationCompleted(true); });
    }, []);
    useEffect(() => {
        if (!hydrationCompleted)
            return;
        try {
            window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ requestData: createStoredRequestData(session.requestData), pendingCancellation: session.pendingCancellation }));
        }
        catch { /* Browsers may disable session storage. The in-memory request remains usable. */ }
    }, [session, hydrationCompleted]);
    const updateRequestData = useCallback((values: Partial<InsuranceRequestData>) => dispatch({ type: "update", values }), []);
    const clearPendingCancellation = useCallback(() => dispatch({ type: "clear" }), []);
    const resetRequestData = useCallback(() => dispatch({ type: "reset" }), []);
    const contextValue = useMemo(() => ({ ...session, updateRequestData, clearPendingCancellation, resetRequestData }), [session, updateRequestData, clearPendingCancellation, resetRequestData]);
    return <InsuranceRequestContext.Provider value={contextValue}>{children}</InsuranceRequestContext.Provider>;
}
export function useInsuranceRequest() {
    const context = useContext(InsuranceRequestContext);
    if (!context) {
        throw new Error("useInsuranceRequest doit être utilisé dans InsuranceRequestProvider.");
    }
    return context;
}
