import {
  NextResponse,
} from "next/server";

import {
  logActivity,
} from "@/lib/activity/logActivity";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/security/rateLimit";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CancelPayload = {
  requestCode?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;
};

const IP_RATE_LIMIT =
  15;

const IDENTITY_RATE_LIMIT =
  8;

const RATE_LIMIT_WINDOW_SECONDS =
  10 * 60;

function rateLimitedResponse(
  retryAfterSeconds: number,
) {
  return NextResponse.json(
    {
      success: false,

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
  context: RouteContext,
) {
  const serviceClient =
    createServiceClient();

  try {
    /*
     * ============================
     * IDENTIFIANT DU DOSSIER
     * ============================
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
     * ============================
     * RATE LIMIT PAR IP
     * ============================
     */

    const clientIp =
      getClientIp(
        request,
      );

    const ipLimit =
      await consumeRateLimit({
        namespace:
          "request-cancel-ip",

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
     * ============================
     * LECTURE DU BODY
     * ============================
     */

    let body:
      CancelPayload;

    try {
      body =
        await request.json() as
          CancelPayload;
    } catch {
      return NextResponse.json(
        {
          success: false,

          error:
            "Les données envoyées sont invalides.",
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
      body.whatsappNumber
        ?.replace(
          /\D/g,
          "",
        ) ??
      "";

    if (
      !requestCode ||
      !whatsappCountryCode ||
      !whatsappNumber
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Les informations du dossier sont incomplètes.",
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
     * RATE LIMIT PAR IDENTITÉ
     * ============================
     */

    const identityLimit =
      await consumeRateLimit({
        namespace:
          "request-cancel-identity",

        identifier:
          `${id}|${requestCode}|${whatsappCountryCode}|${whatsappNumber}`,

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

    /*
     * ============================
     * RECHERCHE DU DOSSIER
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
        .select(
          `
            id,
            request_code,
            status,

            client:clients (
              whatsapp_country_code,
              whatsapp_number
            )
          `,
        )
        .eq(
          "id",
          id,
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
     * ============================
     * VÉRIFICATION WHATSAPP
     * ============================
     */

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

    const storedCountryCode =
      client
        ?.whatsapp_country_code
        ?.trim() ??
      "";

    const storedWhatsappNumber =
      client
        ?.whatsapp_number
        ?.replace(
          /\D/g,
          "",
        ) ??
      "";

    if (
      storedCountryCode !==
        whatsappCountryCode ||
      storedWhatsappNumber !==
        whatsappNumber
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Les informations ne correspondent pas au dossier.",
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
     * ============================
     * STATUT AUTORISÉ
     * ============================
     *
     * Une annulation publique est
     * autorisée uniquement avant
     * l'envoi du dekont.
     */

    if (
      insuranceRequest.status !==
      "waiting_payment"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Ce dossier ne peut plus être annulé automatiquement.",
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
     * ============================
     * VÉRIFICATION DU PAIEMENT
     * ============================
     *
     * Par sécurité, aucun paiement
     * ne doit déjà être associé.
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
          "id",
        )
        .eq(
          "request_id",
          id,
        )
        .limit(
          1,
        )
        .maybeSingle();

    if (
      paymentError
    ) {
      throw new Error(
        paymentError.message,
      );
    }

    if (
      payment
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Un paiement est déjà associé à ce dossier.",
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
     * ============================
     * ANNULATION
     * ============================
     */

    const now =
      new Date().toISOString();

    const {
      data:
        cancelledRequest,
      error:
        updateError,
    } =
      await serviceClient
        .from(
          "insurance_requests",
        )
        .update({
          status:
            "cancelled",

          updated_at:
            now,
        })
        .eq(
          "id",
          id,
        )
        .eq(
          "status",
          "waiting_payment",
        )
        .select(
          `
            id,
            request_code,
            status
          `,
        )
        .maybeSingle();

    if (
      updateError
    ) {
      throw new Error(
        updateError.message,
      );
    }

    /*
     * Protection contre une modification
     * concurrente du statut.
     */

    if (
      !cancelledRequest
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Le statut du dossier a changé entre-temps.",
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
     * ============================
     * HISTORIQUE
     * ============================
     */

    await logActivity({
      requestId:
        id,

      userId:
        null,

      action:
        "request_cancelled",

      description:
        "Dossier annulé automatiquement par le client avant paiement.",
    });

    /*
     * ============================
     * RÉPONSE
     * ============================
     */

    return NextResponse.json(
      {
        success: true,

        requestId:
          cancelledRequest.id,

        requestCode:
          cancelledRequest.request_code,

        status:
          "cancelled",
      },
      {
        status: 200,

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
  } catch (error) {
    console.error(
      "Erreur annulation dossier client :",
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