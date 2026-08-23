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

    const now =
      new Date().toISOString();

    const {
      error:
        updateError,
    } =
      await serviceClient
        .from(
          "insurance_renewals",
        )
        .update({
          status:
            "interested",

          updated_at:
            now,
        })
        .eq(
          "id",
          id,
        );

    if (updateError) {
      throw new Error(
        updateError.message,
      );
    }

    if (
      renewal.request_id
    ) {
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
              "renewal_interested",

            description:
              "Le client a confirmé son intérêt pour le renouvellement.",

            created_at:
              now,
          });

      if (
        activityError
      ) {
        console.error(
          "Historique intérêt renouvellement non enregistré :",
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
      "Erreur intérêt renouvellement :",
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