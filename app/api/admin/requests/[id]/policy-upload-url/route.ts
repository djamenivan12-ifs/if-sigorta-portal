import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

type UploadUrlPayload = {
  policyYear?: number;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
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

export async function POST(
  request: Request,
  context: RouteContext,
) {
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
      error: userError,
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
     * 3. IDENTIFIANT DU DOSSIER
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
     * 4. JSON
     * ============================================
     */

    let body:
      UploadUrlPayload;

    try {
      body =
        (await request.json()) as
          UploadUrlPayload;
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

    const policyYear =
      Number(
        body.policyYear,
      );

    const originalFileName =
      body.originalFileName
        ?.trim() ??
      "";

    const mimeType =
      body.mimeType
        ?.trim()
        .toLowerCase() ??
      "";

    const fileSize =
      Number(
        body.fileSize,
      );

    /*
     * ============================================
     * 5. VALIDATION DU FICHIER
     * ============================================
     */

    if (
      policyYear !== 1 &&
      policyYear !== 2
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Année de police invalide.",
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
      !originalFileName
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nom du fichier est obligatoire.",
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

    const isPdf =
      mimeType ===
        "application/pdf" ||
      originalFileName
        .toLowerCase()
        .endsWith(
          ".pdf",
        );

    if (!isPdf) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Seuls les fichiers PDF sont acceptés.",
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
      !Number.isFinite(
        fileSize,
      ) ||
      fileSize <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le fichier PDF est vide ou invalide.",
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
            "Le fichier PDF ne doit pas dépasser 10 Mo.",
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
     * 6. DOSSIER
     * ============================================
     */

    const serviceClient =
      createServiceClient();

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
            status,
            insurance_duration_years,
            assigned_agent_id
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
     * 7. AUTORISATION AGENT
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
     * 8. STATUT
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

    /*
     * ============================================
     * 9. DURÉE / ANNÉE 2
     * ============================================
     */

    const insuranceDurationYears:
      | 1
      | 2 =
      insuranceRequest
        .insurance_duration_years ===
      2
        ? 2
        : 1;

    if (
      policyYear === 2 &&
      insuranceDurationYears !==
        2
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

    /*
     * ============================================
     * 10. CHEMIN TEMPORAIRE
     * ============================================
     */

    const safeFileName =
      sanitizeFileName(
        originalFileName,
      );

    const uploadSessionId =
      crypto.randomUUID();

    const storagePath =
      `pending/admin/policy/${id}/` +
      `year_${policyYear}/` +
      `${uploadSessionId}/` +
      `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    /*
     * ============================================
     * 11. URL SIGNÉE
     * ============================================
     */

    const {
      data:
        signedUpload,
      error:
        signedUploadError,
    } =
      await serviceClient.storage
        .from(
          BUCKET_NAME,
        )
        .createSignedUploadUrl(
          storagePath,
        );

    if (
      signedUploadError ||
      !signedUpload
    ) {
      throw new Error(
        signedUploadError
          ?.message ??
          "Impossible de préparer le téléversement de la police.",
      );
    }

    /*
     * ============================================
     * 12. SUCCÈS
     * ============================================
     */

    return NextResponse.json(
      {
        success: true,

        requestId:
          id,

        policyYear,

        uploadSessionId,

        path:
          signedUpload.path,

        token:
          signedUpload.token,
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
      "Erreur préparation upload police :",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
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