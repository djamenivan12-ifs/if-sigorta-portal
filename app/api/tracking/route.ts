import { NextResponse } from "next/server";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/security/rateLimit";

import { createServiceClient } from "@/lib/supabase/service";

type TrackingPayload = {
  requestCode?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;
};

type PolicyYear = 1 | 2;

type PolicyRow = {
  policy_number: string | null;
  policy_year: number;
  issue_date: string | null;
  expiration_date: string | null;
  storage_path: string | null;
  uploaded_at: string | null;
};

const IP_RATE_LIMIT = 30;
const IDENTITY_RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

function cleanPhoneNumber(
  value: string,
): string {
  return value.replace(
    /\D/g,
    "",
  );
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
          "tracking-ip",

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
      (await request.json()) as TrackingPayload;

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

    /*
     * ============================================
     * 3. RATE LIMIT PAR IDENTITÉ DE SUIVI
     * ============================================
     *
     * On limite également les essais sur une même
     * combinaison dossier + téléphone, même si
     * l'adresse IP change.
     */
    const identityLimit =
      await consumeRateLimit({
        namespace:
          "tracking-identity",

        identifier:
          `${requestCode}|${whatsappCountryCode}|${whatsappNumber}`,

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
            calculated_price,
            insurance_duration_years,
            created_at,
            updated_at,
            client_id
          `,
        )
        .eq(
          "request_code",
          requestCode,
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
     * 5. VÉRIFICATION DU NUMÉRO WHATSAPP
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

    const storedWhatsappNumber =
      cleanPhoneNumber(
        client.whatsapp_number ??
          "",
      );

    const phoneMatches =
      storedCountryCode ===
        whatsappCountryCode &&
      storedWhatsappNumber ===
        whatsappNumber;

    if (
      !phoneMatches
    ) {
      /*
       * Même message que pour un dossier inexistant :
       * cela évite d'indiquer à un attaquant qu'un
       * matricule précis existe réellement.
       */
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
     * 6. RÉCUPÉRATION DU PAIEMENT
     * ============================================
     */
    const {
      data:
        payment,
      error:
        paymentError,
    } =
      await serviceClient
        .from(
          "payments",
        )
        .select(
          `
            status,
            submitted_at,
            verified_at,
            rejection_reason
          `,
        )
        .eq(
          "request_id",
          insuranceRequest.id,
        )
        .maybeSingle();

    if (
      paymentError
    ) {
      console.error(
        "Erreur de récupération du paiement :",
        paymentError,
      );
    }

    /*
     * ============================================
     * 7. RÉCUPÉRATION DES POLICES
     * ============================================
     */
    const {
      data:
        policiesData,
      error:
        policiesError,
    } =
      await serviceClient
        .from(
          "insurance_policies",
        )
        .select(
          `
            policy_number,
            policy_year,
            issue_date,
            expiration_date,
            storage_path,
            uploaded_at
          `,
        )
        .eq(
          "request_id",
          insuranceRequest.id,
        )
        .order(
          "policy_year",
          {
            ascending:
              true,
          },
        );

    if (
      policiesError
    ) {
      throw new Error(
        policiesError.message,
      );
    }

    const policies =
      (
        policiesData ??
        []
      ) as PolicyRow[];

    const durationYears:
      | 1
      | 2 =
      insuranceRequest
        .insurance_duration_years ===
      2
        ? 2
        : 1;

    const year1Policy =
      policies.find(
        (
          policy,
        ) =>
          Number(
            policy.policy_year,
          ) ===
            1 &&
          Boolean(
            policy.storage_path,
          ),
      ) ??
      null;

    const year2Policy =
      policies.find(
        (
          policy,
        ) =>
          Number(
            policy.policy_year,
          ) ===
            2 &&
          Boolean(
            policy.storage_path,
          ),
      ) ??
      null;

    const year1IsAvailable =
      Boolean(
        year1Policy?.storage_path,
      );

    const year2IsAvailable =
      Boolean(
        year2Policy?.storage_path,
      );

    const allPoliciesAreAvailable =
      year1IsAvailable &&
      (
        durationYears ===
          1 ||
        year2IsAvailable
      );

    const referencePolicy =
      year1Policy ??
      year2Policy;

    /*
     * ============================================
     * 8. RÉPONSE
     * ============================================
     */
    return NextResponse.json(
      {
        success:
          true,

        request: {
          requestCode:
            insuranceRequest.request_code,

          status:
            insuranceRequest.status,

          calculatedPrice:
            insuranceRequest.calculated_price,

          durationYears,

          createdAt:
            insuranceRequest.created_at,

          updatedAt:
            insuranceRequest.updated_at,
        },

        client: {
          firstName:
            client.first_name,

          lastName:
            client.last_name,
        },

        payment:
          payment
            ? {
                status:
                  payment.status,

                submittedAt:
                  payment.submitted_at,

                verifiedAt:
                  payment.verified_at,

                rejectionReason:
                  payment.rejection_reason,
              }
            : null,

        policy: {
          available:
            allPoliciesAreAvailable,

          policyNumber:
            referencePolicy
              ?.policy_number ??
            null,

          issueDate:
            referencePolicy
              ?.issue_date ??
            null,

          expirationDate:
            referencePolicy
              ?.expiration_date ??
            null,

          uploadedAt:
            referencePolicy
              ?.uploaded_at ??
            null,
        },

        policies: [
          {
            policyYear:
              1,

            available:
              year1IsAvailable,

            policyNumber:
              year1Policy
                ?.policy_number ??
              null,

            issueDate:
              year1Policy
                ?.issue_date ??
              null,

            expirationDate:
              year1Policy
                ?.expiration_date ??
              null,

            uploadedAt:
              year1Policy
                ?.uploaded_at ??
              null,
          },

          ...(durationYears ===
          2
            ? [
                {
                  policyYear:
                    2 as PolicyYear,

                  available:
                    year2IsAvailable,

                  policyNumber:
                    year2Policy
                      ?.policy_number ??
                    null,

                  issueDate:
                    year2Policy
                      ?.issue_date ??
                    null,

                  expirationDate:
                    year2Policy
                      ?.expiration_date ??
                    null,

                  uploadedAt:
                    year2Policy
                      ?.uploaded_at ??
                    null,
                },
              ]
            : []),
        ],
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
      "Erreur de suivi du dossier :",
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