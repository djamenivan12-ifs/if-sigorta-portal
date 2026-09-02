import {
  NextResponse,
} from "next/server";

import {
  requireApiPartner,
} from "@/lib/auth/requireApiPartner";

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

type UploadUrlPayload = {
  documentType?: DocumentType;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  uploadSessionId?: string;
};

function sanitizeFileName(
  fileName: string,
) {
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
   * Le partnerId vient exclusivement
   * de la session authentifiée.
   *
   * Il n'est jamais accepté depuis
   * le navigateur.
   */
  const partnerId =
    auth.partner.id;

  try {
    const body =
      (await request.json()) as
        UploadUrlPayload;

    const {
      documentType,
      fileName,
      mimeType,
      fileSize,
      uploadSessionId,
    } = body;

    /*
     * ============================
     * TYPE DE DOCUMENT
     * ============================
     */

    if (
      !isDocumentType(
        documentType,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Type de document invalide.",
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
     * ============================
     * NOM DU FICHIER
     * ============================
     */

    if (
      !fileName ||
      typeof fileName !==
        "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Nom de fichier manquant.",
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
     * ============================
     * FORMAT
     * ============================
     */

    if (
      !mimeType ||
      !ALLOWED_FILE_TYPES.includes(
        mimeType,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Format non accepté. Utilisez PDF, JPG, JPEG ou PNG.",
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
     * ============================
     * TAILLE
     * ============================
     */

    if (
      !fileSize ||
      !Number.isFinite(
        fileSize,
      ) ||
      fileSize <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le fichier est vide ou invalide.",
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
      fileSize >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le fichier ne doit pas dépasser 10 Mo.",
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
     * ============================
     * SESSION D'UPLOAD
     * ============================
     */

    const safeUploadSessionId =
      isValidUploadSessionId(
        uploadSessionId,
      )
        ? uploadSessionId
        : crypto.randomUUID();

    const safeFileName =
      sanitizeFileName(
        fileName,
      );

    /*
     * Chaque partenaire possède son
     * propre espace temporaire.
     *
     * pending/
     *   partner/
     *     {partnerId}/
     *       {session}/
     *         {documentType}/
     *           fichier
     */
    const storagePath =
      `pending/partner/${partnerId}/` +
      `${safeUploadSessionId}/` +
      `${documentType}/` +
      `${Date.now()}-` +
      `${crypto.randomUUID()}-` +
      `${safeFileName}`;

    /*
     * ============================
     * URL SIGNÉE SUPABASE
     * ============================
     */

    const serviceClient =
      createServiceClient();

    const {
      data,
      error,
    } =
      await serviceClient.storage
        .from(
          BUCKET_NAME,
        )
        .createSignedUploadUrl(
          storagePath,
        );

    if (
      error ||
      !data
    ) {
      console.error(
        "Erreur création URL signée partenaire :",
        error,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de préparer le téléversement du document.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================
     * RÉPONSE
     * ============================
     */

    return NextResponse.json(
      {
        success: true,

        uploadSessionId:
          safeUploadSessionId,

        documentType,

        storagePath:
          data.path,

        token:
          data.token,
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
      "Erreur upload-url partenaire :",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}