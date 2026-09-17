import {prepareDocumentCopy} from "@/lib/insurance/prepareDocumentCopy";
import {day} from "@/lib/accounting/model";
import { verifyStoredDocument } from "@/lib/security/verifyStoredDocument";
import { NextResponse } from "next/server";
import { requireApiPartner } from "@/lib/auth/requireApiPartner";
import { calculatePartnerInsurancePriceServer } from "@/lib/insurance/calculatePriceServer";
import { createServiceClient } from "@/lib/supabase/service";
const BUCKET_NAME = "insurance-documents";
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
type DocumentType = "passport" | "kimlik_front" | "kimlik_back";
type RequestPayload = {
    preferredLanguage: "fr" | "en" | "tr";
    lastName: string;
    firstName: string;
    fatherName: string;
    birthDate: string;
    gender: "male" | "female";
    nationality: string;
    whatsappCountryCode: string;
    whatsappNumber: string;
    address: {
        provinceId: string;
        districtId: string;
        neighborhoodId: string;
        street: string;
        buildingNumber: string;
        apartmentNumber: string;
    };
    hasKimlik: boolean;
    kimlikNumber: string;
    kimlikExpirationDate: string;
    insuranceStartDate: string;
    passportNumber: string;
    duration: 1 | 2;
    calculatedAge?: number;
    calculatedPrice?: number;
};
type UploadedDocumentPayload = {
    documentType: DocumentType;
    storagePath: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
};
type CreateRequestBody = {
    payload?: RequestPayload;
    submissionId?: string;
    uploadSessionId?: string;
    documents?: UploadedDocumentPayload[];
};
type PreparedDocument = {
    documentType: DocumentType;
    sourcePath: string;
    finalPath: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
};
function jsonError(error: string, status: number) {
    return NextResponse.json({
        success: false,
        error,
    }, {
        status,
        headers: {
            "Cache-Control": "no-store",
        },
    });
}
function isDocumentType(value: unknown): value is DocumentType {
    return (value === "passport" || value === "kimlik_front" || value === "kimlik_back");
}
function isValidUploadSessionId(value: unknown): value is string {
    return typeof value === "string" && /^[a-f0-9-]{36}$/i.test(value);
}
function validateUploadedDocument(document: UploadedDocumentPayload, uploadSessionId: string, partnerId: string) {
    if (!document || typeof document !== "object") {
        throw new Error("Document invalide.");
    }
    if (!isDocumentType(document.documentType)) {
        throw new Error("Type de document invalide.");
    }
    if (!document.originalFileName ||
        typeof document.originalFileName !== "string") {
        throw new Error("Nom de fichier manquant.");
    }
    if (!ALLOWED_FILE_TYPES.includes(document.mimeType)) {
        throw new Error(`${document.documentType} : format non accepté. Utilisez PDF, JPG, JPEG ou PNG.`);
    }
    if (!Number.isFinite(document.fileSize) || document.fileSize <= 0) {
        throw new Error(`${document.documentType} : le fichier est vide ou invalide.`);
    }
    if (document.fileSize > MAX_FILE_SIZE) {
        throw new Error(`${document.documentType} : le fichier ne doit pas dépasser 10 Mo.`);
    }
    const expectedPrefix = `pending/partner/${partnerId}/` +
        `${uploadSessionId}/` +
        `${document.documentType}/`;
    if (!document.storagePath ||
        typeof document.storagePath !== "string" ||
        !document.storagePath.startsWith(expectedPrefix)) {
        throw new Error("Chemin de document invalide.");
    }
}
function isValidDate(value: string): boolean {
    if (!value) {
        return false;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return false;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day);
}
function getTodayDate(): string {
    return day(new Date().toISOString());
}
function generateRequestCode(): string {
    const year = new Date().getFullYear();
    const randomPart = crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 8)
        .toUpperCase();
    return `IF-${year}-${randomPart}`;
}
function buildFinalStoragePath(requestId: string, document: UploadedDocumentPayload) {
    const fileName = document.storagePath.split("/").pop() ||
        `${Date.now()}-${crypto.randomUUID()}`;
    return `${requestId}/` + `${document.documentType}/` + `${crypto.randomUUID()}-${fileName}`;
}
export async function POST(request: Request) {
    const auth = await requireApiPartner();
    if (!auth.success) {
        return auth.response;
    }
    const partner = auth.partner;
    const authenticatedUser = auth.user;
    const serviceClient = createServiceClient();

    const pendingStoragePaths: string[] = [];
    const movedStoragePaths: string[] = [];
    try {
        const body = (await request.json()) as CreateRequestBody;
        const submissionId=body.submissionId;
        if(!isValidUploadSessionId(submissionId))return jsonError("Identifiant de soumission invalide.",400);
        const canonical=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
        const {data:prior,error:priorError}=await serviceClient.from("partner_submission_operations").select("actor_id,payload,result").eq("partner_id",partner.id).eq("submission_id",submissionId).maybeSingle();
        if(priorError)return jsonError("La mise à jour de la base est nécessaire pour créer ce dossier.",503);
        if(prior){if(prior.actor_id!==authenticatedUser.id||canonical(prior.payload)!==canonical(body.payload))return jsonError("Cette soumission a changé.",409);return NextResponse.json(prior.result,{status:201,headers:{"Cache-Control":"no-store"}});}
        const payload = body.payload;
        const uploadSessionId = body.uploadSessionId;
        const documents = Array.isArray(body.documents) ? body.documents : [];
        if (!payload) {
            return jsonError("Les données de la demande sont absentes.", 400);
        }
        if (!isValidUploadSessionId(uploadSessionId)) {
            return jsonError("La session de téléversement est invalide.", 400);
        }
        for (const document of documents) {
            validateUploadedDocument(document, uploadSessionId, partner.id);
            pendingStoragePaths.push(document.storagePath);
        }
        const documentTypes = documents.map((document) => document.documentType);
        if (new Set(documentTypes).size !== documentTypes.length) {
            return jsonError("Un même type de document a été envoyé plusieurs fois.", 400);
        }
        const passportDocument = documents.find((document) => document.documentType === "passport");
        const kimlikFrontDocument = documents.find((document) => document.documentType === "kimlik_front");
        const kimlikBackDocument = documents.find((document) => document.documentType === "kimlik_back");
        if (!passportDocument) {
            return jsonError("Le passeport est obligatoire.", 400);
        }
        if (payload.hasKimlik && (!kimlikFrontDocument || !kimlikBackDocument)) {
            return jsonError("Le Kimlik recto et le Kimlik verso sont obligatoires.", 400);
        }
        if (!payload.hasKimlik && (kimlikFrontDocument || kimlikBackDocument)) {
            return jsonError("Les documents Kimlik ne sont pas attendus pour ce dossier.", 400);
        }
        const preferredLanguage = payload.preferredLanguage === "en" || payload.preferredLanguage === "tr"
            ? payload.preferredLanguage
            : "fr";
        const lastName = payload.lastName?.trim().toLocaleUpperCase("fr-FR") ?? "";
        const firstName = payload.firstName?.trim().toLocaleUpperCase("fr-FR") ?? "";
        const fatherName = payload.fatherName?.trim().toLocaleUpperCase("fr-FR") ?? "";
        const nationality = payload.nationality?.trim() ?? "";
        const whatsappCountryCode = payload.whatsappCountryCode?.trim() ?? "";
        const whatsappNumber = payload.whatsappNumber?.replace(/\D/g, "") ?? "";
        const passportNumber = payload.passportNumber?.trim().toUpperCase() ?? "";
        if (!lastName ||
            !firstName ||
            !fatherName ||
            !payload.birthDate ||
            !payload.gender ||
            !nationality ||
            !whatsappCountryCode ||
            !whatsappNumber ||
            !passportNumber) {
            return jsonError("Certaines informations obligatoires sont absentes.", 400);
        }
        if (payload.gender !== "male" && payload.gender !== "female") {
            return jsonError("Le sexe renseigné est invalide.", 400);
        }
        if (payload.duration !== 1 && payload.duration !== 2) {
            return jsonError("La durée de l’assurance est invalide.", 400);
        }
        if (!isValidDate(payload.birthDate)) {
            return jsonError("La date de naissance est invalide.", 400);
        }
        const serverPriceResult = await calculatePartnerInsurancePriceServer(partner.id, payload.birthDate, payload.duration);
        if (!serverPriceResult ||
            !serverPriceResult.available ||
            serverPriceResult.price === null) {
            return jsonError("Le tarif partenaire n’est pas disponible pour cet âge.", 400);
        }
        const calculatedAge = serverPriceResult.age;
        const calculatedPrice = serverPriceResult.price;
        if (!payload.address?.provinceId ||
            !payload.address?.districtId ||
            !payload.address?.neighborhoodId ||
            !payload.address?.street?.trim() ||
            !payload.address?.buildingNumber?.trim()) {
            return jsonError("L’adresse complète est obligatoire.", 400);
        }
        const provinceId = Number(payload.address.provinceId);
        const districtId = Number(payload.address.districtId);
        const neighborhoodId = Number(payload.address.neighborhoodId);
        if (!Number.isInteger(provinceId) ||
            provinceId <= 0 ||
            !Number.isInteger(districtId) ||
            districtId <= 0 ||
            !Number.isInteger(neighborhoodId) ||
            neighborhoodId <= 0) {
            return jsonError("L’adresse renseignée est invalide.", 400);
        }
        let normalizedKimlikNumber = "";
        if (payload.hasKimlik) {
            normalizedKimlikNumber = payload.kimlikNumber?.replace(/\D/g, "") ?? "";
            if (!/^\d{11}$/.test(normalizedKimlikNumber)) {
                return jsonError("Le numéro de Kimlik doit contenir exactement 11 chiffres.", 400);
            }
            if (!payload.kimlikExpirationDate) {
                return jsonError("La date d’expiration du Kimlik est obligatoire.", 400);
            }
            if (!isValidDate(payload.kimlikExpirationDate)) {
                return jsonError("La date d’expiration du Kimlik est invalide.", 400);
            }
        }
        else {
            if (!payload.insuranceStartDate) {
                return jsonError("La date souhaitée de début de l’assurance est obligatoire.", 400);
            }
            if (!isValidDate(payload.insuranceStartDate)) {
                return jsonError("La date souhaitée de début de l’assurance est invalide.", 400);
            }
            if (payload.insuranceStartDate < getTodayDate()) {
                return jsonError("La date souhaitée de début de l’assurance ne peut pas être dans le passé.", 400);
            }
        }
        let requestCode = "";
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const candidate = generateRequestCode();
            const { data: existingRequest, error: existingRequestError } = await serviceClient
                .from("insurance_requests")
                .select("id")
                .eq("request_code", candidate)
                .maybeSingle();
            if (existingRequestError) {
                throw new Error(existingRequestError.message);
            }
            if (!existingRequest) {
                requestCode = candidate;
                break;
            }
        }
        if (!requestCode) {
            throw new Error("Impossible de générer un code de dossier unique.");
        }
        let existingClientId: string | null = null;
        let identityRequestQuery = serviceClient
            .from("insurance_requests")
            .select(`
            id,
            client_id
          `)
            .order("created_at", {
            ascending: false,
        })
            .limit(10);
        if (payload.hasKimlik && normalizedKimlikNumber) {
            identityRequestQuery = identityRequestQuery.eq("kimlik_number", normalizedKimlikNumber);
        }
        else {
            identityRequestQuery = identityRequestQuery.eq("passport_number", passportNumber);
        }
        const { data: identityRequests, error: identityRequestError } = await identityRequestQuery;
        if (identityRequestError) {
            throw new Error(`Recherche du client existant impossible : ${identityRequestError.message}`);
        }
        for (const identityRequest of identityRequests ?? []) {
            if (!identityRequest.client_id) {
                continue;
            }
            const { data: existingClient, error: existingClientError } = await serviceClient
                .from("clients")
                .select(`
              id,
              first_name,
              last_name,
              birth_date
            `)
                .eq("id", identityRequest.client_id)
                .maybeSingle();
            if (existingClientError) {
                throw new Error(existingClientError.message);
            }
            if (!existingClient) {
                continue;
            }
            const sameFirstName = (existingClient.first_name ?? "").trim().toLocaleUpperCase("fr-FR") ===
                firstName;
            const sameLastName = (existingClient.last_name ?? "").trim().toLocaleUpperCase("fr-FR") ===
                lastName;
            const sameBirthDate = existingClient.birth_date === payload.birthDate;
            if (sameFirstName && sameLastName && sameBirthDate) {
                existingClientId = existingClient.id;
                break;
            }
        }
        const clientFields={
                last_name: lastName,
                first_name: firstName,
                father_name: fatherName,
                birth_date: payload.birthDate,
                gender: payload.gender,
                nationality,
                whatsapp_country_code: whatsappCountryCode,
                whatsapp_number: whatsappNumber,
                province_id: provinceId,
                district_id: districtId,
                neighborhood_id: neighborhoodId,
                street: payload.address.street.trim(),
                building_number: payload.address.buildingNumber.trim(),
                apartment_number: payload.address.apartmentNumber?.trim() || null,
            };
        const requestFields={
            quote_nationality:nationality,
            request_code: requestCode,

            source: "partner",
            partner_id: partner.id,
            preferred_language: preferredLanguage,
            has_kimlik: payload.hasKimlik,
            kimlik_number: payload.hasKimlik ? normalizedKimlikNumber : null,
            kimlik_expiration_date: payload.hasKimlik
                ? payload.kimlikExpirationDate
                : null,
            insurance_start_date: payload.hasKimlik
                ? null
                : payload.insuranceStartDate,
            passport_number: passportNumber,
            insurance_duration_years: payload.duration,
            calculated_age: calculatedAge,
            calculated_price: calculatedPrice,
            status: "waiting_payment",
        };
        const geo=await Promise.all([serviceClient.from("provinces").select("name").eq("id",provinceId).maybeSingle(),serviceClient.from("districts").select("name").eq("id",districtId).eq("province_id",provinceId).maybeSingle(),serviceClient.from("neighborhoods").select("name").eq("id",neighborhoodId).eq("district_id",districtId).maybeSingle()]);
        if(geo.some(result=>result.error))return jsonError("L’adresse ne peut pas être vérifiée. Réessayez.",503);
        if(geo.some(result=>!result.data))return jsonError("La province, le district et le quartier ne correspondent pas.",400);
        const clientSnapshot={...clientFields,province_name:geo[0].data!.name,district_name:geo[1].data!.name,neighborhood_name:geo[2].data!.name};
        const insuranceRequest={id:submissionId,request_code:requestCode};
        const preparedDocuments: PreparedDocument[] = [];
        for (const document of documents) {
            const finalPath = buildFinalStoragePath(insuranceRequest.id, document);
            const actual=await verifyStoredDocument(serviceClient, BUCKET_NAME, document.storagePath);
            if(actual.mimeType!==document.mimeType||actual.fileSize!==document.fileSize)throw Error("Les informations du fichier ne correspondent pas au document.");
            await prepareDocumentCopy(serviceClient,document.storagePath,finalPath,insuranceRequest.id);
            const { error: moveError } = await serviceClient.storage
                .from(BUCKET_NAME)
                .copy(document.storagePath, finalPath);
            if (moveError) {
                throw new Error(`Déplacement impossible pour ${document.documentType} : ${moveError.message}`);
            }
            movedStoragePaths.push(finalPath);
            const pendingIndex = pendingStoragePaths.indexOf(document.storagePath);
            if (pendingIndex !== -1) {
                pendingStoragePaths.splice(pendingIndex, 1);
            }
            preparedDocuments.push({
                documentType: document.documentType,
                sourcePath: document.storagePath,
                finalPath,
                originalFileName: document.originalFileName,
                mimeType: document.mimeType,
                fileSize: document.fileSize,
            });
        }
        const documentRows = preparedDocuments.map((document) => ({
            request_id: insuranceRequest.id,
            document_type: document.documentType,
            storage_path: document.finalPath,
            original_file_name: document.originalFileName,
            mime_type: document.mimeType,
            file_size: document.fileSize,
            uploaded_at: new Date().toISOString(),
        }));
        movedStoragePaths.length=0;pendingStoragePaths.length=0;
        const {data:adopted,error:adoptError}=await serviceClient.rpc("create_partner_request",{p_partner_id:partner.id,p_actor_id:authenticatedUser.id,p_submission_id:submissionId,p_payload:payload,p_client:clientSnapshot,p_existing_client_id:existingClientId,p_request:requestFields,p_documents:documentRows});
        if(adoptError){movedStoragePaths.length=0;pendingStoragePaths.length=0;return jsonError(adoptError.code==="40001"?"Le dossier a changé. Réessayez.":"Le dossier n’a pas pu être enregistré. Réessayez.",adoptError.code==="40001"?409:500);}
        movedStoragePaths.length = 0;
        pendingStoragePaths.length = 0;
        return NextResponse.json({
            ...adopted,
            success: true,
            requestId: insuranceRequest.id,
            requestCode: adopted.requestCode,
            status: "waiting_payment",
            source: "partner",
            calculatedAge,
            calculatedPrice,
            duration: payload.duration,
            hasKimlik: payload.hasKimlik,
            insuranceStartDate: payload.hasKimlik
                ? null
                : payload.insuranceStartDate,
        }, {
            status: 201,
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("Erreur de création du dossier partenaire :", error);
        if (movedStoragePaths.length > 0) {
            const { error: movedCleanupError } = await serviceClient.storage
                .from(BUCKET_NAME)
                .remove(movedStoragePaths);
            if (movedCleanupError) {
                console.error("Nettoyage des fichiers déplacés impossible :", movedCleanupError);
            }
        }
        return NextResponse.json({
            success: false,
            error: error instanceof Error
                ? error.message
                : "Une erreur inattendue est survenue.",
        }, {
            status: 500,
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
}
