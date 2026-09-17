import { NextResponse } from "next/server";
import { processOutbox } from "@/lib/notifications/processOutbox";

import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AssignPayload = {
  agentId?: string | null;
};

type ClientRelation =
  | {
      first_name: string | null;
      last_name: string | null;
    }
  | Array<{
      first_name: string | null;
      last_name: string | null;
    }>
  | null;

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
     * ============================================
     * 1. AUTHENTIFICATION
     * ============================================
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
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 2. ADMIN UNIQUEMENT
     * ============================================
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
     * 4. BODY
     * ============================================
     */
    let body: AssignPayload;

    try {
      body =
        (await request.json()) as
          AssignPayload;
    } catch {
      return NextResponse.json(
        {
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

    const agentId =
      typeof body.agentId ===
        "string"
        ? body.agentId.trim() ||
          null
        : null;

    const serviceClient =
      createServiceClient();

    /*
     * ============================================
     * 5. DOSSIER + CLIENT
     * ============================================
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
            assigned_agent_id,

            client:clients (
              first_name,
              last_name
            )
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
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const previousAgentId =
      insuranceRequest
        .assigned_agent_id ??
      null;

    const clientRelation =
      insuranceRequest.client as
        ClientRelation;

    const client =
      Array.isArray(
        clientRelation,
      )
        ? clientRelation[0] ??
          null
        : clientRelation;

    const clientFirstName =
      client?.first_name?.trim() ??
      "";

    const clientLastName =
      client?.last_name?.trim() ??
      "";

    const clientName =
      `${clientFirstName} ${clientLastName}`.trim() ||
      "Client";

    /*
     * ============================================
     * 6. VÉRIFICATION DE L'AGENT
     * ============================================
     */
    let agentName:
      | string
      | null =
      null;

    let agentEmail:
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
            headers: {
              "Cache-Control":
                "no-store",
            },
          },
        );
      }

      const agent =
        agentData.user;

      const agentRole =
        agent.app_metadata?.role;

      /*
       * On conserve le comportement actuel :
       * un utilisateur agent ou admin peut être
       * sélectionné dans l'attribution.
       */
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
            headers: {
              "Cache-Control":
                "no-store",
            },
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

      agentEmail =
        agent.email?.trim() ||
        null;

      agentName =
        `${firstName} ${lastName}`.trim() ||
        agentEmail ||
        "Agent";
    }

    /*
     * ============================================
     * 7. ATTRIBUTION IDENTIQUE
     * ============================================
     *
     * Si le dossier est déjà attribué à cet
     * utilisateur, on ne modifie pas assigned_at,
     * on ne crée pas de journal en double et
     * surtout on ne renvoie pas d'e-mail.
     */
    if (
      previousAgentId === agentId
    ) {
      return NextResponse.json(
        {
          success: true,

          requestId,

          agentId,

          agentName,

          unchanged: true,

          assignmentEmailSent:
            false,
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
     * ============================================
     * 8. MISE À JOUR DU DOSSIER
     * ============================================
     */
    const { data: adopted, error: adoptionError } = await serviceClient.rpc("assign_request", {
      p_request: requestId, p_actor: currentUser.id, p_expected_agent: previousAgentId,
      p_agent: agentId, p_email: agentEmail, p_name: agentName, p_client_name: clientName,
    });
    if (adoptionError) return NextResponse.json({ error: adoptionError.code === "40001" ? "L’attribution a changé. Actualisez la page." : "L’attribution n’a pas pu être enregistrée." }, { status: adoptionError.code === "40001" ? 409 : adoptionError.code === "42501" ? 403 : adoptionError.code === "P0002" ? 404 : 503, headers: { "Cache-Control": "no-store" } });
    try { await processOutbox(); } catch { /* The durable event remains available for controlled recovery. */ }
    let assignmentEmailSent = false;
    if (adopted?.eventId) {
      const { data: event } = await serviceClient.from("notification_outbox").select("status").eq("id", adopted.eventId).maybeSingle();
      assignmentEmailSent = event?.status === "sent";
    }
    return NextResponse.json(
      {
        success: true,

        requestId,

        agentId,

        agentName,

        unchanged: Boolean(adopted?.unchanged),

        assignmentEmailSent,
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
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
