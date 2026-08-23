import { NextResponse } from "next/server";

import {
  requireApiRole,
} from "@/lib/auth/requireApiRole";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type RouteContext = {
  params: Promise<{
    id: string;
    noteId: string;
  }>;
};

export async function PATCH(
  request: Request,
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
    role,
  } =
    auth;

  const {
    id,
    noteId,
  } =
    await context.params;

  const serviceClient =
    createServiceClient();

  try {
    const body =
      await request.json();

    const content =
      typeof body?.content ===
      "string"
        ? body.content.trim()
        : "";

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La note ne peut pas être vide.",
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

    if (
      content.length >
      3000
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La note est trop longue.",
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

    const {
      data:
        note,
      error:
        noteError,
    } =
      await serviceClient
        .from(
          "client_notes",
        )
        .select(
          `
            id,
            client_id,
            user_id
          `,
        )
        .eq(
          "id",
          noteId,
        )
        .eq(
          "client_id",
          id,
        )
        .maybeSingle();

    if (noteError) {
      throw new Error(
        noteError.message,
      );
    }

    if (!note) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Note introuvable.",
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

    if (
      role === "agent" &&
      note.user_id !==
        user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vous ne pouvez modifier que vos propres notes.",
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

    const {
      data:
        updatedNote,
      error:
        updateError,
    } =
      await serviceClient
        .from(
          "client_notes",
        )
        .update({
          content,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          noteId,
        )
        .eq(
          "client_id",
          id,
        )
        .select(
          `
            id,
            client_id,
            user_id,
            content,
            created_at,
            updated_at
          `,
        )
        .single();

    if (updateError) {
      throw new Error(
        updateError.message,
      );
    }

    return NextResponse.json(
      {
        success: true,
        note:
          updatedNote,
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
      "Erreur modification note client :",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.",
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

export async function DELETE(
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
    role,
  } =
    auth;

  const {
    id,
    noteId,
  } =
    await context.params;

  const serviceClient =
    createServiceClient();

  try {
    const {
      data:
        note,
      error:
        noteError,
    } =
      await serviceClient
        .from(
          "client_notes",
        )
        .select(
          `
            id,
            client_id,
            user_id
          `,
        )
        .eq(
          "id",
          noteId,
        )
        .eq(
          "client_id",
          id,
        )
        .maybeSingle();

    if (noteError) {
      throw new Error(
        noteError.message,
      );
    }

    if (!note) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Note introuvable.",
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

    if (
      role === "agent" &&
      note.user_id !==
        user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vous ne pouvez supprimer que vos propres notes.",
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

    const {
      error:
        deleteError,
    } =
      await serviceClient
        .from(
          "client_notes",
        )
        .delete()
        .eq(
          "id",
          noteId,
        )
        .eq(
          "client_id",
          id,
        );

    if (deleteError) {
      throw new Error(
        deleteError.message,
      );
    }

    return NextResponse.json(
      {
        success: true,
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
      "Erreur suppression note client :",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.",
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