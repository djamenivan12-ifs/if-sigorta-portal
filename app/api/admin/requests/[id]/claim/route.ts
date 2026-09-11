import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const CLAIMABLE_STATUSES = [
  "waiting_payment",
  "payment_review",
  "payment_confirmed",
  "policy_preparation",
] as const;

type InternalRole =
  | "agent"
  | "admin";

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
     * ============================================
     * 1. UTILISATEUR CONNECTÉ
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
     *
     * Un agent OU un administrateur peut
     * prendre directement en charge un dossier
     * non attribué.
     */
    const role =
      user.app_metadata
        ?.role as
        | InternalRole
        | undefined;

    if (
      role !== "agent" &&
      role !== "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vous n’êtes pas autorisé à prendre en charge un dossier.",
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
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const serviceClient =
      createServiceClient();

    /*
     * ============================================
     * 4. DOSSIER
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
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 5. STATUT AUTORISÉ
     * ============================================
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
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 6. DOSSIER DÉJÀ ATTRIBUÉ
     * ============================================
     */
    if (
      insuranceRequest
        .assigned_agent_id
    ) {
      /*
       * Le dossier appartient déjà
       * à l'utilisateur connecté.
       */
      if (
        insuranceRequest
          .assigned_agent_id ===
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
            headers: {
              "Cache-Control":
                "no-store",
            },
          },
        );
      }

      /*
       * Le dossier appartient
       * à quelqu'un d'autre.
       */
      return NextResponse.json(
        {
          success: false,
          error:
            "Ce dossier a déjà été pris en charge par un autre utilisateur.",
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
     * 7. ATTRIBUTION ATOMIQUE
     * ============================================
     *
     * L'UPDATE vérifie une seconde fois que
     * assigned_agent_id est toujours NULL.
     *
     * Cela évite que deux utilisateurs
     * prennent simultanément le même dossier.
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
            ...CLAIMABLE_STATUSES,
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
     * Quelqu'un a pris le dossier
     * entre la lecture et l'UPDATE,
     * ou son statut a changé.
     */
    if (!updatedRequest) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ce dossier vient d’être pris en charge par un autre utilisateur ou son statut a changé.",
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
     * 8. NOM DE L'UTILISATEUR
     * ============================================
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

    const userName =
      `${firstName} ${lastName}`.trim() ||
      user.user_metadata
        ?.name
        ?.toString()
        .trim() ||
      user.email ||
      (role === "admin"
        ? "Administrateur"
        : "Agent");

    /*
     * ============================================
     * 9. HISTORIQUE
     * ============================================
     *
     * Une prise en charge personnelle
     * n'envoie volontairement aucun e-mail.
     *
     * L'utilisateur est déjà présent
     * dans l'application et vient
     * lui-même d'effectuer l'action.
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
            `Dossier ${insuranceRequest.request_code} pris en charge par ${userName}.`,
        });

    /*
     * Une erreur du journal ne doit jamais
     * annuler la prise en charge.
     */
    if (activityError) {
      console.error(
        "Erreur activity_logs request_claimed :",
        activityError.message,
      );
    }

    /*
     * ============================================
     * 10. RÉPONSE
     * ============================================
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

        agentName:
          userName,

        role,

        assignedAt,

        assignmentEmailSent:
          false,

        message:
          "Dossier pris en charge avec succès.",
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
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}