import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity/logActivity";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  sendPartnerWhatsAppMessage,
  sendWhatsAppMessage,
} from "@/lib/whatsapp/sendWhatsAppMessage";

const BUCKET_NAME =
  "insurance-documents";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

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
  policyStartDate?: string;
  policyEndDate?: string;

  policyYear1?:
    | PendingPolicyPayload
    | null;

  policyYear2?:
    | PendingPolicyPayload
    | null;
};

type PreparedPolicy = {
  policyYear: PolicyYear;
  pendingPath: string;
  finalPath: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
};

function sanitizeFileName(
  fileName: string,
): string {
  const sanitized =
    fileName
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      )
      .replace(
        /_+/g,
        "_",
      )
      .replace(
        /^_+|_+$/g,
        "",
      );

  return (
    sanitized ||
    "insurance-policy.pdf"
  );
}

function getDocumentType(
  policyYear: PolicyYear,
): string {
  return policyYear === 1
    ? "insurance_policy_year_1"
    : "insurance_policy_year_2";
}

async function removeStoragePaths(
  serviceClient: ReturnType<
    typeof createServiceClient
  >,
  storagePaths: string[],
) {
  const uniqueStoragePaths =
    Array.from(
      new Set(
        storagePaths.filter(
          (storagePath) =>
            typeof storagePath ===
              "string" &&
            storagePath.trim() !==
              "",
        ),
      ),
    );

  if (
    uniqueStoragePaths.length ===
    0
  ) {
    return;
  }

  const { error } =
    await serviceClient.storage
      .from(BUCKET_NAME)
      .remove(
        uniqueStoragePaths,
      );

  if (error) {
    console.error(
      "Suppression de fichiers Storage impossible :",
      error,
    );
  }
}

async function safeLogActivity({
  requestId,
  userId,
  action,
  description,
}: {
  requestId: string;
  userId: string;
  action: string;
  description: string;
}) {
  try {
    await logActivity({
      requestId,
      userId,
      action,
      description,
    });
  } catch (error) {
    console.error(
      "Enregistrement de l'activité impossible :",
      error,
    );
  }
}

