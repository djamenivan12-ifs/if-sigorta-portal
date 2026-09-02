import {
  NextResponse,
} from "next/server";

import {
  logActivity,
} from "@/lib/activity/logActivity";

import {
  requireApiPartner,
} from "@/lib/auth/requireApiPartner";

import {
  calculatePartnerInsurancePriceServer,
} from "@/lib/insurance/calculatePriceServer";

import {
  createServiceClient,
} from "@/lib/supabase/service";

const BUCKET_NAME =
  "insurance-documents";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

type DocumentType =
  | "passport"
  | "kimlik_front"
  | "kimlik_back";

type RequestPayload = {
  preferredLanguage:
    | "fr"
    | "en"
    | "tr";

  lastName: string;
  firstName: string;
  fatherName: string;

  birthDate: string;

  gender:
    | "male"
    | "female";

  nationality: string;

  whatsappCountryCode:
    string;

  whatsappNumber:
    string;

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

  kimlikExpirationDate:
    string;

  insuranceStartDate:
    string;

  passportNumber:
    string;

  duration:
    | 1
    | 2;

  /*
   * Ces deux valeurs peuvent être
   * envoyées par l'interface mais
   * elles ne seront JAMAIS utilisées
   * comme valeurs de confiance.
   */
  calculatedAge?: number;
  calculatedPrice?: number;
};

type UploadedDocumentPayload = {
  documentType:
    DocumentType;

  storagePath:
    string;

  originalFileName:
    string;

  mimeType:
    string;

  fileSize:
    number;
};

type CreateRequestBody = {
  payload?:
    RequestPayload;

  uploadSessionId?:
    string;

  documents?:
    UploadedDocumentPayload[];
};

type PreparedDocument = {
  documentType:
    DocumentType;

  sourcePath:
    string;

  finalPath:
    string;

  originalFileName:
    string;

  mimeType:
    string;

  fileSize:
    number;
};

