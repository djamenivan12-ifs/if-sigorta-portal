import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type UpdateAgentPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: "agent" | "admin";
  password?: string;
  disabled?: boolean;
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
     * Seul un administrateur peut
     * modifier les utilisateurs internes.
     */
    if (
      currentUser.app_metadata
        ?.role !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Seul un administrateur peut modifier un agent.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * Identifiant de l'utilisateur
     * que l'on souhaite modifier.
     */
    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Identifiant de l’utilisateur absent.",
        },
        {
          status: 400,
        },
      );
    }

    const isEditingSelf =
      id === currentUser.id;

    /*
     * Lecture du formulaire.
     */
    const body =
      (await request.json()) as UpdateAgentPayload;

    const firstName =
      body.firstName
        ?.trim() ??
      "";

    const lastName =
      body.lastName
        ?.trim() ??
      "";

    const email =
      body.email
        ?.trim()
        .toLowerCase() ??
      "";

    const role =
      body.role;

    const password =
      body.password ?? "";

    const disabled =
      body.disabled === true;

    /*
     * Validation des informations.
     */
    if (
      !firstName ||
      !lastName ||
      !email
    ) {
      return NextResponse.json(
        {
          error:
            "Le nom, le prénom et l’email sont obligatoires.",
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
      password &&
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

    /*
     * Sécurité :
     * un administrateur ne peut pas
     * se retirer lui-même son rôle.
     */
    if (
      isEditingSelf &&
      role !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Vous ne pouvez pas retirer votre propre rôle administrateur.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Sécurité :
     * un administrateur ne peut pas
     * désactiver son propre compte.
     */
    if (
      isEditingSelf &&
      disabled
    ) {
      return NextResponse.json(
        {
          error:
            "Vous ne pouvez pas désactiver votre propre compte.",
        },
        {
          status: 400,
        },
      );
    }

    const serviceClient =
      createServiceClient();

    /*
     * Vérification que l'utilisateur
     * existe réellement.
     */
    const {
      data: targetUserData,
      error: targetUserError,
    } =
      await serviceClient.auth.admin.getUserById(
        id,
      );

    if (targetUserError) {
      return NextResponse.json(
        {
          error:
            targetUserError.message,
        },
        {
          status: 404,
        },
      );
    }

    if (
      !targetUserData.user
    ) {
      return NextResponse.json(
        {
          error:
            "Utilisateur introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    const targetUser =
      targetUserData.user;

    const targetCurrentRole =
      targetUser.app_metadata
        ?.role;

    if (
      targetCurrentRole !==
        "agent" &&
      targetCurrentRole !==
        "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Ce compte n’est pas un utilisateur interne du portail.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Préparation de la mise à jour.
     */
    const updateData: {
      email: string;

      password?: string;

      user_metadata: {
        first_name: string;
        last_name: string;
        name: string;
      };

      app_metadata: {
        role:
          | "agent"
          | "admin";
      };

      ban_duration:
        | "none"
        | string;
    } = {
      email,

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

      /*
       * Désactivation longue durée.
       *
       * "none" réactive le compte.
       */
      ban_duration:
        disabled
          ? "876000h"
          : "none",
    };

    /*
     * On ne change le mot de passe
     * que si un nouveau mot de passe
     * a réellement été renseigné.
     */
    if (password) {
      updateData.password =
        password;
    }

    /*
     * Mise à jour Supabase Auth.
     */
    const {
      data,
      error,
    } =
      await serviceClient.auth.admin.updateUserById(
        id,
        updateData,
      );

    if (error) {
      const message =
        error.message ??
        "La mise à jour a échoué.";

      const normalizedMessage =
        message.toLowerCase();

      if (
        normalizedMessage.includes(
          "already",
        ) ||
        normalizedMessage.includes(
          "registered",
        ) ||
        normalizedMessage.includes(
          "duplicate",
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Cette adresse email est déjà utilisée par un autre compte.",
          },
          {
            status: 409,
          },
        );
      }

      throw new Error(
        message,
      );
    }

    if (!data.user) {
      throw new Error(
        "Supabase n’a pas retourné l’utilisateur mis à jour.",
      );
    }

    return NextResponse.json({
      success: true,

      agentId:
        data.user.id,

      email:
        data.user.email,

      role:
        data.user.app_metadata
          ?.role,

      disabled,
    });
  } catch (error) {
    console.error(
      "Erreur de modification de l’agent :",
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