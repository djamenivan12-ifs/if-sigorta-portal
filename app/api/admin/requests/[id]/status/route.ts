import { decidePayment, PaymentDecisionError } from "@/lib/insurance/decidePayment";
import { applyRequestMutationScope } from "@/lib/admin/requestScope";
import {
  hasQuoteSchema,
  type RequestPricingSnapshot,
} from "@/lib/insurance/quoteSchema";
import { day } from "@/lib/accounting/model";
import {
  skylineNationalityRate,
  isCongoBrazzaville,
  nationalityAmounts,
  type NationalityRate,
} from "@/lib/insurance/nationalityRates";
import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity/logActivity";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_ACTIONS = [
  "confirm_payment",
  "reject_payment",
  "start_policy",
  "cancel_request",
] as const;

type AllowedAction = (typeof ALLOWED_ACTIONS)[number];

type UpdateStatusPayload = {
  action?: AllowedAction;
  rejectionReason?: string;
  insuranceCompanyId?: string;
  paymentId?: string;
  paymentSubmittedAt?: string | null;
  operationId?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isAllowedAction(value: unknown): value is AllowedAction {
  return (
    typeof value === "string" &&
    ALLOWED_ACTIONS.includes(value as AllowedAction)
  );
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
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
    /*
     * Une erreur d'historique ne doit pas
     * rendre incohérente une opération
     * métier déjà terminée.
     */
    console.error("Impossible d'enregistrer l'activité :", error);
  }
}