function jsonError(
  error: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    {
      status,
      headers: {
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
    typeof value ===
      "string" &&
    /^[a-f0-9-]{36}$/i.test(
      value,
    )
  );
}

function validateUploadedDocument(
  document:
    UploadedDocumentPayload,
  uploadSessionId:
    string,
  partnerId:
    string,
) {
  if (
    !document ||
    typeof document !==
      "object"
  ) {
    throw new Error(
      "Document invalide.",
    );
  }

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

  /*
   * Protection essentielle :
   *
   * le document doit appartenir
   * au partenaire actuellement
   * authentifié ET à la session
   * d'upload actuelle.
   */
  const expectedPrefix =
    `pending/partner/${partnerId}/` +
    `${uploadSessionId}/` +
    `${document.documentType}/`;

  if (
    !document.storagePath ||
    typeof document.storagePath !==
      "string" ||
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

  /*
   * Vérification stricte YYYY-MM-DD.
   */
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return false;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  return (
    date.getUTCFullYear() ===
      year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() ===
      day
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
      .replace(
        /-/g,
        "",
      )
      .slice(
        0,
        8,
      )
      .toUpperCase();

  return `IF-${year}-${randomPart}`;
}

function buildFinalStoragePath(
  requestId:
    string,
  document:
    UploadedDocumentPayload,
) {
  const fileName =
    document.storagePath
      .split("/")
      .pop() ||
    `${Date.now()}-${crypto.randomUUID()}`;

  return (
    `${requestId}/` +
    `${document.documentType}/` +
    `${fileName}`
  );
}

export async function POST(
  request: Request,
) {
  /*
   * ============================
   * AUTHENTIFICATION PARTENAIRE
   * ============================
   */

  const auth =
    await requireApiPartner();

  if (!auth.success) {
    return auth.response;
  }

  /*
   * Ces informations viennent
   * exclusivement de la session
   * authentifiée.
   */
  const partner =
    auth.partner;

  const authenticatedUser =
    auth.user;

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
     * LECTURE DU JSON
     * ============================
     *
     * Les fichiers ont déjà été
     * téléversés directement dans
     * Supabase Storage.
     */

    const body =
      (await request.json()) as
        CreateRequestBody;

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
      return jsonError(
        "Les données de la demande sont absentes.",
        400,
      );
    }

    if (
      !isValidUploadSessionId(
        uploadSessionId,
      )
    ) {
      return jsonError(
        "La session de téléversement est invalide.",
        400,
      );
    }

    /*
     * ============================
     * DOCUMENTS
     * ============================
     */

    for (
      const document of
      documents
    ) {
      validateUploadedDocument(
        document,
        uploadSessionId,
        partner.id,
      );

      pendingStoragePaths.push(
        document.storagePath,
      );
    }

    /*
     * Un même type de document
     * ne doit pas être envoyé
     * plusieurs fois.
     */
    const documentTypes =
      documents.map(
        (document) =>
          document.documentType,
      );

    if (
      new Set(
        documentTypes,
      ).size !==
      documentTypes.length
    ) {
      return jsonError(
        "Un même type de document a été envoyé plusieurs fois.",
        400,
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
      return jsonError(
        "Le passeport est obligatoire.",
        400,
      );
    }

    if (
      payload.hasKimlik &&
      (
        !kimlikFrontDocument ||
        !kimlikBackDocument
      )
    ) {
      return jsonError(
        "Le Kimlik recto et le Kimlik verso sont obligatoires.",
        400,
      );
    }

    /*
     * Si le client n'a pas de
     * Kimlik, aucun document Kimlik
     * ne doit être attaché au dossier.
     */
    if (
      !payload.hasKimlik &&
      (
        kimlikFrontDocument ||
        kimlikBackDocument
      )
    ) {
      return jsonError(
        "Les documents Kimlik ne sont pas attendus pour ce dossier.",
        400,
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
     * ============================
     * CHAMPS OBLIGATOIRES
     * ============================
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
      return jsonError(
        "Certaines informations obligatoires sont absentes.",
        400,
      );
    }

    if (
      payload.gender !==
        "male" &&
      payload.gender !==
        "female"
    ) {
      return jsonError(
        "Le sexe renseigné est invalide.",
        400,
      );
    }

    if (
      payload.duration !== 1 &&
      payload.duration !== 2
    ) {
      return jsonError(
        "La durée de l’assurance est invalide.",
        400,
      );
    }

    if (
      !isValidDate(
        payload.birthDate,
      )
    ) {
      return jsonError(
        "La date de naissance est invalide.",
        400,
      );
    }

    /*
     * ============================
     * TARIF PARTENAIRE
     * ============================
     *
     * Le prix et l'âge éventuellement
     * envoyés par le navigateur sont
     * totalement ignorés.
     */

    const serverPriceResult =
      await calculatePartnerInsurancePriceServer(
        partner.id,
        payload.birthDate,
        payload.duration,
      );

    if (
      !serverPriceResult ||
      !serverPriceResult.available ||
      serverPriceResult.price ===
        null
    ) {
      return jsonError(
        "Le tarif partenaire n’est pas disponible pour cet âge.",
        400,
      );
    }

    const calculatedAge =
      serverPriceResult.age;

    const calculatedPrice =
      serverPriceResult.price;

    /*
     * ============================
     * ADRESSE
     * ============================
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
      return jsonError(
        "L’adresse complète est obligatoire.",
        400,
      );
    }

    const provinceId =
      Number(
        payload.address
          .provinceId,
      );

    const districtId =
      Number(
        payload.address
          .districtId,
      );

    const neighborhoodId =
      Number(
        payload.address
          .neighborhoodId,
      );

    if (
      !Number.isInteger(
        provinceId,
      ) ||
      provinceId <= 0 ||
      !Number.isInteger(
        districtId,
      ) ||
      districtId <= 0 ||
      !Number.isInteger(
        neighborhoodId,
      ) ||
      neighborhoodId <= 0
    ) {
      return jsonError(
        "L’adresse renseignée est invalide.",
        400,
      );
    }

    /*
     * ============================
     * KIMLIK / DATE DE DÉBUT
     * ============================
     */

    let normalizedKimlikNumber =
      "";

    if (
      payload.hasKimlik
    ) {
      normalizedKimlikNumber =
        payload.kimlikNumber
          ?.replace(
            /\D/g,
            "",
          ) ??
        "";

      if (
        !/^\d{11}$/.test(
          normalizedKimlikNumber,
        )
      ) {
        return jsonError(
          "Le numéro de Kimlik doit contenir exactement 11 chiffres.",
          400,
        );
      }

      if (
        !payload.kimlikExpirationDate
      ) {
        return jsonError(
          "La date d’expiration du Kimlik est obligatoire.",
          400,
        );
      }

      if (
        !isValidDate(
          payload.kimlikExpirationDate,
        )
      ) {
        return jsonError(
          "La date d’expiration du Kimlik est invalide.",
          400,
        );
      }
    } else {
      if (
        !payload.insuranceStartDate
      ) {
        return jsonError(
          "La date souhaitée de début de l’assurance est obligatoire.",
          400,
        );
      }

      if (
        !isValidDate(
          payload.insuranceStartDate,
        )
      ) {
        return jsonError(
          "La date souhaitée de début de l’assurance est invalide.",
          400,
        );
      }

      if (
        payload.insuranceStartDate <
        getTodayDate()
      ) {
        return jsonError(
          "La date souhaitée de début de l’assurance ne peut pas être dans le passé.",
          400,
        );
      }
    }

    /*
     * ============================
     * CODE DOSSIER
     * ============================
     */

    let requestCode =
      "";

    /*
     * Les collisions sont extrêmement
     * improbables mais nous faisons
     * plusieurs tentatives.
     */
    for (
      let attempt = 0;
      attempt < 5;
      attempt += 1
    ) {
      const candidate =
        generateRequestCode();

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
          .select(
            "id",
          )
          .eq(
            "request_code",
            candidate,
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
        !existingRequest
      ) {
        requestCode =
          candidate;

        break;
      }
    }

    if (!requestCode) {
      throw new Error(
        "Impossible de générer un code de dossier unique.",
      );
    }

    /*
     * ============================
     * RECHERCHE CLIENT EXISTANT
     * ============================
     *
     * Nous conservons la même logique
     * que pour les demandes directes.
     */

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

    /*
     * ============================
     * CRÉATION CLIENT
     * ============================
     */

    let clientId:
      string;

    if (
      existingClientId
    ) {
      /*
       * Comme pour une demande directe,
       * on ne modifie pas automatiquement
       * une fiche CRM existante.
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
              provinceId,

            district_id:
              districtId,

            neighborhood_id:
              neighborhoodId,

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

          /*
           * IMPORTANT :
           * la source et le partenaire
           * viennent du serveur.
           */
          source:
            "partner",

          partner_id:
            partner.id,

          preferred_language:
            preferredLanguage,

          has_kimlik:
            payload.hasKimlik,

          kimlik_number:
            payload.hasKimlik
              ? normalizedKimlikNumber
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

          /*
           * PRIX FIGÉ :
           *
           * ce montant restera celui du
           * dossier même si l'admin change
           * ensuite la grille du partenaire.
           */
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
     * DÉPLACEMENT DOCUMENTS
     * ============================
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

    /*
     * ============================
     * DOCUMENTS EN BASE
     * ============================
     */

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
            new Date()
              .toISOString(),
        }),
      );

    if (
      documentRows.length >
      0
    ) {
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
    }

    /*
     * ============================
     * HISTORIQUE
     * ============================
     */

    await logActivity({
      requestId:
        insuranceRequest.id,

      userId:
        authenticatedUser.id,

      action:
        "request_created",

      description:
        `Le dossier d’assurance a été créé par le partenaire ${partner.companyName} (${partner.code}).`,
    });

    /*
     * Le dossier est maintenant créé.
     *
     * Les tableaux de rollback ne
     * doivent donc plus supprimer
     * les fichiers.
     */
    movedStoragePaths.length =
      0;

    pendingStoragePaths.length =
      0;

    /*
     * ============================
     * RÉPONSE
     * ============================
     */

    return NextResponse.json(
      {
        success: true,

        requestId:
          insuranceRequest.id,

        requestCode:
          insuranceRequest.request_code,

        status:
          "waiting_payment",

        source:
          "partner",

        calculatedAge,

        calculatedPrice,

        duration:
          payload.duration,

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
      "Erreur de création du dossier partenaire :",
      error,
    );

    /*
     * ============================
     * ROLLBACK STORAGE
     * ============================
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
          "Nettoyage des fichiers temporaires partenaire impossible :",
          pendingCleanupError,
        );
      }
    }

    /*
     * ============================
     * ROLLBACK BASE
     * ============================
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
          "Nettoyage du dossier partenaire impossible :",
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
        success: false,

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