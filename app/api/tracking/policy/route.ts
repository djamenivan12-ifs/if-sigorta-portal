import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity/logActivity";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/security/rateLimit";

import { createServiceClient } from "@/lib/supabase/service";

const BUCKET_NAME =
  "insurance-documents";

const SIGNED_URL_DURATION_SECONDS =
  60 * 5;

const IP_RATE_LIMIT =
  20;

const IDENTITY_RATE_LIMIT =
  8;

const RATE_LIMIT_WINDOW_SECONDS =
  10 * 60;

type PolicyYear =
  | 1
  | 2;

type DownloadPayload = {
  requestCode?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;
  policyYear?: PolicyYear;
};

function cleanPhoneNumber(
  value: string,
): string {
  return value.replace(
    /\D/g,
    "",
  );
}

function sanitizeFileNamePart(
  value: string,
): string {
  return value
    .normalize("NFC")
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      "",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function rateLimitedResponse(
  retryAfterSeconds: number,
) {
  return NextResponse.json(
    {
      error:
        "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.",
    },
    {
      status: 429,

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

export async function POST(
  request: Request,
) {
  try {
    /*
     * ============================================
     * 1. RATE LIMIT PAR ADRESSE IP
     * ============================================
     */
    const clientIp =
      getClientIp(
        request,
      );

    const ipLimit =
      await consumeRateLimit({
        namespace:
          "tracking-policy-ip",

        identifier:
          clientIp,

        limit:
          IP_RATE_LIMIT,

        windowSeconds:
          RATE_LIMIT_WINDOW_SECONDS,
      });

    if (
      !ipLimit.allowed
    ) {
      return rateLimitedResponse(
        ipLimit.retryAfterSeconds,
      );
    }

    /*
     * ============================================
     * 2. LECTURE ET NORMALISATION
     * ============================================
     */
    const body =
      (await request.json()) as DownloadPayload;

    const requestCode =
      body.requestCode
        ?.trim()
        .toUpperCase() ??
      "";

    const whatsappCountryCode =
      body.whatsappCountryCode
        ?.trim() ??
      "";

    const whatsappNumber =
      cleanPhoneNumber(
        body.whatsappNumber ??
          "",
      );

    const policyYear =
      body.policyYear;

    if (
      !requestCode ||
      !whatsappCountryCode ||
      !whatsappNumber
    ) {
      return NextResponse.json(
        {
          error:
            "Le code du dossier et le numéro WhatsApp sont obligatoires.",
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
      policyYear !== 1 &&
      policyYear !== 2
    ) {
      return NextResponse.json(
        {
          error:
            "L’année de la police demandée est invalide.",
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
     * 3. RATE LIMIT PAR IDENTITÉ
     * ============================================
     */
    const identityLimit =
      await consumeRateLimit({
        namespace:
          "tracking-policy-identity",

        identifier:
          `${requestCode}|${whatsappCountryCode}|${whatsappNumber}|${policyYear}`,

        limit:
          IDENTITY_RATE_LIMIT,

        windowSeconds:
          RATE_LIMIT_WINDOW_SECONDS,
      });

    if (
      !identityLimit.allowed
    ) {
      return rateLimitedResponse(
        identityLimit.retryAfterSeconds,
      );
    }

    const serviceClient =
      createServiceClient();

    /*
     * ============================================
     * 4. RECHERCHE DU DOSSIER
     * ============================================
     *
     * Cette API appartient exclusivement au
     * parcours public des clients directs.
     *
     * Les dossiers créés par un partenaire ne
     * doivent jamais pouvoir obtenir leur police
     * depuis /api/tracking/policy.
     *
     * Le téléchargement partenaire sera géré
     * exclusivement depuis l'espace partenaire.
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
            client_id,
            insurance_duration_years
          `,
        )
        .eq(
          "request_code",
          requestCode,
        )
        .eq(
          "source",
          "direct",
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
          error:
            "Aucun dossier ne correspond aux informations fournies.",
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
     * 5. VÉRIFICATION DU STATUT
     * ============================================
     */
    if (
      insuranceRequest.status !==
      "policy_available"
    ) {
      return NextResponse.json(
        {
          error:
            "Les polices d’assurance ne sont pas encore disponibles.",
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

    const durationYears =
      insuranceRequest
        .insurance_duration_years ===
      2
        ? 2
        : 1;

    if (
      durationYears === 1 &&
      policyYear === 2
    ) {
      return NextResponse.json(
        {
          error:
            "Ce dossier ne comporte pas de police pour l’année 2.",
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
     * 6. VÉRIFICATION DU CLIENT / WHATSAPP
     * ============================================
     */
    const {
      data:
        client,
      error:
        clientError,
    } =
      await serviceClient
        .from(
          "clients",
        )
        .select(
          `
            first_name,
            last_name,
            whatsapp_country_code,
            whatsapp_number
          `,
        )
        .eq(
          "id",
          insuranceRequest.client_id,
        )
        .maybeSingle();

    if (
      clientError
    ) {
      throw new Error(
        clientError.message,
      );
    }

    if (
      !client
    ) {
      return NextResponse.json(
        {
          error:
            "Aucun dossier ne correspond aux informations fournies.",
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

    const storedCountryCode =
      client.whatsapp_country_code
        ?.trim() ??
      "";

    const storedPhoneNumber =
      cleanPhoneNumber(
        client.whatsapp_number ??
          "",
      );

    const phoneMatches =
      storedCountryCode ===
        whatsappCountryCode &&
      storedPhoneNumber ===
        whatsappNumber;

    if (
      !phoneMatches
    ) {
      return NextResponse.json(
        {
          error:
            "Aucun dossier ne correspond aux informations fournies.",
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
     * 7. RECHERCHE DE LA POLICE
     * ============================================
     */
    const {
      data:
        policy,
      error:
        policyError,
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

    if (
      policyError
    ) {
      throw new Error(
        policyError.message,
      );
    }

    if (
      !policy?.storage_path
    ) {
      return NextResponse.json(
        {
          error:
            `La police de l’année ${policyYear} n’est pas disponible.`,
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
     * 8. NOM DU FICHIER
     * ============================================
     */
    const safeFirstName =
      sanitizeFileNamePart(
        client.first_name ??
          "",
      ) ||
      "PRENOM";

    const safeLastName =
      sanitizeFileNamePart(
        client.last_name ??
          "",
      ) ||
      "NOM";

    const safeRequestCode =
      sanitizeFileNamePart(
        insuranceRequest.request_code ??
          requestCode,
      ) ||
      requestCode;

    const baseFileName =
      `${safeFirstName}_${safeLastName}_${safeRequestCode}`;

    const fileName =
      durationYears ===
      1
        ? `${baseFileName}.pdf`
        : `${baseFileName}_${policyYear}.pdf`;

    /*
     * ============================================
     * 9. LIEN SIGNÉ
     * ============================================
     */
    const {
      data:
        signedUrlData,
      error:
        signedUrlError,
    } =
      await serviceClient.storage
        .from(
          BUCKET_NAME,
        )
        .createSignedUrl(
          policy.storage_path,
          SIGNED_URL_DURATION_SECONDS,
          {
            download:
              fileName,
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
    await logActivity({
      requestId:
        insuranceRequest.id,

      userId:
        null,

      action:
        "policy_downloaded",

      description:
        durationYears ===
        1
          ? "Le client a téléchargé sa police d’assurance."
          : `Le client a téléchargé la police d’assurance année ${policyYear}.`,
    });

    /*
     * ============================================
     * 11. RÉPONSE
     * ============================================
     */
    return NextResponse.json(
      {
        success:
          true,

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
      },
      {
        headers: {
          "Cache-Control":
            "no-store",

          "X-RateLimit-Remaining":
            String(
              Math.min(
                ipLimit.remaining,
                identityLimit.remaining,
              ),
            ),
        },
      },
    );
  } catch (
    error
  ) {
    console.error(
      "Erreur de téléchargement de la police :",
      error,
    );

    return NextResponse.json(
      {
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