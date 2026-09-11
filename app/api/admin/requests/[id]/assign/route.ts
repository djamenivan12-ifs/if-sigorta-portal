import { NextResponse } from "next/server";
import { Resend } from "resend";

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

function escapeEmailHtml(
  value: string,
): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function safeInsertActivity({
  serviceClient,
  requestId,
  userId,
  action,
  description,
}: {
  serviceClient: ReturnType<
    typeof createServiceClient
  >;
  requestId: string;
  userId: string;
  action: string;
  description: string;
}) {
  try {
    const { error } =
      await serviceClient
        .from("activity_logs")
        .insert({
          request_id: requestId,
          user_id: userId,
          action,
          description,
        });

    if (error) {
      console.error(
        "Erreur journal attribution :",
        error.message,
      );
    }
  } catch (error) {
    console.error(
      "Erreur journal attribution :",
      error,
    );
  }
}

async function sendAssignmentEmail({
  agentEmail,
  agentName,
  requestCode,
  clientName,
}: {
  agentEmail: string;
  agentName: string;
  requestCode: string;
  clientName: string;
}): Promise<{
  sent: boolean;
  error?: string;
}> {
  const apiKey =
    process.env.RESEND_API_KEY;

  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    "IF Sigorta <onboarding@resend.dev>";

  if (!apiKey) {
    const message =
      "RESEND_API_KEY est absent.";

    console.error(
      "Notification e-mail attribution non envoyée :",
      message,
    );

    return {
      sent: false,
      error: message,
    };
  }

  try {
    const resend =
      new Resend(apiKey);

    const safeAgentName =
      escapeEmailHtml(
        agentName.trim() ||
          "Agent",
      );

    const safeRequestCode =
      escapeEmailHtml(
        requestCode.trim() ||
          "—",
      );

    const safeClientName =
      escapeEmailHtml(
        clientName.trim() ||
          "Client",
      );

    const {
      error,
    } =
      await resend.emails.send({
        from: fromEmail,

        to: agentEmail,

        subject:
          `Nouveau dossier attribué — ${requestCode}`,

        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:32px 16px;color:#0f172a;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;">
              <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:12px;">
                IF Sigorta
              </div>

              <h1 style="font-size:22px;line-height:1.3;margin:0 0 18px;">
                Nouveau dossier attribué
              </h1>

              <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
                Bonjour ${safeAgentName},
              </p>

              <p style="font-size:15px;line-height:1.7;margin:0 0 22px;">
                Un dossier vient de vous être attribué dans l’espace administratif IF Sigorta.
              </p>

              <table style="width:100%;border-collapse:collapse;font-size:15px;">
                <tbody>
                  <tr>
                    <td style="padding:10px 0;font-weight:700;border-bottom:1px solid #e2e8f0;">
                      Matricule
                    </td>
                    <td style="padding:10px 0;text-align:right;border-bottom:1px solid #e2e8f0;">
                      ${safeRequestCode}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:10px 0;font-weight:700;">
                      Client
                    </td>
                    <td style="padding:10px 0;text-align:right;">
                      ${safeClientName}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p style="font-size:14px;line-height:1.7;margin:24px 0 0;color:#475569;">
                Connectez-vous à votre espace IF Sigorta pour consulter et traiter ce dossier.
              </p>

              <p style="margin-bottom:0;margin-top:24px;color:#94a3b8;font-size:12px;">
                IF Sigorta — notification automatique
              </p>
            </div>
          </div>
        `,
      });

    if (error) {
      const message =
        typeof error.message ===
        "string"
          ? error.message
          : "Erreur Resend inconnue.";

      console.error(
        "Notification e-mail attribution non envoyée :",
        error,
      );

      return {
        sent: false,
        error: message,
      };
    }

    return {
      sent: true,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur e-mail inconnue.";

    console.error(
      "Notification e-mail attribution impossible :",
      error,
    );

    return {
      sent: false,
      error: message,
    };
  }
}

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
    const assignmentUpdate = {
      assigned_agent_id:
        agentId,

      assigned_at:
        agentId
          ? new Date().toISOString()
          : null,
    };

    let finalUpdatedRequest:
      | {
          id: string;
          assigned_agent_id:
            | string
            | null;
          assigned_at:
            | string
            | null;
        }
      | null =
      null;

    if (
      previousAgentId === null
    ) {
      const {
        data: updatedRequest,
        error: updateError,
      } =
        await serviceClient
          .from(
            "insurance_requests",
          )
          .update(
            assignmentUpdate,
          )
          .eq(
            "id",
            requestId,
          )
          .is(
            "assigned_agent_id",
            null,
          )
          .select(
            `
              id,
              assigned_agent_id,
              assigned_at
            `,
          )
          .maybeSingle();

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }

      finalUpdatedRequest =
        updatedRequest;
    } else {
      const {
        data: updatedRequest,
        error: updateError,
      } =
        await serviceClient
          .from(
            "insurance_requests",
          )
          .update(
            assignmentUpdate,
          )
          .eq(
            "id",
            requestId,
          )
          .eq(
            "assigned_agent_id",
            previousAgentId,
          )
          .select(
            `
              id,
              assigned_agent_id,
              assigned_at
            `,
          )
          .maybeSingle();

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }

      finalUpdatedRequest =
        updatedRequest;
    }

    if (!finalUpdatedRequest) {
      return NextResponse.json(
        {
          error:
            "L’attribution du dossier a changé entre-temps. Actualisez la page.",
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
     * 9. JOURNAL D'ATTRIBUTION
     * ============================================
     */
    const action =
      agentId
        ? "request_assigned"
        : "request_unassigned";

    const description =
      agentId
        ? `Dossier ${insuranceRequest.request_code} attribué à ${agentName}.`
        : `Attribution du dossier ${insuranceRequest.request_code} supprimée.`;

    await safeInsertActivity({
      serviceClient,
      requestId,
      userId:
        currentUser.id,
      action,
      description,
    });

    /*
     * ============================================
     * 10. E-MAIL D'ATTRIBUTION
     * ============================================
     *
     * Seulement quand :
     * - un utilisateur est réellement attribué ;
     * - l'attribution a changé ;
     * - une adresse e-mail existe.
     *
     * Une erreur e-mail n'annule jamais
     * l'attribution du dossier.
     */
    let assignmentEmailSent =
      false;

    const isSelfAssignment =
      agentId === currentUser.id;

    if (
      agentId &&
      !isSelfAssignment
    ) {
      if (
        agentEmail &&
        agentName
      ) {
        const emailResult =
          await sendAssignmentEmail({
            agentEmail,
            agentName,
            requestCode:
              insuranceRequest.request_code,
            clientName,
          });

        assignmentEmailSent =
          emailResult.sent;

        if (emailResult.sent) {
          await safeInsertActivity({
            serviceClient,
            requestId,
            userId:
              currentUser.id,
            action:
              "assignment_email_sent",
            description:
              `Notification d’attribution envoyée à ${agentEmail}.`,
          });
        } else {
          await safeInsertActivity({
            serviceClient,
            requestId,
            userId:
              currentUser.id,
            action:
              "assignment_email_failed",
            description:
              `Échec de la notification d’attribution à ${agentEmail} : ${emailResult.error ?? "erreur inconnue"}`,
          });
        }
      } else {
        console.error(
          "Notification e-mail attribution non envoyée : l'utilisateur attribué ne possède pas d'adresse e-mail.",
        );

        await safeInsertActivity({
          serviceClient,
          requestId,
          userId:
            currentUser.id,
          action:
            "assignment_email_failed",
          description:
            "Notification d’attribution impossible : l’utilisateur attribué ne possède pas d’adresse e-mail.",
        });
      }
    }

    /*
     * ============================================
     * 11. SUCCÈS
     * ============================================
     */
    return NextResponse.json(
      {
        success: true,

        requestId,

        agentId,

        agentName,

        unchanged: false,

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
