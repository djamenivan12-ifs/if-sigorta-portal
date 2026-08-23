import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity/logActivity";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  sendWhatsAppMessage,
} from "@/lib/whatsapp/sendWhatsAppMessage";

const BUCKET_NAME =
  "insurance-documents";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

type PolicyYear = 1 | 2;

type PolicyFileToUpload = {
  policyYear: PolicyYear;
  file: File;
};

type UploadedPolicyFile = {
  policyYear: PolicyYear;
  file: File;
  storagePath: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function sanitizeFileName(
  fileName: string,
): string {
  return fileName
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
}

function getDocumentType(
  policyYear: PolicyYear,
): string {
  return policyYear === 1
    ? "insurance_policy_year_1"
    : "insurance_policy_year_2";
}

function validatePdf(
  file: File,
  policyYear: PolicyYear,
) {
  const isPdf =
    file.type ===
      "application/pdf" ||
    file.name
      .toLowerCase()
      .endsWith(
        ".pdf",
      );

  if (!isPdf) {
    throw new Error(
      `Police année ${policyYear} : seuls les fichiers PDF sont acceptés.`,
    );
  }

  if (
    file.size === 0
  ) {
    throw new Error(
      `Police année ${policyYear} : le fichier PDF est vide.`,
    );
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    throw new Error(
      `Police année ${policyYear} : le fichier ne doit pas dépasser 10 Mo.`,
    );
  }
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
          (
            storagePath,
          ) =>
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

  const {
    error,
  } =
    await serviceClient.storage
      .from(
        BUCKET_NAME,
      )
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

async function uploadPolicyFile({
  serviceClient,
  requestId,
  policyYear,
  file,
}: {
  serviceClient: ReturnType<
    typeof createServiceClient
  >;
  requestId: string;
  policyYear: PolicyYear;
  file: File;
}): Promise<UploadedPolicyFile> {
  validatePdf(
    file,
    policyYear,
  );

  const safeFileName =
    sanitizeFileName(
      file.name,
    );

  const uniqueFileName =
    `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

  const storagePath =
    `${requestId}/insurance_policy/year_${policyYear}/${uniqueFileName}`;

  const arrayBuffer =
    await file.arrayBuffer();

  const fileBytes =
    new Uint8Array(
      arrayBuffer,
    );

  const {
    data:
      uploadData,
    error:
      uploadError,
  } =
    await serviceClient.storage
      .from(
        BUCKET_NAME,
      )
      .upload(
        storagePath,
        fileBytes,
        {
          contentType:
            "application/pdf",

          cacheControl:
            "3600",

          upsert:
            false,
        },
      );

  if (
    uploadError
  ) {
    console.error(
      `Erreur Storage année ${policyYear} :`,
      {
        message:
          uploadError.message,

        name:
          uploadError.name,

        requestId,

        policyYear,

        storagePath,

        fileName:
          file.name,

        fileType:
          file.type,

        fileSize:
          file.size,
      },
    );

    throw new Error(
      `Téléversement de la police année ${policyYear} impossible : ${uploadError.message}`,
    );
  }

  if (
    !uploadData?.path
  ) {
    throw new Error(
      `Téléversement de la police année ${policyYear} impossible : aucun chemin Storage n’a été retourné.`,
    );
  }

  return {
    policyYear,
    file,
    storagePath:
      uploadData.path,
  };
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const serviceClient =
    createServiceClient();

  /*
   * Fichiers nouvellement téléversés
   * qui doivent être supprimés si une
   * erreur survient avant leur adoption
   * définitive dans la base.
   */
  const cleanupPaths =
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

    const {
      id,
    } =
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

    if (
      requestError
    ) {
      throw new Error(
        requestError.message,
      );
    }

    if (
      !insuranceRequest
    ) {
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
      insuranceRequest.assigned_agent_id !==
        user.id
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            insuranceRequest.assigned_agent_id
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
     * 6. STATUT AUTORISÉ
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

    /*
     * ============================================
     * 7. FORM DATA
     * ============================================
     */

    const formData =
      await request.formData();

    const policyStartDateValue =
      formData.get(
        "policyStartDate",
      );

    const policyEndDateValue =
      formData.get(
        "policyEndDate",
      );

    const policyStartDate =
      typeof policyStartDateValue ===
      "string"
        ? policyStartDateValue.trim()
        : "";

    const policyEndDate =
      typeof policyEndDateValue ===
      "string"
        ? policyEndDateValue.trim()
        : "";

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
     * 9. FICHIERS
     * ============================================
     */

    const year1Value =
      formData.get(
        "policyYear1File",
      );

    const year2Value =
      formData.get(
        "policyYear2File",
      );

    const year1File =
      year1Value instanceof
          File &&
        year1Value.size >
          0
        ? year1Value
        : null;

    const year2File =
      year2Value instanceof
          File &&
        year2Value.size >
          0
        ? year2Value
        : null;

    const datesChanged =
      insuranceRequest
        .policy_start_date !==
        policyStartDate ||
      insuranceRequest
        .policy_end_date !==
        policyEndDate;

    if (
      !year1File &&
      !year2File &&
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

    if (
      insuranceDurationYears ===
        1 &&
      year2File
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Ce dossier couvre seulement un an. La police de l’année 2 n’est pas autorisée.",
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

    const filesToUpload:
      PolicyFileToUpload[] = [];

    if (
      year1File
    ) {
      validatePdf(
        year1File,
        1,
      );

      filesToUpload.push({
        policyYear:
          1,

        file:
          year1File,
      });
    }

    if (
      year2File
    ) {
      validatePdf(
        year2File,
        2,
      );

      filesToUpload.push({
        policyYear:
          2,

        file:
          year2File,
      });
    }

    /*
     * ============================================
     * 10. UPLOAD STORAGE
     * ============================================
     */

    const uploadedFiles:
      UploadedPolicyFile[] = [];

    for (
      const item of
      filesToUpload
    ) {
      const uploadedFile =
        await uploadPolicyFile({
          serviceClient,

          requestId:
            id,

          policyYear:
            item.policyYear,

          file:
            item.file,
        });

      uploadedFiles.push(
        uploadedFile,
      );

      cleanupPaths.add(
        uploadedFile.storagePath,
      );
    }

    const now =
      new Date().toISOString();

    /*
     * ============================================
     * 11. UPSERT DES POLICES
     * ============================================
     */

    for (
      const uploadedFile of
      uploadedFiles
    ) {
      const documentType =
        getDocumentType(
          uploadedFile.policyYear,
        );

      /*
       * Ancienne police
       */

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
            uploadedFile.policyYear,
          )
          .maybeSingle();

      if (
        previousPolicyError
      ) {
        throw new Error(
          `Recherche de la police année ${uploadedFile.policyYear} impossible : ${previousPolicyError.message}`,
        );
      }

      /*
       * Ancien uploaded_document
       */

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
          `Recherche du document année ${uploadedFile.policyYear} impossible : ${previousDocumentError.message}`,
        );
      }

      /*
       * UPSERT insurance_policies.
       *
       * UNIQUE :
       * request_id + policy_year
       */

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
                uploadedFile.policyYear,

              storage_path:
                uploadedFile.storagePath,

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
          `Enregistrement de la police année ${uploadedFile.policyYear} impossible : ${
            savePolicyError?.message ??
            "erreur inconnue"
          }`,
        );
      }

      /*
       * La police utilise maintenant
       * le nouveau fichier.
       */

      cleanupPaths.delete(
        uploadedFile.storagePath,
      );

      /*
       * UPSERT uploaded_documents.
       *
       * UNIQUE :
       * request_id + document_type
       */

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
                uploadedFile.storagePath,

              original_file_name:
                uploadedFile.file.name,

              mime_type:
                "application/pdf",

              file_size:
                uploadedFile.file.size,

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
        throw new Error(
          `Enregistrement du document année ${uploadedFile.policyYear} impossible : ${saveDocumentError.message}`,
        );
      }

      /*
       * Suppression des anciens fichiers.
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
              uploadedFile.storagePath,
        );

      await removeStoragePaths(
        serviceClient,
        oldStoragePaths,
      );

      /*
       * Historique.
       */

      await safeLogActivity({
        requestId:
          id,

        userId:
          user.id,

        action:
          previousPolicy
            ? `policy_replaced_year_${uploadedFile.policyYear}`
            : `policy_uploaded_year_${uploadedFile.policyYear}`,

        description:
          previousPolicy
            ? `Police d’assurance année ${uploadedFile.policyYear} remplacée.`
            : `Police d’assurance année ${uploadedFile.policyYear} déposée.`,
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
              (
                policy,
              ) =>
                Boolean(
                  policy.storage_path,
                ),
            )
            .map(
              (
                policy,
              ) =>
                Number(
                  policy.policy_year,
                ),
            )
            .filter(
              (
                policyYear,
              ): policyYear is
                PolicyYear =>
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
     * 13. STATUT FINAL
     * ============================================
     */

    let finalStatus:
      | "policy_preparation"
      | "policy_available";

    let becamePolicyAvailable =
      false;

    /*
     * Toutes les polices nécessaires existent.
     */

    if (
      allRequiredPoliciesExist
    ) {
      /*
       * On essaie d'abord de faire la vraie
       * transition :
       *
       * policy_preparation
       *       ↓
       * policy_available
       *
       * Une seule requête concurrente
       * peut réussir.
       */

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
        /*
         * Cette requête est celle qui
         * rend réellement la police disponible.
         */

        becamePolicyAvailable =
          true;

        finalStatus =
          "policy_available";
      } else {
        /*
         * Aucun changement :
         * le dossier est peut-être déjà
         * policy_available.
         *
         * Exemple :
         * remplacement d'un PDF.
         */

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

        becamePolicyAvailable =
          false;

        finalStatus =
          "policy_available";
      }
    } else {
      /*
       * Il manque encore une police.
       *
       * Exemple :
       * assurance 2 ans avec seulement
       * la police année 1.
       */

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
        /*
         * Une autre requête peut avoir
         * terminé les polices entre-temps.
         */

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
     */

    if (
      allRequiredPoliciesExist
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
        /*
         * Une erreur de renouvellement ne doit
         * pas annuler la mise à disposition
         * de la police.
         */

        console.error(
          "Création du renouvellement impossible :",
          renewalError.message,
        );
      }
    }

    /*
     * ============================================
     * 15. NOTIFICATION WHATSAPP
     * ============================================
     *
     * UNIQUEMENT lors de :
     *
     * policy_preparation
     *       ↓
     * policy_available
     *
     * Un remplacement ultérieur ne renvoie
     * donc pas le message.
     */

    if (
      becamePolicyAvailable
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
              client?.first_name ??
              "",

            preferredLanguage:
              insuranceRequest.preferred_language ??
              "fr",
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
            "Notification WhatsApp non envoyée : numéro client incomplet.",
          );

          await safeLogActivity({
            requestId:
              id,

            userId:
              user.id,

            action:
              "policy_whatsapp_failed",

            description:
              "Notification WhatsApp impossible : numéro client incomplet.",
          });
        }
      } catch (
        whatsappError
      ) {
        /*
         * La police est déjà disponible.
         *
         * Une panne WhatsApp ne doit jamais
         * faire échouer l'upload.
         */

        console.error(
          "Notification WhatsApp impossible :",
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
              ? `Échec de la notification WhatsApp : ${whatsappError.message}`
              : "Échec de la notification WhatsApp.",
        });
      }
    }

    /*
     * ============================================
     * 16. SUCCÈS
     * ============================================
     */

    cleanupPaths.clear();

    return NextResponse.json(
      {
        success:
          true,

        completed:
          allRequiredPoliciesExist,

        status:
          finalStatus,

        uploadedYears:
          uploadedFiles.map(
            (
              uploadedFile,
            ) =>
              uploadedFile.policyYear,
          ),

        existingYears:
          savedPolicyYears,

        policyStartDate,

        policyEndDate,

        whatsappNotificationTriggered:
          becamePolicyAvailable,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (
    error
  ) {
    console.error(
      "Erreur de dépôt des polices :",
      error,
    );

    /*
     * Suppression uniquement des fichiers
     * qui n'ont pas encore été adoptés
     * dans insurance_policies.
     */

    if (
      cleanupPaths.size >
      0
    ) {
      await removeStoragePaths(
        serviceClient,
        Array.from(
          cleanupPaths,
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