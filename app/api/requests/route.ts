import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity/logActivity";
import {
  calculateInsurancePriceServer,
} from "@/lib/insurance/calculatePriceServer";

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

const IP_RATE_LIMIT =
  8;

const IP_RATE_LIMIT_WINDOW_SECONDS =
  10 * 60;

function rateLimitedResponse(
  retryAfterSeconds: number,
) {
  return NextResponse.json(
    {
      success:
        false,

      error:
        "Trop de demandes ont été envoyées. Veuillez patienter quelques minutes avant de réessayer.",
    },
    {
      status:
        429,

      headers: {
        "Retry-After":
          String(
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

type UploadedFileData = {
  documentType: DocumentType;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
};

/*
 * Nettoie le nom du fichier avant
 * son enregistrement dans Supabase Storage.
 */
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

/*
 * Vérification des fichiers.
 */
function validateFile(
  file: File,
  label: string,
) {
  if (
    !ALLOWED_FILE_TYPES.includes(
      file.type,
    )
  ) {
    throw new Error(
      `${label} : format non accepté. Utilisez PDF, JPG, JPEG ou PNG.`,
    );
  }

  if (file.size === 0) {
    throw new Error(
      `${label} : le fichier est vide.`,
    );
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    throw new Error(
      `${label} : le fichier ne doit pas dépasser 10 Mo.`,
    );
  }
}

/*
 * Vérification d'une date.
 */
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

/*
 * Date du jour au format YYYY-MM-DD.
 */
function getTodayDate(): string {
  return new Date()
    .toISOString()
    .split("T")[0];
}

/*
 * Génération sécurisée du code dossier.
 * Le navigateur ne choisit jamais ce code.
 */
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

/*
 * Upload d'un document vers
 * Supabase Storage.
 */
async function uploadFile({
  serviceClient,
  requestId,
  documentType,
  file,
}: {
  serviceClient: ReturnType<
    typeof createServiceClient
  >;

  requestId: string;

  documentType: DocumentType;

  file: File;
}): Promise<UploadedFileData> {
  validateFile(
    file,
    documentType,
  );

  const safeName =
    sanitizeFileName(
      file.name,
    );

  const storagePath =
    `${requestId}/${documentType}/` +
    `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const fileBuffer =
    await file.arrayBuffer();

  const {
    error: uploadError,
  } = await serviceClient.storage
    .from(BUCKET_NAME)
    .upload(
      storagePath,
      fileBuffer,
      {
        contentType:
          file.type,

        cacheControl:
          "3600",

        upsert: false,
      },
    );

  if (uploadError) {
    throw new Error(
      `Téléversement impossible pour ${documentType} : ${uploadError.message}`,
    );
  }

  return {
    documentType,

    storagePath,

    originalFileName:
      file.name,

    mimeType:
      file.type,

    fileSize:
      file.size,
  };
}

/*
 * Création d'une nouvelle demande.
 */
export async function POST(
  request: Request,
) {
  /*
   * ============================================
   * RATE LIMIT PAR ADRESSE IP
   * ============================================
   */
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

  /*
   * Ces variables permettent
   * d'annuler les opérations
   * si une erreur survient.
   */
  let createdClientId:
    | string
    | null = null;

  let createdRequestId:
    | string
    | null = null;

  const uploadedStoragePaths:
    string[] = [];

  try {
    /*
     * Lecture du formulaire.
     */
    const formData =
      await request.formData();

    const payloadRaw =
      formData.get(
        "payload",
      );

    if (
      typeof payloadRaw !==
      "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Les données de la demande sont absentes.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Conversion du payload JSON.
     */
    let payload:
      RequestPayload;

    try {
      payload =
        JSON.parse(
          payloadRaw,
        ) as RequestPayload;
    } catch {
      return NextResponse.json(
        {
          error:
            "Les données de la demande sont invalides.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Récupération des fichiers.
     */
    const passportFile =
      formData.get(
        "passportFile",
      );

    const kimlikFrontFile =
      formData.get(
        "kimlikFrontFile",
      );

    const kimlikBackFile =
      formData.get(
        "kimlikBackFile",
      );


    /*
     * Passeport obligatoire.
     */
    if (
      !(
        passportFile instanceof
        File
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Le passeport est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }


    /*
     * Kimlik recto/verso obligatoires
     * seulement si le client possède
     * déjà un Kimlik.
     */
    if (payload.hasKimlik) {
      if (
        !(
          kimlikFrontFile instanceof
          File
        ) ||
        !(
          kimlikBackFile instanceof
          File
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Le Kimlik recto et le Kimlik verso sont obligatoires.",
          },
          {
            status: 400,
          },
        );
      }
    }

    /*
     * Normalisation des données.
     */
    const preferredLanguage =
      payload.preferredLanguage === "en" ||
      payload.preferredLanguage === "tr"
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

    /*
     * Vérification des informations
     * obligatoires.
     */
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
          error:
            "Certaines informations obligatoires sont absentes.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Vérification du sexe.
     */
    if (
      payload.gender !==
        "male" &&
      payload.gender !==
        "female"
    ) {
      return NextResponse.json(
        {
          error:
            "Le sexe renseigné est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Vérification de la durée.
     */
    if (
      payload.duration !== 1 &&
      payload.duration !== 2
    ) {
      return NextResponse.json(
        {
          error:
            "La durée de l’assurance est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Recalcul sécurisé du prix côté serveur.
     *
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

    /*
     * Vérification de la date
     * de naissance.
     */
    if (
      !isValidDate(
        payload.birthDate,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "La date de naissance est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Vérification de l'adresse.
     */
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
          error:
            "L’adresse complète est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Cas 1 :
     * le client possède déjà un Kimlik.
     */
    if (payload.hasKimlik) {
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
            error:
              "La date d’expiration du Kimlik est invalide.",
          },
          {
            status: 400,
          },
        );
      }
    } else {
      /*
       * Cas 2 :
       * première demande de Kimlik.
       */
      if (
        !payload.insuranceStartDate
      ) {
        return NextResponse.json(
          {
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
     * Vérification des fichiers.
     */
    validateFile(
      passportFile,
      "Passeport",
    );


    if (
      payload.hasKimlik &&
      kimlikFrontFile instanceof
        File &&
      kimlikBackFile instanceof
        File
    ) {
      validateFile(
        kimlikFrontFile,
        "Kimlik recto",
      );

      validateFile(
        kimlikBackFile,
        "Kimlik verso",
      );
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
          error:
            "Ce code de dossier existe déjà. Recommencez la soumission.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * ============================================
     * RECHERCHE / CRÉATION DU CLIENT
     * ============================================
     *
     * Objectif :
     * éviter de créer plusieurs fiches CRM
     * pour la même personne.
     *
     * Priorité :
     * 1. Kimlik si disponible
     * 2. Passeport sinon
     *
     * Une correspondance n'est acceptée que si
     * le nom, le prénom et la date de naissance
     * correspondent également.
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

    /*
     * ============================================
     * CLIENT EXISTANT
     * ============================================
     */

    if (
      existingClientId
    ) {
      /*
       * Client déjà connu.
       *
       * Sécurité :
       * une demande publique ne doit jamais
       * modifier automatiquement la fiche CRM
       * d'un client existant.
       *
       * On réutilise uniquement son identifiant.
       */
      clientId =
        existingClientId;
    }

    /*
     * ============================================
     * NOUVEAU CLIENT
     * ============================================
     */

    else {
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

      /*
       * Important :
       * createdClientId ne doit être renseigné
       * que pour un client réellement créé.
       * Ainsi, le catch ne supprimera jamais
       * une ancienne fiche client réutilisée.
       */
      createdClientId =
        newClient.id;
    }

    /*
     * Création du dossier.
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
     * Liste des fichiers à téléverser.
     */
    const filesToUpload: Array<{
      documentType: DocumentType;
      file: File;
    }> = [
      {
        documentType:
          "passport",

        file:
          passportFile,
      },

    ];

    /*
     * Si le client possède déjà
     * un Kimlik, on ajoute les
     * deux faces aux documents.
     */
    if (
      payload.hasKimlik &&
      kimlikFrontFile instanceof
        File &&
      kimlikBackFile instanceof
        File
    ) {
      filesToUpload.push(
        {
          documentType:
            "kimlik_front",

          file:
            kimlikFrontFile,
        },

        {
          documentType:
            "kimlik_back",

          file:
            kimlikBackFile,
        },
      );
    }

    /*
     * Upload des fichiers vers
     * Supabase Storage.
     */
    const uploadedFiles:
      UploadedFileData[] = [];

    for (
      const item of
      filesToUpload
    ) {
      const uploadedFile =
        await uploadFile({
          serviceClient,

          requestId:
            insuranceRequest.id,

          documentType:
            item.documentType,

          file:
            item.file,
        });

      uploadedFiles.push(
        uploadedFile,
      );

      uploadedStoragePaths.push(
        uploadedFile.storagePath,
      );
    }

    /*
     * Préparation des lignes pour
     * uploaded_documents.
     */
    const documentRows =
      uploadedFiles.map(
        (
          uploadedFile,
        ) => ({
          request_id:
            insuranceRequest.id,

          document_type:
            uploadedFile.documentType,

          storage_path:
            uploadedFile.storagePath,

          original_file_name:
            uploadedFile.originalFileName,

          mime_type:
            uploadedFile.mimeType,

          file_size:
            uploadedFile.fileSize,

          uploaded_at:
            new Date().toISOString(),
        }),
      );

    /*
     * Enregistrement des documents.
     */
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
     * ============================================
     * RENOUVELLEMENT AUTOMATIQUE
     * ============================================
     *
     * Si le client avait déjà confirmé son intérêt
     * pour renouveler une ancienne assurance,
     * on relie cette ancienne assurance au nouveau
     * dossier qui vient d'être créé.
     *
     * On utilise le numéro de passeport car chaque
     * nouvelle demande crée actuellement un nouveau
     * client_id.
     */

    try {
      /*
       * On recherche les anciens dossiers
       * appartenant au même numéro de passeport.
       */
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
          /*
           * On cherche uniquement un renouvellement :
           *
           * - déjà marqué "interested"
           * - pas encore relié à une nouvelle demande
           * - lié à un ancien dossier du même passeport
           */
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
     * Toutes les opérations importantes
     * ont réussi.
     *
     * On vide cette liste afin d'éviter
     * de supprimer les fichiers dans le catch.
     */
    uploadedStoragePaths.length =
      0;

    /*
     * Réponse envoyée au client.
     */
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
      },
    );
  } catch (error) {
    console.error(
      "Erreur de création du dossier :",
      error,
    );

    /*
     * Nettoyage des fichiers
     * téléversés si une erreur
     * survient avant la fin.
     */
    if (
      uploadedStoragePaths.length >
      0
    ) {
      const {
        error:
          storageCleanupError,
      } =
        await serviceClient.storage
          .from(
            BUCKET_NAME,
          )
          .remove(
            uploadedStoragePaths,
          );

      if (
        storageCleanupError
      ) {
        console.error(
          "Nettoyage des fichiers impossible :",
          storageCleanupError,
        );
      }
    }

    /*
     * Suppression du dossier.
     *
     * Comme les tables dépendantes
     * utilisent normalement ON DELETE
     * CASCADE, documents, paiement,
     * activity_logs, etc. doivent
     * également disparaître.
     */
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

    /*
     * Suppression du client créé
     * pour cette demande.
     */
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
        error:
          error instanceof
          Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      {
        status:
          500,
      },
    );
  }
}