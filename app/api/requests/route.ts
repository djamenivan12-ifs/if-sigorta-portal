import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity/logActivity";
import { calculateInsurancePriceServer } from "@/lib/insurance/calculatePriceServer";
import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/security/rateLimit";
import { createServiceClient } from "@/lib/supabase/service";

const BUCKET_NAME = "insurance-documents";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const IP_RATE_LIMIT = 8;

const IP_RATE_LIMIT_WINDOW_SECONDS =
  10 * 60;

type DocumentType =
  | "passport"
  | "kimlik_front"
  | "kimlik_back";

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

  calculatedAge: number;
  calculatedPrice: number;
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

function rateLimitedResponse(
  retryAfterSeconds: number,
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Trop de demandes ont été envoyées. Veuillez patienter quelques minutes avant de réessayer.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(
          Math.max(
            1,
            retryAfterSeconds,
          ),
        ),
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function isDocumentType(
  value: unknown,
): value is DocumentType {
  return (
    value === "passport" ||
    value === "kimlik_front" ||
    value === "kimlik_back"
  );
}

function isValidUploadSessionId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    /^[a-f0-9-]{36}$/i.test(
      value,
    )
  );
}

function validateUploadedDocument(
  document: UploadedDocumentPayload,
  uploadSessionId: string,
) {
  if (
    !isDocumentType(
      document.documentType,
    )
  ) {
    throw new Error(
      "Type de document invalide.",
    );
  }

  if (
    !document.originalFileName ||
    typeof document.originalFileName !==
      "string"
  ) {
    throw new Error(
      "Nom de fichier manquant.",
    );
  }

  if (
    !ALLOWED_FILE_TYPES.includes(
      document.mimeType,
    )
  ) {
    throw new Error(
      `${document.documentType} : format non accepté. Utilisez PDF, JPG, JPEG ou PNG.`,
    );
  }

  if (
    !Number.isFinite(
      document.fileSize,
    ) ||
    document.fileSize <= 0
  ) {
    throw new Error(
      `${document.documentType} : le fichier est vide ou invalide.`,
    );
  }

  if (
    document.fileSize >
    MAX_FILE_SIZE
  ) {
    throw new Error(
      `${document.documentType} : le fichier ne doit pas dépasser 10 Mo.`,
    );
  }

  const expectedPrefix =
    `pending/${uploadSessionId}/${document.documentType}/`;

  if (
    !document.storagePath ||
    !document.storagePath.startsWith(
      expectedPrefix,
    )
  ) {
    throw new Error(
      "Chemin de document invalide.",
    );
  }
}

