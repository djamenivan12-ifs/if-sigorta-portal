import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AssignPayload = {
  agentId?: string | null;
};

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    /*
     * Vérification de l'utilisateur connecté.
     */
    const sessionClient =
      await createServerSupabaseClient();

    const {
      data: {
        user: currentUser,
      },
      error: currentUserError,
    } =
      await sessionClient.auth.getUser();

    if (
      currentUserError ||
      !currentUser
    ) {
      return NextResponse.json(
        {
          error:
            "Vous devez être connecté.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Seul l'administrateur peut
     * attribuer les dossiers.
     */
    if (
      currentUser.app_metadata
        ?.role !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Seul un administrateur peut attribuer un dossier.",
        },
        {
          status: 403,
        },
      );
    }

    const {
      id: requestId,
    } =
      await context.params;

    if (!requestId) {
      return NextResponse.json(
        {
          error:
            "Identifiant du dossier absent.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      (await request.json()) as AssignPayload;

    const agentId =
      body.agentId?.trim() ||
      null;

    const serviceClient =
      createServiceClient();

    /*
     * Vérification du dossier.
     */
    const {
      data: insuranceRequest,
      error: insuranceRequestError,
    } =
      await serviceClient
        .from(
          "insurance_requests",
        )
        .select(
          `
            id,
            request_code,
            assigned_agent_id
          `,
        )
        .eq(
          "id",
          requestId,
        )
        .maybeSingle();

    if (
      insuranceRequestError
    ) {
      throw new Error(
        insuranceRequestError.message,
      );
    }

    if (!insuranceRequest) {
      return NextResponse.json(
        {
          error:
            "Dossier introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Si un agent est sélectionné,
     * on vérifie qu'il existe
     * et qu'il possède bien
     * le rôle agent ou admin.
     */
    let agentName:
      | string
      | null =
      null;

    if (agentId) {
      const {
        data: agentData,
        error: agentError,
      } =
        await serviceClient.auth.admin.getUserById(
          agentId,
        );

      if (
        agentError ||
        !agentData.user
      ) {
        return NextResponse.json(
          {
            error:
              "L’agent sélectionné est introuvable.",
          },
          {
            status: 404,
          },
        );
      }

      const agent =
        agentData.user;

      const agentRole =
        agent.app_metadata?.role;

      if (
        agentRole !== "agent" &&
        agentRole !== "admin"
      ) {
        return NextResponse.json(
          {
            error:
              "Cet utilisateur ne peut pas recevoir de dossier.",
          },
          {
            status: 400,
          },
        );
      }

      const firstName =
        agent.user_metadata
          ?.first_name
          ?.toString()
          .trim() ??
        "";

      const lastName =
        agent.user_metadata
          ?.last_name
          ?.toString()
          .trim() ??
        "";

      agentName =
        `${firstName} ${lastName}`.trim() ||
        agent.email ||
        "Agent";
    }

    /*
     * Mise à jour du dossier.
     */
    const {
      error: updateError,
    } =
      await serviceClient
        .from(
          "insurance_requests",
        )
        .update({
          assigned_agent_id:
            agentId,

          assigned_at:
            agentId
              ? new Date().toISOString()
              : null,
        })
        .eq(
          "id",
          requestId,
        );

    if (updateError) {
      throw new Error(
        updateError.message,
      );
    }

    /*
     * Journal d'activité.
     */
    const action =
      agentId
        ? "request_assigned"
        : "request_unassigned";

    const description =
      agentId
        ? `Dossier ${insuranceRequest.request_code} attribué à ${agentName}.`
        : `Attribution du dossier ${insuranceRequest.request_code} supprimée.`;

    const {
      error: logError,
    } =
      await serviceClient
        .from(
          "activity_logs",
        )
        .insert({
          request_id:
            requestId,

          user_id:
            currentUser.id,

          action,

          description,
        });

    /*
     * Une erreur de journal ne doit
     * pas annuler l'attribution.
     */
    if (logError) {
      console.error(
        "Erreur journal attribution :",
        logError.message,
      );
    }

    return NextResponse.json({
      success: true,

      requestId,

      agentId,

      agentName,
    });
  } catch (error) {
    console.error(
      "Erreur attribution dossier :",
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
      },
    );
  }
}