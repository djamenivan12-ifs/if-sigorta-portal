import {
  NextResponse,
} from "next/server";

import {
  requireApiRole,
} from "@/lib/auth/requireApiRole";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type RouteContext = {
  params:
    Promise<{
      id: string;
    }>;
};

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  const auth =
    await requireApiRole([
      "admin",
      "agent",
    ]);

  if (!auth.success) {
    return auth.response;
  }

  const {
    user,
  } =
    auth;

  try {
    const {
      id,
    } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Identifiant du renouvellement manquant.",
        },
        {
          status:
            400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const serviceClient =
      createServiceClient();

    const {
      data:
        renewal,
      error:
        renewalError,
    } =
      await serviceClient
        .from(
          "insurance_renewals",
        )
        .select(
          `
            id,
            request_id,
            status
          `,
        )
        .eq(
          "id",
          id,
        )
        .maybeSingle();

    if (renewalError) {
      throw new Error(
        renewalError.message,
      );
    }

    if (!renewal) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Renouvellement introuvable.",
        },
        {
          status:
            404,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const { data: dossier, error: accessError } = await serviceClient.from("insurance_requests").select("assigned_agent_id").eq("id", renewal.request_id).maybeSingle();
    if (accessError) throw accessError;
    if (!dossier || (auth.role === "agent" && dossier.assigned_agent_id && dossier.assigned_agent_id !== user.id)) return NextResponse.json({success:false,error:"Ce dossier ne vous est pas attribué."},{status:403});
    if (!["pending", "contacted", "interested"].includes(renewal.status)) return NextResponse.json({success:false,error:"Ce renouvellement ne peut plus être modifié."},{status:409});
    if (renewal.status === "interested") return NextResponse.json({success:true});
    const now =
      new Date().toISOString();

    const { data: updatedRenewal, error: updateError } =
      await serviceClient
        .from(
          "insurance_renewals",
        )
        .update({
          status:
            "contacted",

          updated_at:
            now,
        })
        .eq("id", id).eq("status", renewal.status).select("id").maybeSingle();

    if (updateError) {
      throw new Error(
        updateError.message,
      );
    }

    /*
     * Historique du dossier.
     */

    if (!updatedRenewal) return NextResponse.json({success:false,error:"Le renouvellement a changé. Actualisez la page."},{status:409});
    if (renewal.request_id) {
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
              renewal.request_id,

            user_id:
              user.id,

            action:
              "renewal_contacted",

            description:
              "Un contact WhatsApp a été préparé pour le renouvellement.",

            created_at:
              now,
          });

      if (
        activityError
      ) {
        console.error(
          "Historique renouvellement non enregistré :",
          activityError.message,
        );
      }
    }

    return NextResponse.json(
      {
        success:
          true,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (
    error
  ) {
    console.error(
      "Erreur contact renouvellement :",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}