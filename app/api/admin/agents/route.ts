import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CreateAgentPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  role?: "agent" | "admin";
};

export async function POST(
  request: Request,
) {
  try {
    /*
     * Vérifier l'utilisateur connecté.
     */
    const sessionClient =
      await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } =
      await sessionClient.auth.getUser();

    if (
      userError ||
      !user
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
     * Seul un administrateur
     * peut créer des comptes.
     */
    const currentRole =
      user.app_metadata?.role;

    if (
      currentRole !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Seul un administrateur peut créer un agent.",
        },
        {
          status: 403,
        },
      );
    }

    const body =
      (await request.json()) as CreateAgentPayload;

    const firstName =
      body.firstName?.trim() ?? "";

    const lastName =
      body.lastName?.trim() ?? "";

    const email =
      body.email
        ?.trim()
        .toLowerCase() ??
      "";

    const password =
      body.password ?? "";

    const role =
      body.role;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "Tous les champs sont obligatoires.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      role !== "agent" &&
      role !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Le rôle sélectionné est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "Le mot de passe doit contenir au moins 8 caractères.",
        },
        {
          status: 400,
        },
      );
    }

    const serviceClient =
      createServiceClient();

    /*
     * Création dans Supabase Auth.
     */
    const {
      data,
      error,
    } =
      await serviceClient.auth.admin.createUser({
        email,
        password,

        email_confirm:
          true,

        user_metadata: {
          first_name:
            firstName,

          last_name:
            lastName,

          name:
            `${firstName} ${lastName}`,
        },

        app_metadata: {
          role,
        },
      });

    if (error) {
      /*
       * Message plus compréhensible
       * si l'email existe déjà.
       */
      if (
        error.message
          .toLowerCase()
          .includes(
            "already",
          )
      ) {
        return NextResponse.json(
          {
            error:
              "Un utilisateur existe déjà avec cette adresse email.",
          },
          {
            status: 409,
          },
        );
      }

      throw new Error(
        error.message,
      );
    }

    if (!data.user) {
      throw new Error(
        "Supabase n’a pas retourné l’utilisateur créé.",
      );
    }

    return NextResponse.json(
      {
        success: true,

        agentId:
          data.user.id,

        email:
          data.user.email,

        role,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Erreur de création de l’agent :",
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