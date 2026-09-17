import {prepareDocumentCopy} from "@/lib/insurance/prepareDocumentCopy";
import {processOutbox} from "@/lib/notifications/processOutbox";
import { isValidDate } from "@/lib/validation/date";
import { verifyStoredDocument } from "@/lib/security/verifyStoredDocument";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
const BUCKET_NAME = "insurance-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
type PolicyYear = 1 | 2;
type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};
type PendingPolicyPayload = {
    path?: string;
    originalFileName?: string;
    mimeType?: string;
    fileSize?: number;
};
type PolicyPayload = {
    operationId?:string;
    policyStartDate?: string;
    policyEndDate?: string;
    policyYear1?: PendingPolicyPayload | null;
    policyYear2?: PendingPolicyPayload | null;
};
type PreparedPolicy = {
    policyYear: PolicyYear;
    pendingPath: string;
    finalPath: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
};
function sanitizeFileName(fileName: string): string {
    const sanitized = fileName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
    return (sanitized ||
        "insurance-policy.pdf");
}
async function removeStoragePaths(serviceClient: ReturnType<typeof createServiceClient>, storagePaths: string[]) {
    const uniqueStoragePaths = Array.from(new Set(storagePaths.filter((storagePath) => typeof storagePath ===
        "string" &&
        storagePath.trim() !==
            "")));
    if (uniqueStoragePaths.length ===
        0) {
        return;
    }
    const { error } = await serviceClient.storage
        .from(BUCKET_NAME)
        .remove(uniqueStoragePaths);
    if (error) {
        console.error("Suppression de fichiers Storage impossible :", error);
    }
}
function validatePendingPolicy({ requestId, policyYear, payload, insuranceDurationYears, }: {
    requestId: string;
    policyYear: PolicyYear;
    payload: PendingPolicyPayload;
    insuranceDurationYears: 1 | 2;
}): {
    pendingPath: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
} {
    if (policyYear === 2 &&
        insuranceDurationYears !== 2) {
        throw new Error("Ce dossier couvre seulement un an. La police de l’année 2 n’est pas autorisée.");
    }
    const pendingPath = payload.path?.trim() ??
        "";
    const originalFileName = payload.originalFileName
        ?.trim() ??
        "";
    const mimeType = payload.mimeType
        ?.trim()
        .toLowerCase() ??
        "";
    const fileSize = Number(payload.fileSize);
    if (!pendingPath) {
        throw new Error(`Police année ${policyYear} : chemin du fichier absent.`);
    }
    const expectedPrefix = `pending/admin/policy/${requestId}/year_${policyYear}/`;
    if (!pendingPath.startsWith(expectedPrefix)) {
        throw new Error(`Police année ${policyYear} : chemin Storage invalide.`);
    }
    if (!originalFileName) {
        throw new Error(`Police année ${policyYear} : nom du fichier absent.`);
    }
    const isPdf = mimeType ===
        "application/pdf" ||
        originalFileName
            .toLowerCase()
            .endsWith(".pdf");
    if (!isPdf) {
        throw new Error(`Police année ${policyYear} : seuls les fichiers PDF sont acceptés.`);
    }
    if (!Number.isFinite(fileSize) ||
        fileSize <= 0) {
        throw new Error(`Police année ${policyYear} : le fichier PDF est vide ou invalide.`);
    }
    if (fileSize >
        MAX_FILE_SIZE) {
        throw new Error(`Police année ${policyYear} : le fichier ne doit pas dépasser 10 Mo.`);
    }
    return {
        pendingPath,
        originalFileName,
        mimeType: "application/pdf",
        fileSize,
    };
}
async function verifyStorageObject(serviceClient: ReturnType<typeof createServiceClient>, storagePath: string) { return verifyStoredDocument(serviceClient, BUCKET_NAME, storagePath, true); }
export async function POST(request: Request, context: RouteContext) {
    const serviceClient = createServiceClient();
    const cleanupFinalPaths = new Set<string>();
    const cleanupPendingPaths = new Set<string>();
    try {
        const sessionClient = await createServerSupabaseClient();
        const { data: { user, }, error: userError, } = await sessionClient.auth.getUser();
        if (userError ||
            !user) {
            return NextResponse.json({
                success: false,
                error: "Vous devez être connecté.",
            }, {
                status: 401,
                headers: {
                    "Cache-Control": "no-store",
                },
            });
        }
        const role = user.app_metadata?.role;
        if (role !== "agent" &&
            role !== "admin") {
            return NextResponse.json({
                success: false,
                error: "Vous n’avez pas l’autorisation de déposer une police.",
            }, {
                status: 403,
                headers: {
                    "Cache-Control": "no-store",
                },
            });
        }
        const { id } = await context.params;
        if (!id) {
            return NextResponse.json({
                success: false,
                error: "Identifiant du dossier absent.",
            }, {
                status: 400,
                headers: {
                    "Cache-Control": "no-store",
                },
            });
        }
        const { data: insuranceRequest, error: requestError, } = await serviceClient
            .from("insurance_requests")
            .select(`
            id,
            request_code,
            source,
            partner_id,
            status,
            preferred_language,
            insurance_duration_years,
            client_id,
            assigned_agent_id,
            policy_start_date,
            policy_end_date,
            updated_at,

            client:clients (
              first_name,
              whatsapp_country_code,
              whatsapp_number
            )
          `)
            .eq("id", id)
            .maybeSingle();
        if (requestError) {
            throw new Error(requestError.message);
        }
        if (!insuranceRequest) {
            return NextResponse.json({
                success: false,
                error: "Dossier introuvable.",
            }, {
                status: 404,
                headers: {
                    "Cache-Control": "no-store",
                },
            });
        }
        if (role === "agent" &&
            insuranceRequest
                .assigned_agent_id !==
                user.id) {
            return NextResponse.json({
                success: false,
                error: insuranceRequest
                    .assigned_agent_id
                    ? "Ce dossier est attribué à un autre agent."
                    : "Vous devez d’abord prendre en charge ce dossier.",
            }, {
                status: 403,
                headers: {
                    "Cache-Control": "no-store",
                },
            });
        }
        const insuranceDurationYears: 1 | 2 = insuranceRequest
            .insurance_duration_years ===
            2
            ? 2
            : 1;
        const isDirectRequest = insuranceRequest.source ===
            "direct";
        const isPartnerRequest = insuranceRequest.source ===
            "partner" &&
            Boolean(insuranceRequest.partner_id);
        let body: PolicyPayload;
        try {
            body =
                (await request.json()) as PolicyPayload;
        }
        catch {
            return NextResponse.json({
                success: false,
                error: "Requête invalide.",
            }, {
                status: 400,
                headers: {
                    "Cache-Control": "no-store",
                },
            });
        }
        if(typeof body.operationId!=="string"||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.operationId))return NextResponse.json({success:false,error:"Identifiant d’opération invalide."},{status:400});
        const {data:prior,error:priorError}=await serviceClient.from("workflow_operations").select("actor_id,payload,result").eq("request_id",id).eq("operation_key","policy:"+body.operationId).maybeSingle();
        if(priorError)return NextResponse.json({success:false,error:"La mise à jour de la base est nécessaire."},{status:503});
        if(prior){
         const normalized={start:body.policyStartDate?.trim(),end:body.policyEndDate?.trim(),policies:([body.policyYear1,body.policyYear2].map((p,index)=>p?{policyYear:index+1,originalFileName:p.originalFileName?.trim(),mimeType:p.mimeType?.trim().toLowerCase(),fileSize:Number(p.fileSize)}:null).filter(Boolean))};
         const canonical=(value:unknown)=>JSON.stringify(value,(_key,item)=>item&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
         if(prior.actor_id!==user.id||canonical(prior.payload)!==canonical(normalized))return NextResponse.json({success:false,error:"Cette opération a changé."},{status:409});
         return NextResponse.json({...prior.result,uploadedYears:normalized.policies.map(p=>p!.policyYear)},{headers:{"Cache-Control":"no-store"}});
        }
        if (insuranceRequest.status !==
            "policy_preparation" &&
            insuranceRequest.status !==
                "policy_available") {
            return NextResponse.json({
                success: false,
                error: "Les polices ne peuvent être déposées qu’après le début de leur préparation.",
            }, {
                status: 409,
                headers: {
                    "Cache-Control": "no-store",
                },
            });
        }
        const policyStartDate = body.policyStartDate
            ?.trim() ??
            "";
        const policyEndDate = body.policyEndDate
            ?.trim() ??
            "";
        if (!policyStartDate ||
            !policyEndDate) {
            return NextResponse.json({
                success: false,
                error: "Les dates de début et de fin de la police sont obligatoires.",
            }, {
                status: 400,
                headers: {
                    "Cache-Control": "no-store",
                },
            });
        }
        const startDate = new Date(`${policyStartDate}T00:00:00`);
        const endDate = new Date(`${policyEndDate}T00:00:00`);
        if (!isValidDate(policyStartDate) ||
            !isValidDate(policyEndDate) ||
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime())) {
            return NextResponse.json({
                success: false,
                error: "Les dates de validité sont invalides.",
            }, {
                status: 400,
                headers: {
                    "Cache-Control": "no-store",
                },
            });
        }
        if (endDate.getTime() <=
            startDate.getTime()) {
            return NextResponse.json({
                success: false,
                error: "La date de fin doit être postérieure à la date de début.",
            }, {
                status: 400,
                headers: {
                    "Cache-Control": "no-store",
                },
            });
        }
        const preparedPolicies: PreparedPolicy[] = [];
        const pendingInputs: Array<{
            policyYear: PolicyYear;
            payload: PendingPolicyPayload;
        }> = [];
        if (body.policyYear1) {
            pendingInputs.push({
                policyYear: 1,
                payload: body.policyYear1,
            });
        }
        if (body.policyYear2) {
            pendingInputs.push({
                policyYear: 2,
                payload: body.policyYear2,
            });
        }
        const datesChanged = insuranceRequest
            .policy_start_date !==
            policyStartDate ||
            insuranceRequest
                .policy_end_date !==
                policyEndDate;
        if (pendingInputs.length ===
            0 &&
            !datesChanged) {
            return NextResponse.json({
                success: false,
                error: "Aucune modification à enregistrer.",
            }, {
                status: 400,
                headers: {
                    "Cache-Control": "no-store",
                },
            });
        }
        for (const input of pendingInputs) {
            const validated = validatePendingPolicy({
                requestId: id,
                policyYear: input.policyYear,
                payload: input.payload,
                insuranceDurationYears,
            });
            cleanupPendingPaths.add(validated.pendingPath);
            const actual=await verifyStorageObject(serviceClient, validated.pendingPath);
            if(actual.fileSize!==validated.fileSize)throw Error("La taille du fichier ne correspond pas à la police.");
            const safeFileName = sanitizeFileName(validated.originalFileName);
            const finalPath = `${id}/insurance_policy/year_${input.policyYear}/` +
                `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
            preparedPolicies.push({
                policyYear: input.policyYear,
                pendingPath: validated.pendingPath,
                finalPath,
                originalFileName: validated.originalFileName,
                mimeType: validated.mimeType,
                fileSize: validated.fileSize,
            });
        }
        for (const policy of preparedPolicies) {
            await prepareDocumentCopy(serviceClient,policy.pendingPath,policy.finalPath,id);
            const { error: moveError, } = await serviceClient.storage
                .from(BUCKET_NAME)
                .copy(policy.pendingPath, policy.finalPath);
            if (moveError) {
                throw new Error(`Déplacement de la police année ${policy.policyYear} impossible : ${moveError.message}`);
            }
            cleanupPendingPaths.delete(policy.pendingPath);
            cleanupFinalPaths.add(policy.finalPath);
        }
        const operationKey = body.operationId;
        cleanupFinalPaths.clear();cleanupPendingPaths.clear();
        const {data:adopted,error:adoptError}=await serviceClient.rpc("adopt_insurance_policies",{p_request_id:id,p_actor_id:user.id,p_expected_updated_at:insuranceRequest.updated_at,p_start:policyStartDate,p_end:policyEndDate,p_policies:preparedPolicies,p_operation_key:operationKey});
        if(adoptError){
          // A network failure is ambiguous; retained objects can be recovered by the same submission.
          cleanupFinalPaths.clear(); cleanupPendingPaths.clear();
          return NextResponse.json({success:false,error:adoptError.code==="40001"?"Le dossier a changé. Actualisez la page.":adoptError.code==="42501"?"Accès refusé après réattribution.":"Les polices n’ont pas pu être enregistrées. Réessayez."},{status:adoptError.code==="40001"?409:adoptError.code==="42501"?403:adoptError.code==="PGRST202"?503:500,headers:{"Cache-Control":"no-store"}});
        }
        await processOutbox().catch(()=>{});
        const allRequiredPoliciesExist=Boolean(adopted.completed),finalStatus=adopted.status,savedPolicyYears=adopted.existingYears,becamePolicyAvailable=Boolean(adopted.whatsappNotificationTriggered);
        cleanupFinalPaths.clear();
        cleanupPendingPaths.clear();
        return NextResponse.json({
            success: true,
            completed: allRequiredPoliciesExist,
            status: finalStatus,
            uploadedYears: preparedPolicies.map((policy) => policy.policyYear),
            existingYears: savedPolicyYears,
            policyStartDate,
            policyEndDate,
            whatsappNotificationTriggered: becamePolicyAvailable &&
                (isDirectRequest ||
                    isPartnerRequest),
        }, {
            status: 200,
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("Erreur de dépôt des polices :", error);
        if (cleanupFinalPaths.size >
            0) {
            await removeStoragePaths(serviceClient, Array.from(cleanupFinalPaths));
        }
        return NextResponse.json({
            success: false,
            error: error instanceof
                Error
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