function isValidDate(
  value: string,
): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00`,
  );

  return !Number.isNaN(
    date.getTime(),
  );
}

function getTodayDate(): string {
  return new Date()
    .toISOString()
    .split("T")[0];
}

function generateRequestCode(): string {
  const year =
    new Date().getFullYear();

  const randomPart =
    crypto.randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase();

  return `IF-${year}-${randomPart}`;
}

function buildFinalStoragePath(
  requestId: string,
  document: UploadedDocumentPayload,
) {
  const fileName =
    document.storagePath
      .split("/")
      .pop() ||
    `${Date.now()}-${crypto.randomUUID()}`;

  return `${requestId}/${document.documentType}/${fileName}`;
}

export async function POST(
  request: Request,
) {
  const clientIp =
    getClientIp(
      request,
    );

  const ipLimit =
    await consumeRateLimit({
      namespace:
        "request-create-ip",
      identifier:
        clientIp,
      limit:
        IP_RATE_LIMIT,
      windowSeconds:
        IP_RATE_LIMIT_WINDOW_SECONDS,
    });

  if (
    !ipLimit.allowed
  ) {
    return rateLimitedResponse(
      ipLimit.retryAfterSeconds,
    );
  }

  const serviceClient =
    createServiceClient();

  let createdClientId:
    | string
    | null = null;

  let createdRequestId:
    | string
    | null = null;

  const pendingStoragePaths:
    string[] = [];

  const movedStoragePaths:
    string[] = [];

  try {
    /*
     * ============================
     * LECTURE DU PETIT JSON
     * ============================
     *
     * Les fichiers ne transitent plus
     * par cette route. Ils ont déjà été
     * téléversés directement dans
     * Supabase Storage.
     */
    const body =
      (await request.json()) as CreateRequestBody;

    const payload =
      body.payload;

    const uploadSessionId =
      body.uploadSessionId;

    const documents =
      Array.isArray(
        body.documents,
      )
        ? body.documents
        : [];

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Les données de la demande sont absentes.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidUploadSessionId(
        uploadSessionId,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La session de téléversement est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    for (
      const document of
      documents
    ) {
      validateUploadedDocument(
        document,
        uploadSessionId,
      );

      pendingStoragePaths.push(
        document.storagePath,
      );
    }

    const passportDocument =
      documents.find(
        (document) =>
          document.documentType ===
          "passport",
      );

    const kimlikFrontDocument =
      documents.find(
        (document) =>
          document.documentType ===
          "kimlik_front",
      );

    const kimlikBackDocument =
      documents.find(
        (document) =>
          document.documentType ===
          "kimlik_back",
      );

    if (
      !passportDocument
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le passeport est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      payload.hasKimlik &&
      (
        !kimlikFrontDocument ||
        !kimlikBackDocument
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le Kimlik recto et le Kimlik verso sont obligatoires.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ============================
     * NORMALISATION
     * ============================
     */
    const preferredLanguage =
      payload.preferredLanguage ===
        "en" ||
      payload.preferredLanguage ===
        "tr"
        ? payload.preferredLanguage
        : "fr";

    const requestCode =
      generateRequestCode();

    const lastName =
      payload.lastName
        ?.trim()
        .toLocaleUpperCase(
          "fr-FR",
        ) ??
      "";

    const firstName =
      payload.firstName
        ?.trim()
        .toLocaleUpperCase(
          "fr-FR",
        ) ??
      "";

    const fatherName =
      payload.fatherName
        ?.trim()
        .toLocaleUpperCase(
          "fr-FR",
        ) ??
      "";

    const nationality =
      payload.nationality
        ?.trim() ??
      "";

    const whatsappCountryCode =
      payload.whatsappCountryCode
        ?.trim() ??
      "";

    const whatsappNumber =
      payload.whatsappNumber
        ?.replace(
          /\D/g,
          "",
        ) ??
      "";

    const passportNumber =
      payload.passportNumber
        ?.trim()
        .toUpperCase() ??
      "";

    if (
      !lastName ||
      !firstName ||
      !fatherName ||
      !payload.birthDate ||
      !payload.gender ||
      !nationality ||
      !whatsappCountryCode ||
      !whatsappNumber ||
      !passportNumber
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Certaines informations obligatoires sont absentes.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      payload.gender !==
        "male" &&
      payload.gender !==
        "female"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le sexe renseigné est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      payload.duration !== 1 &&
      payload.duration !== 2
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La durée de l’assurance est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Le prix envoyé par le navigateur
     * n'est jamais considéré comme fiable.
     */
    const serverPriceResult =
      await calculateInsurancePriceServer(
        payload.birthDate,
        payload.duration,
      );

    if (
      !serverPriceResult ||
      !serverPriceResult.available ||
      serverPriceResult.price ===
        null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le tarif d’assurance n’est pas disponible pour cet âge.",
        },
        {
          status: 400,
        },
      );
    }

    const calculatedAge =
      serverPriceResult.age;

    const calculatedPrice =
      serverPriceResult.price;

    if (
      !isValidDate(
        payload.birthDate,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La date de naissance est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !payload.address
        ?.provinceId ||
      !payload.address
        ?.districtId ||
      !payload.address
        ?.neighborhoodId ||
      !payload.address
        ?.street
        ?.trim() ||
      !payload.address
        ?.buildingNumber
        ?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "L’adresse complète est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      payload.hasKimlik
    ) {
      const kimlikNumber =
        payload.kimlikNumber
          ?.replace(
            /\D/g,
            "",
          ) ??
        "";

      if (
        !/^\d{11}$/.test(
          kimlikNumber,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Le numéro de Kimlik doit contenir exactement 11 chiffres.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        !payload.kimlikExpirationDate
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "La date d’expiration du Kimlik est obligatoire.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        !isValidDate(
          payload.kimlikExpirationDate,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "La date d’expiration du Kimlik est invalide.",
          },
          {
            status: 400,
          },
        );
      }
    } else {
      if (
        !payload.insuranceStartDate
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "La date souhaitée de début de l’assurance est obligatoire.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        !isValidDate(
          payload.insuranceStartDate,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "La date souhaitée de début de l’assurance est invalide.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        payload.insuranceStartDate <
        getTodayDate()
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "La date souhaitée de début de l’assurance ne peut pas être dans le passé.",
          },
          {
            status: 400,
          },
        );
      }
    }

    /*
     * Vérification du code dossier.
     */
    const {
      data:
        existingRequest,
      error:
        existingRequestError,
    } =
      await serviceClient
        .from(
          "insurance_requests",
        )
        .select("id")
        .eq(
          "request_code",
          requestCode,
        )
        .maybeSingle();

    if (
      existingRequestError
    ) {
      throw new Error(
        existingRequestError.message,
      );
    }

    if (
      existingRequest
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ce code de dossier existe déjà. Recommencez la soumission.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * ============================
     * RECHERCHE DU CLIENT EXISTANT
     * ============================
     */
    const normalizedKimlikNumber =
      payload.hasKimlik
        ? payload.kimlikNumber.replace(
            /\D/g,
            "",
          )
        : "";

    let existingClientId:
      | string
      | null = null;

    let identityRequestQuery =
      serviceClient
        .from(
          "insurance_requests",
        )
        .select(
          `
            id,
            client_id
          `,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          10,
        );

    if (
      payload.hasKimlik &&
      normalizedKimlikNumber
    ) {
      identityRequestQuery =
        identityRequestQuery.eq(
          "kimlik_number",
          normalizedKimlikNumber,
        );
    } else {
      identityRequestQuery =
        identityRequestQuery.eq(
          "passport_number",
          passportNumber,
        );
    }

    const {
      data:
        identityRequests,
      error:
        identityRequestError,
    } =
      await identityRequestQuery;

    if (
      identityRequestError
    ) {
      throw new Error(
        `Recherche du client existant impossible : ${identityRequestError.message}`,
      );
    }

    for (
      const identityRequest of
      identityRequests ?? []
    ) {
      if (
        !identityRequest.client_id
      ) {
        continue;
      }

      const {
        data:
          existingClient,
        error:
          existingClientError,
      } =
        await serviceClient
          .from(
            "clients",
          )
          .select(
            `
              id,
              first_name,
              last_name,
              birth_date
            `,
          )
          .eq(
            "id",
            identityRequest.client_id,
          )
          .maybeSingle();

      if (
        existingClientError
      ) {
        throw new Error(
          existingClientError.message,
        );
      }

      if (
        !existingClient
      ) {
        continue;
      }

      const sameFirstName =
        (
          existingClient.first_name ??
          ""
        )
          .trim()
          .toLocaleUpperCase(
            "fr-FR",
          ) ===
        firstName;

      const sameLastName =
        (
          existingClient.last_name ??
          ""
        )
          .trim()
          .toLocaleUpperCase(
            "fr-FR",
          ) ===
        lastName;

      const sameBirthDate =
        existingClient.birth_date ===
        payload.birthDate;

      if (
        sameFirstName &&
        sameLastName &&
        sameBirthDate
      ) {
        existingClientId =
          existingClient.id;

        break;
      }
    }

    let clientId:
      string;

    if (
      existingClientId
    ) {
      /*
       * Une demande publique ne modifie
       * jamais automatiquement la fiche CRM
       * d'un client existant.
       */
      clientId =
        existingClientId;
    } else {
      const {
        data:
          newClient,
        error:
          clientError,
      } =
        await serviceClient
          .from(
            "clients",
          )
          .insert({
            last_name:
              lastName,

            first_name:
              firstName,

            father_name:
              fatherName,

            birth_date:
              payload.birthDate,

            gender:
              payload.gender,

            nationality,

            whatsapp_country_code:
              whatsappCountryCode,

            whatsapp_number:
              whatsappNumber,

            province_id:
              Number(
                payload.address
                  .provinceId,
              ),

            district_id:
              Number(
                payload.address
                  .districtId,
              ),

            neighborhood_id:
              Number(
                payload.address
                  .neighborhoodId,
              ),

            street:
              payload.address
                .street
                .trim(),

            building_number:
              payload.address
                .buildingNumber
                .trim(),

            apartment_number:
              payload.address
                .apartmentNumber
                ?.trim() ||
              null,
          })
          .select(
            "id",
          )
          .single();

      if (
        clientError ||
        !newClient
      ) {
        throw new Error(
          `Création du client impossible : ${
            clientError?.message ??
            "erreur inconnue"
          }`,
        );
      }

      clientId =
        newClient.id;

      createdClientId =
        newClient.id;
    }

    /*
     * ============================
     * CRÉATION DU DOSSIER
     * ============================
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
        .insert({
          request_code:
            requestCode,

          client_id:
            clientId,

          preferred_language:
            preferredLanguage,

          has_kimlik:
            payload.hasKimlik,

          kimlik_number:
            payload.hasKimlik
              ? payload.kimlikNumber.replace(
                  /\D/g,
                  "",
                )
              : null,

          kimlik_expiration_date:
            payload.hasKimlik
              ? payload.kimlikExpirationDate
              : null,

          insurance_start_date:
            payload.hasKimlik
              ? null
              : payload.insuranceStartDate,

          passport_number:
            passportNumber,

          insurance_duration_years:
            payload.duration,

          calculated_age:
            calculatedAge,

          calculated_price:
            calculatedPrice,

          status:
            "waiting_payment",
        })
        .select(
          `
            id,
            request_code
          `,
        )
        .single();

    if (
      requestError ||
      !insuranceRequest
    ) {
      throw new Error(
        `Création du dossier impossible : ${
          requestError?.message ??
          "erreur inconnue"
        }`,
      );
    }

    createdRequestId =
      insuranceRequest.id;

    /*
     * ============================
     * DÉPLACEMENT DES DOCUMENTS
     * ============================
     *
     * pending/session/... -> requestId/...
     */
    const preparedDocuments:
      PreparedDocument[] = [];

    for (
      const document of
      documents
    ) {
      const finalPath =
        buildFinalStoragePath(
          insuranceRequest.id,
          document,
        );

      const {
        error:
          moveError,
      } =
        await serviceClient.storage
          .from(
            BUCKET_NAME,
          )
          .move(
            document.storagePath,
            finalPath,
          );

      if (
        moveError
      ) {
        throw new Error(
          `Déplacement impossible pour ${document.documentType} : ${moveError.message}`,
        );
      }

      movedStoragePaths.push(
        finalPath,
      );

      const pendingIndex =
        pendingStoragePaths.indexOf(
          document.storagePath,
        );

      if (
        pendingIndex !== -1
      ) {
        pendingStoragePaths.splice(
          pendingIndex,
          1,
        );
      }

      preparedDocuments.push({
        documentType:
          document.documentType,

        sourcePath:
          document.storagePath,

        finalPath,

        originalFileName:
          document.originalFileName,

        mimeType:
          document.mimeType,

        fileSize:
          document.fileSize,
      });
    }

    const documentRows =
      preparedDocuments.map(
        (
          document,
        ) => ({
          request_id:
            insuranceRequest.id,

          document_type:
            document.documentType,

          storage_path:
            document.finalPath,

          original_file_name:
            document.originalFileName,

          mime_type:
            document.mimeType,

          file_size:
            document.fileSize,

          uploaded_at:
            new Date().toISOString(),
        }),
      );

    const {
      error:
        documentsError,
    } =
      await serviceClient
        .from(
          "uploaded_documents",
        )
        .insert(
          documentRows,
        );

    if (
      documentsError
    ) {
      throw new Error(
        `Enregistrement des documents impossible : ${documentsError.message}`,
      );
    }

    /*
     * Historique :
     * création du dossier.
     */
    await logActivity({
      requestId:
        insuranceRequest.id,

      userId:
        null,

      action:
        "request_created",

      description:
        "Le dossier d’assurance a été créé par le client.",
    });

    /*
     * ============================
     * RENOUVELLEMENT AUTOMATIQUE
     * ============================
     */
    try {
      const {
        data:
          previousRequestsData,
        error:
          previousRequestsError,
      } =
        await serviceClient
          .from(
            "insurance_requests",
          )
          .select(
            `
              id,
              created_at
            `,
          )
          .eq(
            "passport_number",
            passportNumber,
          )
          .neq(
            "id",
            insuranceRequest.id,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          );

      if (
        previousRequestsError
      ) {
        console.error(
          "Recherche ancien dossier pour renouvellement impossible :",
          previousRequestsError.message,
        );
      } else {
        const previousRequestIds =
          (
            previousRequestsData ??
            []
          ).map(
            (
              previousRequest,
            ) =>
              previousRequest.id,
          );

        if (
          previousRequestIds.length >
          0
        ) {
          const {
            data:
              interestedRenewal,
            error:
              interestedRenewalError,
          } =
            await serviceClient
              .from(
                "insurance_renewals",
              )
              .select(
                `
                  id,
                  request_id,
                  renewed_request_id,
                  status,
                  updated_at
                `,
              )
              .in(
                "request_id",
                previousRequestIds,
              )
              .eq(
                "status",
                "interested",
              )
              .is(
                "renewed_request_id",
                null,
              )
              .order(
                "updated_at",
                {
                  ascending:
                    false,
                },
              )
              .limit(
                1,
              )
              .maybeSingle();

          if (
            interestedRenewalError
          ) {
            console.error(
              "Recherche du renouvellement intéressé impossible :",
              interestedRenewalError.message,
            );
          } else if (
            interestedRenewal
          ) {
            const renewalCompletedAt =
              new Date().toISOString();

            const {
              error:
                renewalUpdateError,
            } =
              await serviceClient
                .from(
                  "insurance_renewals",
                )
                .update({
                  renewed_request_id:
                    insuranceRequest.id,

                  status:
                    "completed",

                  updated_at:
                    renewalCompletedAt,
                })
                .eq(
                  "id",
                  interestedRenewal.id,
                );

            if (
              renewalUpdateError
            ) {
              console.error(
                "Finalisation automatique du renouvellement impossible :",
                renewalUpdateError.message,
              );
            } else {
              await logActivity({
                requestId:
                  interestedRenewal.request_id,

                userId:
                  null,

                action:
                  "renewal_completed",

                description:
                  `Le renouvellement a été confirmé par la création du nouveau dossier ${insuranceRequest.request_code}.`,
              });
            }
          }
        }
      }
    } catch (
      renewalLinkError
    ) {
      /*
       * Une erreur de liaison du renouvellement
       * ne doit pas annuler la nouvelle demande.
       */
      console.error(
        "Erreur lors de la liaison automatique du renouvellement :",
        renewalLinkError,
      );
    }

    /*
     * Tout est validé :
     * ne rien supprimer dans le catch.
     */
    movedStoragePaths.length =
      0;

    pendingStoragePaths.length =
      0;

    return NextResponse.json(
      {
        success:
          true,

        requestId:
          insuranceRequest.id,

        requestCode:
          insuranceRequest.request_code,

        status:
          "waiting_payment",

        hasKimlik:
          payload.hasKimlik,

        insuranceStartDate:
          payload.hasKimlik
            ? null
            : payload.insuranceStartDate,
      },
      {
        status:
          201,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Erreur de création du dossier :",
      error,
    );

    /*
     * Nettoyage des fichiers déjà déplacés.
     */
    if (
      movedStoragePaths.length >
      0
    ) {
      const {
        error:
          movedCleanupError,
      } =
        await serviceClient.storage
          .from(
            BUCKET_NAME,
          )
          .remove(
            movedStoragePaths,
          );

      if (
        movedCleanupError
      ) {
        console.error(
          "Nettoyage des fichiers déplacés impossible :",
          movedCleanupError,
        );
      }
    }

    /*
     * Nettoyage des fichiers qui seraient
     * encore dans pending/.
     */
    if (
      pendingStoragePaths.length >
      0
    ) {
      const {
        error:
          pendingCleanupError,
      } =
        await serviceClient.storage
          .from(
            BUCKET_NAME,
          )
          .remove(
            pendingStoragePaths,
          );

      if (
        pendingCleanupError
      ) {
        console.error(
          "Nettoyage des fichiers temporaires impossible :",
          pendingCleanupError,
        );
      }
    }

    if (
      createdRequestId
    ) {
      const {
        error:
          requestCleanupError,
      } =
        await serviceClient
          .from(
            "insurance_requests",
          )
          .delete()
          .eq(
            "id",
            createdRequestId,
          );

      if (
        requestCleanupError
      ) {
        console.error(
          "Nettoyage du dossier impossible :",
          requestCleanupError,
        );
      }
    }

    if (
      createdClientId
    ) {
      const {
        error:
          clientCleanupError,
      } =
        await serviceClient
          .from(
            "clients",
          )
          .delete()
          .eq(
            "id",
            createdClientId,
          );

      if (
        clientCleanupError
      ) {
        console.error(
          "Nettoyage du client impossible :",
          clientCleanupError,
        );
      }
    }

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
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