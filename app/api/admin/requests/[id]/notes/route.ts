import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity/logActivity";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RequestBody = {
  content?: string;
};

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
    console.error(
      "Impossible d'enregistrer l'activité de la note :",
      error,
    );
  }
}

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
     * 1. AUTHENTIFICATION
     * ============================================
     */
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
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 2. RÔLE
     * ============================================
     */
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
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 3. IDENTIFIANT DU DOSSIER
     * ============================================
     */
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Identifiant du dossier absent.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 4. CONTENU DE LA NOTE
     * ============================================
     */
    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        {
          error: "Les données envoyées sont invalides.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

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
          headers: {
            "Cache-Control": "no-store",
          },
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
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 5. DOSSIER
     * ============================================
     */
    const serviceClient =
      createServiceClient();

    const {
      data: insuranceRequest,
      error: requestError,
    } = await serviceClient
      .from("insurance_requests")
      .select(
        `
          id,
          assigned_agent_id
        `,
      )
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
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 6. AUTORISATION AGENT
     * ============================================
     *
     * Un agent ne peut ajouter une note que sur
     * un dossier qui lui est attribué.
     *
     * L'admin conserve son accès à tous les dossiers.
     */
    if (
      role === "agent" &&
      insuranceRequest.assigned_agent_id !==
        user.id
    ) {
      return NextResponse.json(
        {
          error:
            insuranceRequest.assigned_agent_id
              ? "Ce dossier est attribué à un autre agent."
              : "Vous devez d’abord prendre en charge ce dossier.",
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 7. AJOUT DE LA NOTE
     * ============================================
     */
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

    /*
     * ============================================
     * 8. HISTORIQUE
     * ============================================
     *
     * Une erreur d'historique ne doit pas faire
     * croire que l'ajout de la note a échoué.
     */
    await safeLogActivity({
      requestId: id,
      userId: user.id,
      action: "note_added",
      description:
        "Une note interne a été ajoutée au dossier.",
    });

    /*
     * ============================================
     * 9. SUCCÈS
     * ============================================
     */
    return NextResponse.json(
      {
        success: true,
        note,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
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
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