function validatePendingPolicy({
  requestId,
  policyYear,
  payload,
  insuranceDurationYears,
}: {
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
  if (
    policyYear === 2 &&
    insuranceDurationYears !== 2
  ) {
    throw new Error(
      "Ce dossier couvre seulement un an. La police de l’année 2 n’est pas autorisée.",
    );
  }

  const pendingPath =
    payload.path?.trim() ??
    "";

  const originalFileName =
    payload.originalFileName
      ?.trim() ??
    "";

  const mimeType =
    payload.mimeType
      ?.trim()
      .toLowerCase() ??
    "";

  const fileSize =
    Number(
      payload.fileSize,
    );

  if (!pendingPath) {
    throw new Error(
      `Police année ${policyYear} : chemin du fichier absent.`,
    );
  }

  const expectedPrefix =
    `pending/admin/policy/${requestId}/year_${policyYear}/`;

  if (
    !pendingPath.startsWith(
      expectedPrefix,
    )
  ) {
    throw new Error(
      `Police année ${policyYear} : chemin Storage invalide.`,
    );
  }

  if (!originalFileName) {
    throw new Error(
      `Police année ${policyYear} : nom du fichier absent.`,
    );
  }

  const isPdf =
    mimeType ===
      "application/pdf" ||
    originalFileName
      .toLowerCase()
      .endsWith(".pdf");

  if (!isPdf) {
    throw new Error(
      `Police année ${policyYear} : seuls les fichiers PDF sont acceptés.`,
    );
  }

  if (
    !Number.isFinite(
      fileSize,
    ) ||
    fileSize <= 0
  ) {
    throw new Error(
      `Police année ${policyYear} : le fichier PDF est vide ou invalide.`,
    );
  }

  if (
    fileSize >
    MAX_FILE_SIZE
  ) {
    throw new Error(
      `Police année ${policyYear} : le fichier ne doit pas dépasser 10 Mo.`,
    );
  }

  return {
    pendingPath,
    originalFileName,
    mimeType:
      "application/pdf",
    fileSize,
  };
}

async function verifyStorageObject(
  serviceClient: ReturnType<
    typeof createServiceClient
  >,
  storagePath: string,
) {
  const lastSlashIndex =
    storagePath.lastIndexOf(
      "/",
    );

  if (
    lastSlashIndex <= 0 ||
    lastSlashIndex ===
      storagePath.length - 1
  ) {
    throw new Error(
      "Chemin Storage invalide.",
    );
  }

  const folder =
    storagePath.slice(
      0,
      lastSlashIndex,
    );

  const fileName =
    storagePath.slice(
      lastSlashIndex + 1,
    );

  const {
    data,
    error,
  } =
    await serviceClient.storage
      .from(BUCKET_NAME)
      .list(
        folder,
        {
          search:
            fileName,
          limit: 10,
        },
      );

  if (error) {
    throw new Error(
      `Vérification du fichier impossible : ${error.message}`,
    );
  }

  const exists =
    (data ?? []).some(
      (item) =>
        item.name ===
        fileName,
    );

  if (!exists) {
    throw new Error(
      "Le fichier téléversé est introuvable dans le stockage.",
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const serviceClient =
    createServiceClient();

  /*
   * Fichiers déplacés vers leur emplacement
   * définitif mais pas encore adoptés.
   */
  const cleanupFinalPaths =
    new Set<string>();

  /*
   * Fichiers pending encore présents.
   */
  const cleanupPendingPaths =
    new Set<string>();

  try {
    /*
     * ============================================
     * 1. AUTHENTIFICATION
     * ============================================
     */

    const sessionClient =
      await createServerSupabaseClient();

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await sessionClient.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vous devez être connecté.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 2. RÔLE
     * ============================================
     */

    const role =
      user.app_metadata?.role;

    if (
      role !== "agent" &&
      role !== "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vous n’avez pas l’autorisation de déposer une police.",
        },
        {
          status: 403,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 3. IDENTIFIANT
     * ============================================
     */

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant du dossier absent.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 4. DOSSIER
     * ============================================
     */

    const {
      data:
        insuranceRequest,
      error:
        requestError,
    } =
      await serviceClient
        .from(
          "insurance_requests",
        )
        .select(
          `
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

            client:clients (
              first_name,
              whatsapp_country_code,
              whatsapp_number
            )
          `,
        )
        .eq(
          "id",
          id,
        )
        .maybeSingle();

    if (requestError) {
      throw new Error(
        requestError.message,
      );
    }

    if (!insuranceRequest) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Dossier introuvable.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 5. AUTORISATION AGENT
     * ============================================
     */

    if (
      role === "agent" &&
      insuranceRequest
        .assigned_agent_id !==
        user.id
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            insuranceRequest
              .assigned_agent_id
              ? "Ce dossier est attribué à un autre agent."
              : "Vous devez d’abord prendre en charge ce dossier.",
        },
        {
          status: 403,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 6. STATUT
     * ============================================
     */

    if (
      insuranceRequest.status !==
        "policy_preparation" &&
      insuranceRequest.status !==
        "policy_available"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Les polices ne peuvent être déposées qu’après le début de leur préparation.",
        },
        {
          status: 409,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const insuranceDurationYears:
      | 1
      | 2 =
      insuranceRequest
        .insurance_duration_years ===
      2
        ? 2
        : 1;

    const isDirectRequest =
      insuranceRequest.source ===
      "direct";

    const isPartnerRequest =
      insuranceRequest.source ===
        "partner" &&
      Boolean(
        insuranceRequest.partner_id,
      );

    /*
     * ============================================
     * 7. JSON
     * ============================================
     */

    let body:
      PolicyPayload;

    try {
      body =
        (await request.json()) as
          PolicyPayload;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Requête invalide.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const policyStartDate =
      body.policyStartDate
        ?.trim() ??
      "";

    const policyEndDate =
      body.policyEndDate
        ?.trim() ??
      "";

    /*
     * ============================================
     * 8. DATES
     * ============================================
     */

    if (
      !policyStartDate ||
      !policyEndDate
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Les dates de début et de fin de la police sont obligatoires.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const startDate =
      new Date(
        `${policyStartDate}T00:00:00`,
      );

    const endDate =
      new Date(
        `${policyEndDate}T00:00:00`,
      );

    if (
      Number.isNaN(
        startDate.getTime(),
      ) ||
      Number.isNaN(
        endDate.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Les dates de validité sont invalides.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    if (
      endDate.getTime() <
      startDate.getTime()
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "La date de fin doit être postérieure à la date de début.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 9. FICHIERS PENDING
     * ============================================
     */

    const preparedPolicies:
      PreparedPolicy[] =
      [];

    const pendingInputs: Array<{
      policyYear: PolicyYear;
      payload:
        PendingPolicyPayload;
    }> =
      [];

    if (body.policyYear1) {
      pendingInputs.push({
        policyYear: 1,
        payload:
          body.policyYear1,
      });
    }

    if (body.policyYear2) {
      pendingInputs.push({
        policyYear: 2,
        payload:
          body.policyYear2,
      });
    }

    const datesChanged =
      insuranceRequest
        .policy_start_date !==
        policyStartDate ||
      insuranceRequest
        .policy_end_date !==
        policyEndDate;

    if (
      pendingInputs.length ===
        0 &&
      !datesChanged
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Aucune modification à enregistrer.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * Validation et existence réelle de tous
     * les fichiers avant le premier déplacement.
     */

    for (
      const input of
      pendingInputs
    ) {
      const validated =
        validatePendingPolicy({
          requestId:
            id,

          policyYear:
            input.policyYear,

          payload:
            input.payload,

          insuranceDurationYears,
        });

      cleanupPendingPaths.add(
        validated.pendingPath,
      );

      await verifyStorageObject(
        serviceClient,
        validated.pendingPath,
      );

      const safeFileName =
        sanitizeFileName(
          validated.originalFileName,
        );

      const finalPath =
        `${id}/insurance_policy/year_${input.policyYear}/` +
        `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

      preparedPolicies.push({
        policyYear:
          input.policyYear,

        pendingPath:
          validated.pendingPath,

        finalPath,

        originalFileName:
          validated.originalFileName,

        mimeType:
          validated.mimeType,

        fileSize:
          validated.fileSize,
      });
    }

    /*
     * ============================================
     * 10. DÉPLACEMENT STORAGE
     * ============================================
     */

    for (
      const policy of
      preparedPolicies
    ) {
      const {
        error:
          moveError,
      } =
        await serviceClient.storage
          .from(
            BUCKET_NAME,
          )
          .move(
            policy.pendingPath,
            policy.finalPath,
          );

      if (moveError) {
        throw new Error(
          `Déplacement de la police année ${policy.policyYear} impossible : ${moveError.message}`,
        );
      }

      cleanupPendingPaths.delete(
        policy.pendingPath,
      );

      cleanupFinalPaths.add(
        policy.finalPath,
      );
    }

    const now =
      new Date().toISOString();

    /*
     * ============================================
     * 11. ENREGISTREMENT DES POLICES
     * ============================================
     */

    for (
      const policy of
      preparedPolicies
    ) {
      const documentType =
        getDocumentType(
          policy.policyYear,
        );

      const {
        data:
          previousPolicy,
        error:
          previousPolicyError,
      } =
        await serviceClient
          .from(
            "insurance_policies",
          )
          .select(
            `
              id,
              storage_path,
              policy_year
            `,
          )
          .eq(
            "request_id",
            id,
          )
          .eq(
            "policy_year",
            policy.policyYear,
          )
          .maybeSingle();

      if (
        previousPolicyError
      ) {
        throw new Error(
          `Recherche de la police année ${policy.policyYear} impossible : ${previousPolicyError.message}`,
        );
      }

      const {
        data:
          previousDocument,
        error:
          previousDocumentError,
      } =
        await serviceClient
          .from(
            "uploaded_documents",
          )
          .select(
            `
              id,
              storage_path,
              document_type
            `,
          )
          .eq(
            "request_id",
            id,
          )
          .eq(
            "document_type",
            documentType,
          )
          .maybeSingle();

      if (
        previousDocumentError
      ) {
        throw new Error(
          `Recherche du document année ${policy.policyYear} impossible : ${previousDocumentError.message}`,
        );
      }

      const {
        data:
          savedPolicy,
        error:
          savePolicyError,
      } =
        await serviceClient
          .from(
            "insurance_policies",
          )
          .upsert(
            {
              request_id:
                id,

              policy_year:
                policy.policyYear,

              storage_path:
                policy.finalPath,

              uploaded_at:
                now,
            },
            {
              onConflict:
                "request_id,policy_year",
            },
          )
          .select(
            `
              id,
              storage_path,
              policy_year
            `,
          )
          .single();

      if (
        savePolicyError ||
        !savedPolicy
      ) {
        throw new Error(
          `Enregistrement de la police année ${policy.policyYear} impossible : ${
            savePolicyError?.message ??
            "erreur inconnue"
          }`,
        );
      }

      const {
        error:
          saveDocumentError,
      } =
        await serviceClient
          .from(
            "uploaded_documents",
          )
          .upsert(
            {
              request_id:
                id,

              document_type:
                documentType,

              storage_path:
                policy.finalPath,

              original_file_name:
                policy.originalFileName,

              mime_type:
                "application/pdf",

              file_size:
                policy.fileSize,

              uploaded_at:
                now,
            },
            {
              onConflict:
                "request_id,document_type",
            },
          );

      if (
        saveDocumentError
      ) {
        /*
         * insurance_policies a déjà été modifié.
         * On restaure immédiatement l'ancienne
         * valeur avant de remonter l'erreur.
         */

        if (previousPolicy) {
          const {
            error:
              restorePolicyError,
          } =
            await serviceClient
              .from(
                "insurance_policies",
              )
              .update({
                storage_path:
                  previousPolicy.storage_path,
              })
              .eq(
                "id",
                previousPolicy.id,
              );

          if (
            restorePolicyError
          ) {
            console.error(
              `Restauration police année ${policy.policyYear} impossible :`,
              restorePolicyError,
            );
          }
        } else {
          const {
            error:
              deletePolicyError,
          } =
            await serviceClient
              .from(
                "insurance_policies",
              )
              .delete()
              .eq(
                "request_id",
                id,
              )
              .eq(
                "policy_year",
                policy.policyYear,
              );

          if (
            deletePolicyError
          ) {
            console.error(
              `Rollback police année ${policy.policyYear} impossible :`,
              deletePolicyError,
            );
          }
        }

        throw new Error(
          `Enregistrement du document année ${policy.policyYear} impossible : ${saveDocumentError.message}`,
        );
      }

      /*
       * Les deux écritures DB ont réussi.
       * Le nouveau fichier est maintenant adopté.
       */

      cleanupFinalPaths.delete(
        policy.finalPath,
      );

      /*
       * Suppression des anciennes versions
       * uniquement après réussite DB.
       */

      const oldStoragePaths =
        [
          previousPolicy
            ?.storage_path,

          previousDocument
            ?.storage_path,
        ].filter(
          (
            storagePath,
          ): storagePath is string =>
            typeof storagePath ===
              "string" &&
            storagePath !==
              "" &&
            storagePath !==
              policy.finalPath,
        );

      await removeStoragePaths(
        serviceClient,
        oldStoragePaths,
      );

      await safeLogActivity({
        requestId:
          id,

        userId:
          user.id,

        action:
          previousPolicy
            ? `policy_replaced_year_${policy.policyYear}`
            : `policy_uploaded_year_${policy.policyYear}`,

        description:
          previousPolicy
            ? `Police d’assurance année ${policy.policyYear} remplacée.`
            : `Police d’assurance année ${policy.policyYear} déposée.`,
      });
    }

    /*
     * ============================================
     * 12. VÉRIFICATION DES POLICES
     * ============================================
     */

    const {
      data:
        savedPolicies,
      error:
        savedPoliciesError,
    } =
      await serviceClient
        .from(
          "insurance_policies",
        )
        .select(
          `
            policy_year,
            storage_path
          `,
        )
        .eq(
          "request_id",
          id,
        )
        .order(
          "policy_year",
          {
            ascending:
              true,
          },
        );

    if (
      savedPoliciesError
    ) {
      throw new Error(
        `Vérification des polices enregistrées impossible : ${savedPoliciesError.message}`,
      );
    }

    const savedPolicyYears =
      Array.from(
        new Set(
          (
            savedPolicies ??
            []
          )
            .filter(
              (policy) =>
                Boolean(
                  policy.storage_path,
                ),
            )
            .map(
              (policy) =>
                Number(
                  policy.policy_year,
                ),
            )
            .filter(
              (
                policyYear,
              ): policyYear is PolicyYear =>
                policyYear ===
                  1 ||
                policyYear ===
                  2,
            ),
        ),
      );

    const year1Exists =
      savedPolicyYears.includes(
        1,
      );

    const year2Exists =
      savedPolicyYears.includes(
        2,
      );

    const allRequiredPoliciesExist =
      year1Exists &&
      (
        insuranceDurationYears ===
          1 ||
        year2Exists
      );

    /*
     * ============================================
     * 13. STATUT FINAL + DATES
     * ============================================
     */

    let finalStatus:
      | "policy_preparation"
      | "policy_available";

    let becamePolicyAvailable =
      false;

    if (
      allRequiredPoliciesExist
    ) {
      const {
        data:
          transitionedRequest,
        error:
          transitionError,
      } =
        await serviceClient
          .from(
            "insurance_requests",
          )
          .update({
            status:
              "policy_available",

            policy_start_date:
              policyStartDate,

            policy_end_date:
              policyEndDate,

            updated_at:
              now,
          })
          .eq(
            "id",
            id,
          )
          .eq(
            "status",
            "policy_preparation",
          )
          .select(
            `
              id,
              status
            `,
          )
          .maybeSingle();

      if (
        transitionError
      ) {
        throw new Error(
          `Mise à jour du statut impossible : ${transitionError.message}`,
        );
      }

      if (
        transitionedRequest
      ) {
        becamePolicyAvailable =
          true;

        finalStatus =
          "policy_available";
      } else {
        const {
          data:
            alreadyAvailableRequest,
          error:
            alreadyAvailableError,
        } =
          await serviceClient
            .from(
              "insurance_requests",
            )
            .update({
              policy_start_date:
                policyStartDate,

              policy_end_date:
                policyEndDate,

              updated_at:
                now,
            })
            .eq(
              "id",
              id,
            )
            .eq(
              "status",
              "policy_available",
            )
            .select(
              `
                id,
                status
              `,
            )
            .maybeSingle();

        if (
          alreadyAvailableError
        ) {
          throw new Error(
            `Mise à jour du dossier impossible : ${alreadyAvailableError.message}`,
          );
        }

        if (
          !alreadyAvailableRequest
        ) {
          return NextResponse.json(
            {
              success:
                false,

              error:
                "Le statut du dossier a changé entre-temps. Actualisez la page.",
            },
            {
              status:
                409,

              headers: {
                "Cache-Control":
                  "no-store",
              },
            },
          );
        }

        finalStatus =
          "policy_available";
      }
    } else {
      const {
        data:
          updatedRequest,
        error:
          updateRequestError,
      } =
        await serviceClient
          .from(
            "insurance_requests",
          )
          .update({
            policy_start_date:
              policyStartDate,

            policy_end_date:
              policyEndDate,

            updated_at:
              now,
          })
          .eq(
            "id",
            id,
          )
          .eq(
            "status",
            "policy_preparation",
          )
          .select(
            `
              id,
              status
            `,
          )
          .maybeSingle();

      if (
        updateRequestError
      ) {
        throw new Error(
          `Mise à jour du dossier impossible : ${updateRequestError.message}`,
        );
      }

      if (
        !updatedRequest
      ) {
        const {
          data:
            latestRequest,
          error:
            latestRequestError,
        } =
          await serviceClient
            .from(
              "insurance_requests",
            )
            .select(
              `
                id,
                status
              `,
            )
            .eq(
              "id",
              id,
            )
            .maybeSingle();

        if (
          latestRequestError
        ) {
          throw new Error(
            latestRequestError.message,
          );
        }

        if (
          latestRequest?.status ===
          "policy_available"
        ) {
          finalStatus =
            "policy_available";
        } else {
          return NextResponse.json(
            {
              success:
                false,

              error:
                "Le statut du dossier a changé entre-temps. Actualisez la page.",
            },
            {
              status:
                409,

              headers: {
                "Cache-Control":
                  "no-store",
              },
            },
          );
        }
      } else {
        finalStatus =
          "policy_preparation";
      }
    }

    /*
     * ============================================
     * 14. RENOUVELLEMENT
     * ============================================
     *
     * Exclusivement pour les dossiers directs.
     */

    if (
      allRequiredPoliciesExist &&
      isDirectRequest
    ) {
      const {
        error:
          renewalError,
      } =
        await serviceClient
          .from(
            "insurance_renewals",
          )
          .upsert(
            {
              request_id:
                id,

              client_id:
                insuranceRequest.client_id,

              status:
                "pending",

              updated_at:
                now,
            },
            {
              onConflict:
                "request_id",
            },
          );

      if (
        renewalError
      ) {
        console.error(
          "Création du renouvellement impossible :",
          renewalError.message,
        );
      }
    }

    /*
     * ============================================
     * 15. WHATSAPP CLIENT DIRECT
     * ============================================
     *
     * Uniquement :
     * dossier direct + transition réelle vers
     * policy_available.
     *
     * Un remplacement ultérieur de la police
     * ne renvoie donc pas le message.
     */

    if (
      becamePolicyAvailable &&
      isDirectRequest
    ) {
      try {
        const clientRelation =
          insuranceRequest.client;

        const client =
          Array.isArray(
            clientRelation,
          )
            ? (
                clientRelation[0] ??
                null
              )
            : clientRelation;

        const whatsappCountryCode =
          client
            ?.whatsapp_country_code
            ?.trim() ??
          "";

        const whatsappNumber =
          client
            ?.whatsapp_number
            ?.trim() ??
          "";

        const phoneNumber =
          `${whatsappCountryCode}${whatsappNumber}`;

        if (
          whatsappCountryCode &&
          whatsappNumber
        ) {
          await sendWhatsAppMessage({
            phoneNumber,

            matricule:
              insuranceRequest.request_code,

            firstName:
              client?.first_name
                ?.trim() ??
              "",

            preferredLanguage:
              insuranceRequest.preferred_language,
          });

          await safeLogActivity({
            requestId:
              id,

            userId:
              user.id,

            action:
              "policy_whatsapp_sent",

            description:
              "Le client a été informé sur WhatsApp que son assurance est disponible.",
          });
        } else {
          console.error(
            "Notification WhatsApp client non envoyée : numéro client incomplet.",
          );

          await safeLogActivity({
            requestId:
              id,

            userId:
              user.id,

            action:
              "policy_whatsapp_failed",

            description:
              "Notification WhatsApp client impossible : numéro client incomplet.",
          });
        }
      } catch (
        whatsappError
      ) {
        console.error(
          "Notification WhatsApp client impossible :",
          whatsappError,
        );

        await safeLogActivity({
          requestId:
            id,

          userId:
            user.id,

          action:
            "policy_whatsapp_failed",

          description:
            whatsappError instanceof
              Error
              ? `Échec de la notification WhatsApp client : ${whatsappError.message}`
              : "Échec de la notification WhatsApp client.",
        });
      }
    }

    /*
     * ============================================
     * 16. WHATSAPP PARTENAIRE
     * ============================================
     *
     * Uniquement :
     * dossier partenaire + transition réelle vers
     * policy_available.
     *
     * Aucun message WhatsApp n'est envoyé au client.
     */

    if (
      becamePolicyAvailable &&
      isPartnerRequest &&
      insuranceRequest.partner_id
    ) {
      try {
        const {
          data:
            partner,
          error:
            partnerError,
        } =
          await serviceClient
            .from(
              "partners",
            )
            .select(
              `
                id,
                company_name,
                manager_name,
                whatsapp_country_code,
                whatsapp_number
              `,
            )
            .eq(
              "id",
              insuranceRequest.partner_id,
            )
            .maybeSingle();

        if (partnerError) {
          throw new Error(
            `Recherche du partenaire impossible : ${partnerError.message}`,
          );
        }

        if (!partner) {
          throw new Error(
            "Le partenaire associé au dossier est introuvable.",
          );
        }

        const whatsappCountryCode =
          partner
            .whatsapp_country_code
            ?.trim() ??
          "";

        const whatsappNumber =
          partner
            .whatsapp_number
            ?.trim() ??
          "";

        const phoneNumber =
          `${whatsappCountryCode}${whatsappNumber}`;

        const clientRelation =
          insuranceRequest.client;

        const client =
          Array.isArray(
            clientRelation,
          )
            ? (
                clientRelation[0] ??
                null
              )
            : clientRelation;

        const partnerName =
          partner.manager_name
            ?.trim() ||
          partner.company_name
            ?.trim() ||
          "Partenaire";

        const clientName =
          client?.first_name
            ?.trim() ||
          "Client";

        if (
          whatsappCountryCode &&
          whatsappNumber
        ) {
          await sendPartnerWhatsAppMessage({
            phoneNumber,

            partnerName,

            clientName,

            matricule:
              insuranceRequest.request_code,
          });

          await safeLogActivity({
            requestId:
              id,

            userId:
              user.id,

            action:
              "partner_policy_whatsapp_sent",

            description:
              "Le partenaire a été informé sur WhatsApp que l’assurance de son client est disponible.",
          });
        } else {
          console.error(
            "Notification WhatsApp partenaire non envoyée : numéro partenaire incomplet.",
          );

          await safeLogActivity({
            requestId:
              id,

            userId:
              user.id,

            action:
              "partner_policy_whatsapp_failed",

            description:
              "Notification WhatsApp partenaire impossible : numéro partenaire incomplet.",
          });
        }
      } catch (
        whatsappError
      ) {
        console.error(
          "Notification WhatsApp partenaire impossible :",
          whatsappError,
        );

        await safeLogActivity({
          requestId:
            id,

          userId:
            user.id,

          action:
            "partner_policy_whatsapp_failed",

          description:
            whatsappError instanceof
              Error
              ? `Échec de la notification WhatsApp partenaire : ${whatsappError.message}`
              : "Échec de la notification WhatsApp partenaire.",
        });
      }
    }

    /*
     * ============================================
     * 17. SUCCÈS
     * ============================================
     */

    cleanupFinalPaths.clear();
    cleanupPendingPaths.clear();

    return NextResponse.json(
      {
        success:
          true,

        completed:
          allRequiredPoliciesExist,

        status:
          finalStatus,

        uploadedYears:
          preparedPolicies.map(
            (policy) =>
              policy.policyYear,
          ),

        existingYears:
          savedPolicyYears,

        policyStartDate,

        policyEndDate,

        whatsappNotificationTriggered:
          becamePolicyAvailable &&
          (
            isDirectRequest ||
            isPartnerRequest
          ),
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Erreur de dépôt des polices :",
      error,
    );

    /*
     * Les fichiers finaux non adoptés sont
     * supprimés.
     */

    if (
      cleanupFinalPaths.size >
      0
    ) {
      await removeStoragePaths(
        serviceClient,
        Array.from(
          cleanupFinalPaths,
        ),
      );
    }

    /*
     * Les fichiers temporaires encore présents
     * sont également supprimés.
     */

    if (
      cleanupPendingPaths.size >
      0
    ) {
      await removeStoragePaths(
        serviceClient,
        Array.from(
          cleanupPendingPaths,
        ),
      );
    }

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof
            Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}