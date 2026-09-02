import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity/logActivity";
import { requireApiPartner } from "@/lib/auth/requireApiPartner";
import { createServiceClient } from "@/lib/supabase/service";

const BUCKET_NAME = "insurance-documents";

const SIGNED_URL_DURATION_SECONDS = 60 * 5;

type PolicyYear = 1 | 2;

type DownloadPayload = {
  policyYear?: PolicyYear;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function sanitizeFileNamePart(
  value: string,
): string {
  return value
    .normalize("NFC")
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,

    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    /*
     * ============================================
     * 1. PARTENAIRE AUTHENTIFIÉ
     * ============================================
     */

    const auth =
      await requireApiPartner();

    if (!auth.success) {
      return auth.response;
    }

    const {
      user,
      partner,
    } = auth;

    /*
     * ============================================
     * 2. DOSSIER
     * ============================================
     */

    const { id } =
      await context.params;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error:
            "Identifiant du dossier absent.",
        },
        400,
      );
    }

    /*
     * ============================================
     * 3. ANNÉE DEMANDÉE
     * ============================================
     */

    let body: DownloadPayload;

    try {
      body =
        (await request.json()) as DownloadPayload;
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "Les données envoyées sont invalides.",
        },
        400,
      );
    }

    const policyYear =
      body.policyYear;

    if (
      policyYear !== 1 &&
      policyYear !== 2
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "L’année de la police demandée est invalide.",
        },
        400,
      );
    }

    const serviceClient =
      createServiceClient();

    /*
     * ============================================
     * 4. VÉRIFICATION DU DOSSIER PARTENAIRE
     * ============================================
     *
     * Le partner_id ne provient jamais du client.
     * Il provient exclusivement de la session.
     */

    const {
      data: insuranceRequest,
      error: requestError,
    } =
      await serviceClient
        .from("insurance_requests")
        .select(
          `
            id,
            request_code,
            source,
            partner_id,
            status,
            client_id,
            insurance_duration_years,

            client:clients (
              first_name,
              last_name
            )
          `,
        )
        .eq("id", id)
        .eq("source", "partner")
        .eq(
          "partner_id",
          partner.id,
        )
        .maybeSingle();

    if (requestError) {
      throw new Error(
        requestError.message,
      );
    }

    if (!insuranceRequest) {
      return jsonResponse(
        {
          success: false,
          error:
            "Dossier introuvable.",
        },
        404,
      );
    }

    /*
     * ============================================
     * 5. POLICE DISPONIBLE
     * ============================================
     */

    if (
      insuranceRequest.status !==
      "policy_available"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Les polices d’assurance ne sont pas encore disponibles.",
        },
        409,
      );
    }

    const durationYears =
      insuranceRequest
        .insurance_duration_years === 2
        ? 2
        : 1;

    if (
      durationYears === 1 &&
      policyYear === 2
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Ce dossier ne comporte pas de police pour l’année 2.",
        },
        404,
      );
    }

    /*
     * ============================================
     * 6. POLICE
     * ============================================
     */

    const {
      data: policy,
      error: policyError,
    } =
      await serviceClient
        .from(
          "insurance_policies",
        )
        .select(
          `
            id,
            policy_number,
            policy_year,
            storage_path,
            issue_date,
            expiration_date
          `,
        )
        .eq(
          "request_id",
          insuranceRequest.id,
        )
        .eq(
          "policy_year",
          policyYear,
        )
        .maybeSingle();

    if (policyError) {
      throw new Error(
        policyError.message,
      );
    }

    if (!policy?.storage_path) {
      return jsonResponse(
        {
          success: false,
          error:
            `La police de l’année ${policyYear} n’est pas disponible.`,
        },
        404,
      );
    }

    /*
     * ============================================
     * 7. CLIENT
     * ============================================
     */

    const clientRelation =
      insuranceRequest.client;

    const client =
      Array.isArray(clientRelation)
        ? clientRelation[0] ?? null
        : clientRelation;

    if (!client) {
      return jsonResponse(
        {
          success: false,
          error:
            "Les informations du client sont introuvables.",
        },
        404,
      );
    }

    /*
     * ============================================
     * 8. NOM DU PDF
     * ============================================
     */

    const safeFirstName =
      sanitizeFileNamePart(
        client.first_name ?? "",
      ) || "PRENOM";

    const safeLastName =
      sanitizeFileNamePart(
        client.last_name ?? "",
      ) || "NOM";

    const safeRequestCode =
      sanitizeFileNamePart(
        insuranceRequest.request_code,
      ) || "DOSSIER";

    const baseFileName =
      `${safeFirstName}_${safeLastName}_${safeRequestCode}`;

    const fileName =
      durationYears === 1
        ? `${baseFileName}.pdf`
        : `${baseFileName}_${policyYear}.pdf`;

    /*
     * ============================================
     * 9. URL SIGNÉE
     * ============================================
     */

    const {
      data: signedUrlData,
      error: signedUrlError,
    } =
      await serviceClient.storage
        .from(BUCKET_NAME)
        .createSignedUrl(
          policy.storage_path,
          SIGNED_URL_DURATION_SECONDS,
          {
            download: fileName,
          },
        );

    if (
      signedUrlError ||
      !signedUrlData?.signedUrl
    ) {
      throw new Error(
        signedUrlError?.message ??
          "Le lien de téléchargement n’a pas pu être créé.",
      );
    }

    /*
     * ============================================
     * 10. HISTORIQUE
     * ============================================
     */

    try {
      await logActivity({
        requestId:
          insuranceRequest.id,

        userId:
          user.id,

        action:
          "policy_downloaded",

        description:
          durationYears === 1
            ? `La police d’assurance a été téléchargée par le partenaire ${partner.companyName}.`
            : `La police d’assurance année ${policyYear} a été téléchargée par le partenaire ${partner.companyName}.`,
      });
    } catch (activityError) {
      /*
       * Une erreur d'historique ne doit jamais
       * empêcher le téléchargement.
       */

      console.error(
        "Historique téléchargement partenaire impossible :",
        activityError,
      );
    }

    /*
     * ============================================
     * 11. RÉPONSE
     * ============================================
     */

    return jsonResponse({
      success: true,

      policyYear,

      policyNumber:
        policy.policy_number,

      issueDate:
        policy.issue_date,

      expirationDate:
        policy.expiration_date,

      downloadUrl:
        signedUrlData.signedUrl,

      fileName,

      expiresInSeconds:
        SIGNED_URL_DURATION_SECONDS,
    });
  } catch (error) {
    console.error(
      "Erreur téléchargement police partenaire :",
      error,
    );

    return jsonResponse(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      500,
    );
  }
}