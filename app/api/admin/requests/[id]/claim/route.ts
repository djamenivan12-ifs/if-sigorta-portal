import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const CLAIMABLE_STATUSES = [
  "waiting_payment",
  "payment_review",
  "payment_confirmed",
  "policy_preparation",
] as const;

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    /*
     * 1. Vérifier l'utilisateur connecté
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
        },
      );
    }

    /*
     * 2. Vérifier le rôle
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
            "Vous n’avez pas l’autorisation de prendre en charge un dossier.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * 3. Récupérer l'identifiant du dossier
     */
    const {
      id: requestId,
    } =
      await context.params;

    if (!requestId) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Identifiant du dossier absent.",
        },
        {
          status: 400,
        },
      );
    }

    const serviceClient =
      createServiceClient();

    /*
     * 4. Vérifier que le dossier existe
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
            assigned_agent_id,
            assigned_at,
            status
          `,
        )
        .eq(
          "id",
          requestId,
        )
        .maybeSingle();

    if (requestError) {
      throw new Error(
        requestError.message,
      );
    }

    if (!insuranceRequest) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Dossier introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * 5. Vérifier que le statut permet encore
     * la prise en charge du dossier.
     */
    if (
      !CLAIMABLE_STATUSES.includes(
        insuranceRequest.status as
          (typeof CLAIMABLE_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Ce dossier ne peut plus être pris en charge dans son état actuel.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 6. Si le dossier est déjà attribué
     */
    if (
      insuranceRequest.assigned_agent_id
    ) {
      /*
       * Déjà attribué à l'utilisateur connecté.
       */
      if (
        insuranceRequest.assigned_agent_id ===
        user.id
      ) {
        return NextResponse.json(
          {
            success: true,

            alreadyClaimed:
              true,

            requestId,

            requestCode:
              insuranceRequest.request_code,

            agentId:
              user.id,

            assignedAt:
              insuranceRequest.assigned_at,

            message:
              "Ce dossier vous est déjà attribué.",
          },
          {
            status: 200,
          },
        );
      }

      /*
       * Attribué à un autre utilisateur.
       */
      return NextResponse.json(
        {
          success: false,

          error:
            "Ce dossier a déjà été pris en charge par un autre agent.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 7. Attribution atomique
     *
     * Le dossier doit :
     * - être celui demandé ;
     * - ne pas être déjà attribué ;
     * - avoir encore un statut traitable.
     */
    const assignedAt =
      new Date().toISOString();

    const {
      data:
        updatedRequest,
      error:
        updateError,
    } =
      await serviceClient
        .from(
          "insurance_requests",
        )
        .update({
          assigned_agent_id:
            user.id,

          assigned_at:
            assignedAt,
        })
        .eq(
          "id",
          requestId,
        )
        .is(
          "assigned_agent_id",
          null,
        )
        .in(
          "status",
          [
            "waiting_payment",
            "payment_review",
            "payment_confirmed",
            "policy_preparation",
          ],
        )
        .select(
          `
            id,
            request_code,
            assigned_agent_id,
            assigned_at,
            status
          `,
        )
        .maybeSingle();

    if (updateError) {
      throw new Error(
        updateError.message,
      );
    }

    /*
     * Si aucune ligne n'a été modifiée,
     * le dossier a probablement été pris
     * entre-temps ou son statut a changé.
     */
    if (!updatedRequest) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Ce dossier vient d’être pris en charge par un autre agent ou son statut a changé.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 8. Nom de l'agent
     */
    const firstName =
      user.user_metadata
        ?.first_name
        ?.toString()
        .trim() ??
      "";

    const lastName =
      user.user_metadata
        ?.last_name
        ?.toString()
        .trim() ??
      "";

    const agentName =
      `${firstName} ${lastName}`.trim() ||
      user.user_metadata
        ?.name
        ?.toString()
        .trim() ||
      user.email ||
      "Agent";

    /*
     * 9. Historique
     */
    const {
      error:
        activityError,
    } =
      await serviceClient
        .from(
          "activity_logs",
        )
        .insert({
          request_id:
            requestId,

          user_id:
            user.id,

          action:
            "request_claimed",

          description:
            `Dossier ${insuranceRequest.request_code} pris en charge par ${agentName}.`,
        });

    /*
     * Une erreur de journalisation
     * ne doit pas annuler l'attribution.
     */
    if (activityError) {
      console.error(
        "Erreur activity_logs request_claimed :",
        activityError.message,
      );
    }

    /*
     * 10. Réponse
     */
    return NextResponse.json(
      {
        success: true,

        alreadyClaimed:
          false,

        requestId,

        requestCode:
          insuranceRequest.request_code,

        status:
          updatedRequest.status,

        agentId:
          user.id,

        agentName,

        assignedAt,

        message:
          "Dossier pris en charge avec succès.",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Erreur prise en charge du dossier :",
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
      },
    );
  }
}