async function handleStatusUpdate(request: Request, context: RouteContext) {
  const serviceClient = createServiceClient();

  try {
    /*
     * ============================================
     * 1. AUTHENTIFICATION
     * ============================================
     */

    const sessionClient = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await sessionClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          success: false,
          error: "Vous devez être connecté.",
        },
        401,
      );
    }

    /*
     * ============================================
     * 2. RÔLE
     * ============================================
     */

    const role = user.app_metadata?.role;

    if (role !== "admin" && role !== "agent") {
      return jsonResponse(
        {
          success: false,
          error: "Vous n’avez pas l’autorisation d’effectuer cette action.",
        },
        403,
      );
    }

    /*
     * ============================================
     * 3. IDENTIFIANT
     * ============================================
     */

    const { id } = await context.params;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: "Identifiant du dossier absent.",
        },
        400,
      );
    }

    /*
     * ============================================
     * 4. BODY
     * ============================================
     */

    let body: UpdateStatusPayload;

    try {
      body = (await request.json()) as UpdateStatusPayload;
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Les données envoyées sont invalides.",
        },
        400,
      );
    }

    if (!body || typeof body !== "object" || !isAllowedAction(body.action)) {
      return jsonResponse(
        {
          success: false,
          error: "Action invalide.",
        },
        400,
      );
    }

    const rejectionReason = typeof body.rejectionReason === "string" ? body.rejectionReason.trim() : "";

    if (body.action === "reject_payment" && !rejectionReason) {
      return jsonResponse(
        {
          success: false,
          error: "Le motif du refus est obligatoire.",
        },
        400,
      );
    }

    /*
     * ============================================
     * 5. DOSSIER
     * ============================================
     */

    if (body.action === "confirm_payment" || body.action === "reject_payment") {
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const submittedAt = body.paymentSubmittedAt;
      if (typeof body.paymentId !== "string" || !uuid.test(body.paymentId) ||
          typeof body.operationId !== "string" || !uuid.test(body.operationId) || !uuid.test(id) ||
          !(submittedAt === null || (typeof submittedAt === "string" &&
            /^\d{4}-\d{2}-\d{2}T/.test(submittedAt) && Number.isFinite(Date.parse(submittedAt)))) ||
          rejectionReason.length > 4000) {
        return jsonResponse({ success: false, error: "Les informations de paiement ont changé. Rechargez le dossier avant de réessayer." }, 400);
      }
      const result = await decidePayment(serviceClient, {
        requestId:id,paymentId:body.paymentId,submittedAt,action:body.action,
        reason:rejectionReason,actor:user.id,operationId:body.operationId,
      });
      return jsonResponse(result);
    }

    const quoteSchemaReady = await hasQuoteSchema(serviceClient);
    const { data: insuranceRequest, error: requestError } = await serviceClient
      .from("insurance_requests")
      .select(
        `
            id,
            status,
            assigned_agent_id,
            calculated_age,
            insurance_duration_years,
            insurance_company_id,
            insurance_cost_rate_id,
            actual_insurance_cost,
            created_at,client:clients(nationality)
            ${quoteSchemaReady ? ",quote_nationality,nationality_rate_id" : ""}
          `,
      )
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<RequestPricingSnapshot | null, { merge: false }>();

    if (requestError) {
      throw new Error(requestError.message);
    }

    if (!insuranceRequest) {
      return jsonResponse(
        {
          success: false,
          error: "Dossier introuvable.",
        },
        404,
      );
    }

    /*
     * ============================================
     * 6. AUTORISATION AGENT
     * ============================================
     *
     * Un agent ne peut intervenir que sur
     * un dossier qui lui est attribué.
     *
     * L'admin peut intervenir partout.
     */

    if (role === "agent" && insuranceRequest.assigned_agent_id !== user.id) {
      return jsonResponse(
        {
          success: false,

          error: insuranceRequest.assigned_agent_id
            ? "Ce dossier est attribué à un autre agent."
            : "Vous devez d’abord prendre en charge ce dossier.",
        },
        403,
      );
    }

    const now = new Date().toISOString();

    /*
     * ============================================
     * COMMENCER LA PRÉPARATION
     * ============================================
     */

    if (body.action === "start_policy") {
      if (insuranceRequest.status !== "payment_confirmed") {
        return jsonResponse(
          {
            success: false,

            error:
              "La préparation ne peut commencer qu’après validation du paiement.",
          },
          409,
        );
      }

      const insuranceCompanyId = body.insuranceCompanyId?.trim() ?? "";

      if (!insuranceCompanyId) {
        return jsonResponse(
          {
            success: false,
            error: "Veuillez sélectionner un assureur.",
          },
          400,
        );
      }

      const age = Number(insuranceRequest.calculated_age);

      const durationYears = Number(insuranceRequest.insurance_duration_years);

      if (!Number.isInteger(age) || age < 0) {
        return jsonResponse(
          {
            success: false,
            error: "L’âge calculé du client est invalide.",
          },
          400,
        );
      }

      if (durationYears !== 1 && durationYears !== 2) {
        return jsonResponse(
          {
            success: false,
            error: "La durée d’assurance est invalide.",
          },
          400,
        );
      }

      const { data: insuranceCompany, error: insuranceCompanyError } =
        await serviceClient
          .from("insurance_companies")
          .select(
            `
              id,
              name,
              business_code,
              is_active
            `,
          )
          .eq("id", insuranceCompanyId)
          .maybeSingle();

      if (insuranceCompanyError) {
        throw new Error(insuranceCompanyError.message);
      }

      if (!insuranceCompany) {
        return jsonResponse(
          {
            success: false,
            error: "Assureur introuvable.",
          },
          404,
        );
      }

      if (!insuranceCompany.is_active) {
        return jsonResponse(
          {
            success: false,
            error: "Cet assureur est actuellement inactif.",
          },
          409,
        );
      }

      const turkeyDateParts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());

      const turkeyYear =
        turkeyDateParts.find((part) => part.type === "year")?.value ?? "";

      const turkeyMonth =
        turkeyDateParts.find((part) => part.type === "month")?.value ?? "";

      const turkeyDay =
        turkeyDateParts.find((part) => part.type === "day")?.value ?? "";

      const today = `${turkeyYear}-${turkeyMonth}-${turkeyDay}`;

      const client = Array.isArray(insuranceRequest.client)
        ? insuranceRequest.client[0]
        : insuranceRequest.client;
      const nationality =
        insuranceRequest.quote_nationality ?? client?.nationality;
      let nationalityRate: NationalityRate | null = null;
      if (insuranceRequest.nationality_rate_id) {
        const stored = await serviceClient
          .from("insurance_nationality_rates")
          .select("*")
          .eq("id", insuranceRequest.nationality_rate_id)
          .maybeSingle();
        if (stored.error || !stored.data)
          throw new Error("La grille du devis est indisponible.");
        nationalityRate = stored.data;
      } else if (
        insuranceRequest.quote_nationality != null &&
        isCongoBrazzaville(nationality) &&
        day(insuranceRequest.created_at) >= "2026-09-17"
      ) {
        nationalityRate = await skylineNationalityRate(
          age,
          nationality,
          new Date(insuranceRequest.created_at),
        );
      }
      if (
        insuranceRequest.nationality_rate_id &&
        nationalityRate?.insurance_company_id !== insuranceCompanyId
      ) {
        return jsonResponse(
          {
            success: false,
            error: "Ce devis utilise la grille Skyline. Sélectionnez Skyline.",
          },
          409,
        );
      }
      if (
        insuranceRequest.quote_nationality != null &&
        isCongoBrazzaville(nationality) &&
        day(insuranceRequest.created_at) >= "2026-09-17" &&
        (insuranceCompany.business_code === "skyline") &&
        !nationalityRate
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Aucun tarif Skyline Congo-Brazzaville ne correspond à ce dossier.",
          },
          409,
        );
      }

      const { data: genericRate, error: matchingRateError } =
        await serviceClient
          .from("insurance_cost_rates")
          .select(
            `
              id,
              real_cost,
              effective_from,
              created_at
            `,
          )
          .eq("insurance_company_id", insuranceCompanyId)
          .eq("is_active", true)
          .eq("duration_years", durationYears)
          .lte("min_age", age)
          .gte("max_age", age)
          .lte("effective_from", today)
          .order("effective_from", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      if (matchingRateError) {
        throw new Error(matchingRateError.message);
      }

      const special =
        nationalityRate?.insurance_company_id === insuranceCompanyId
          ? nationalityRate
          : null;
      const matchingRate = special
        ? {
            id: null,
            real_cost: nationalityAmounts(special, durationYears as 1 | 2).cost,
          }
        : genericRate;
      if (!matchingRate) {
        return jsonResponse(
          {
            success: false,
            error:
              "Aucun tarif actif de cet assureur ne correspond à l’âge et à la durée de ce dossier.",
          },
          409,
        );
      }

      const actualInsuranceCost = Number(matchingRate.real_cost);

      if (!Number.isFinite(actualInsuranceCost) || actualInsuranceCost < 0) {
        return jsonResponse(
          {
            success: false,
            error: "Le coût réel configuré pour cet assureur est invalide.",
          },
          500,
        );
      }

      /*
       * Transition atomique :
       *
       * payment_confirmed
       *      ↓
       * sélection assureur + coût figé
       *      ↓
       * policy_preparation
       *
       * Le coût réel est calculé exclusivement
       * côté serveur à partir du tarif actif.
       */

      const { data: updatedRequest, error: updateError } = await applyRequestMutationScope(serviceClient
        .from("insurance_requests")
        .update({
          insurance_company_id: insuranceCompany.id,

          insurance_cost_rate_id: matchingRate.id,

          ...(quoteSchemaReady
            ? {
                nationality_rate_id:
                  special?.id ?? insuranceRequest.nationality_rate_id,
              }
            : {}),
          actual_insurance_cost: actualInsuranceCost,

          insurance_company_selected_at: now,

          insurance_company_selected_by: user.id,

          status: "policy_preparation",

          updated_at: now,
        })
        .eq("id", id)
        .eq("status", "payment_confirmed"), role, user.id)
        .select(
          `
              id,
              status,
              insurance_company_id,
              insurance_cost_rate_id,
              actual_insurance_cost
            `,
        )
        .maybeSingle();

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (!updatedRequest) {
        return jsonResponse(
          {
            success: false,
            error:
              "Le statut du dossier a changé entre-temps. Actualisez la page.",
          },
          409,
        );
      }

      await safeLogActivity({
        requestId: id,

        userId: user.id,

        action: "policy_preparation_started",

        description: `Assureur sélectionné : ${insuranceCompany.name}. Préparation de l’assurance commencée.`,
      });

      return jsonResponse({
        success: true,

        action: body.action,

        status: "policy_preparation",

        insuranceCompany: {
          id: insuranceCompany.id,
          name: insuranceCompany.name,
        },
      });
    }

    /*
     * ============================================
     * ANNULER LE DOSSIER
     * ============================================
     */

    if (body.action === "cancel_request") {
      /*
       * Une police disponible ne doit
       * plus être annulable ici.
       */

      if (insuranceRequest.status === "policy_available") {
        return jsonResponse(
          {
            success: false,
            error:
              "Un dossier dont la police est déjà disponible ne peut pas être annulé.",
          },
          409,
        );
      }

      if (insuranceRequest.status === "cancelled") {
        return jsonResponse(
          {
            success: false,
            error: "Ce dossier est déjà annulé.",
          },
          409,
        );
      }

      const previousStatus = insuranceRequest.status;

      /*
       * Mise à jour conditionnelle sur
       * l'ancien statut.
       *
       * Ainsi, si une autre action modifie
       * le dossier entre-temps, l'annulation
       * échoue au lieu d'écraser le nouveau
       * statut.
       */

      const { data: cancelledRequest, error: updateError } = await applyRequestMutationScope(serviceClient
        .from("insurance_requests")
        .update({
          status: "cancelled",

          updated_at: now,
        })
        .eq("id", id)
        .eq("status", previousStatus), role, user.id)
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (!cancelledRequest) {
        return jsonResponse(
          {
            success: false,
            error:
              "Le statut du dossier a changé entre-temps. Actualisez la page.",
          },
          409,
        );
      }

      await safeLogActivity({
        requestId: id,

        userId: user.id,

        action: "request_cancelled",

        description: `Dossier annulé. Statut précédent : ${previousStatus}.`,
      });

      return jsonResponse({
        success: true,

        action: body.action,

        status: "cancelled",
      });
    }

    /*
     * Cette partie ne devrait jamais
     * être atteinte grâce à isAllowedAction.
     */

    return jsonResponse(
      {
        success: false,
        error: "Action invalide.",
      },
      400,
    );
  } catch (error) {
    if (error instanceof PaymentDecisionError) return jsonResponse({success:false,error:error.message},error.status);
    console.error("Erreur de mise à jour du statut :", error);

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

export async function POST(request: Request, context: RouteContext) {
  return handleStatusUpdate(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleStatusUpdate(request, context);
}
