import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity/logActivity";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RequestBody = {
  content?: string;
};

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const sessionClient =
      await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await sessionClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Vous devez être connecté.",
        },
        {
          status: 401,
        },
      );
    }

    const role = user.app_metadata?.role;

    if (
      role !== "agent" &&
      role !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Vous n’avez pas l’autorisation d’ajouter une note.",
        },
        {
          status: 403,
        },
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Identifiant du dossier absent.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      (await request.json()) as RequestBody;

    const content =
      body.content?.trim() ?? "";

    if (!content) {
      return NextResponse.json(
        {
          error:
            "Le contenu de la note est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        {
          error:
            "La note ne doit pas dépasser 2000 caractères.",
        },
        {
          status: 400,
        },
      );
    }

    const serviceClient =
      createServiceClient();

    const {
      data: insuranceRequest,
      error: requestError,
    } = await serviceClient
      .from("insurance_requests")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (requestError) {
      throw new Error(
        requestError.message,
      );
    }

    if (!insuranceRequest) {
      return NextResponse.json(
        {
          error: "Dossier introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    const {
      data: note,
      error: insertError,
    } = await serviceClient
      .from("request_notes")
      .insert({
        request_id: id,
        user_id: user.id,
        content,
      })
      .select(
        `
          id,
          request_id,
          user_id,
          content,
          created_at,
          updated_at
        `,
      )
      .single();

    if (insertError) {
      throw new Error(
        insertError.message,
      );
    }

    await logActivity({
      requestId: id,
      userId: user.id,
      action: "note_added",
      description:
        "Une note interne a été ajoutée au dossier.",
    });

    return NextResponse.json({
      success: true,
      note,
    });
  } catch (error) {
    console.error(
      "Erreur lors de l’ajout de la note :",
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