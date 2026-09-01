import { NextResponse } from "next/server";

import {
  requireApiRole,
} from "@/lib/auth/requireApiRole";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type CreatePartnerPayload = {
  companyName?: string;
  managerName?: string;
  email?: string;
  password?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;
};

function cleanPhoneNumber(
  value: string,
) {
  return value.replace(
    /\D/g,
    "",
  );
}

function generatePartnerCode() {
  const randomPart =
    crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase();

  return `PART-${randomPart}`;
}

export async function POST(
  request: Request,
) {
  let createdAuthUserId:
    | string
    | null = null;

  try {
    /*
     * Seul un administrateur connecté
     * peut créer un partenaire.
     */
    const auth =
      await requireApiRole([
        "admin",
      ]);

    if (!auth.success) {
      return auth.response;
    }

    /*
     * Lecture du formulaire.
     */
    const body =
      (await request.json()) as CreatePartnerPayload;

    const companyName =
      body.companyName?.trim() ??
      "";

    const managerName =
      body.managerName?.trim() ??
      "";

    const email =
      body.email
        ?.trim()
        .toLowerCase() ??
      "";

    const password =
      body.password ?? "";

    const whatsappCountryCode =
      body.whatsappCountryCode
        ?.trim() ??
      "";

    const whatsappNumber =
      cleanPhoneNumber(
        body.whatsappNumber ??
          "",
      );

    /*
     * Validation.
     */
    if (
      !companyName ||
      !managerName ||
      !email ||
      !password ||
      !whatsappCountryCode ||
      !whatsappNumber
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tous les champs sont obligatoires.",
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
      !email.includes("@")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "L’adresse e-mail est invalide.",
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
      password.length < 8
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le mot de passe doit contenir au moins 8 caractères.",
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
     * Vérifier que l'adresse e-mail
     * n'est pas déjà utilisée par
     * un partenaire.
     */
    const {
      data: existingPartner,
      error:
        existingPartnerError,
    } =
      await serviceClient
        .from("partners")
        .select("id")
        .eq(
          "email",
          email,
        )
        .maybeSingle();

    if (
      existingPartnerError
    ) {
      throw new Error(
        existingPartnerError.message,
      );
    }

    if (existingPartner) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Un partenaire existe déjà avec cette adresse e-mail.",
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
     * Génération du code partenaire.
     */
    let partnerCode = "";

    for (
      let attempt = 0;
      attempt < 5;
      attempt += 1
    ) {
      const candidateCode =
        generatePartnerCode();

      const {
        data: existingCode,
        error:
          existingCodeError,
      } =
        await serviceClient
          .from("partners")
          .select("id")
          .eq(
            "code",
            candidateCode,
          )
          .maybeSingle();

      if (
        existingCodeError
      ) {
        throw new Error(
          existingCodeError.message,
        );
      }

      if (!existingCode) {
        partnerCode =
          candidateCode;

        break;
      }
    }

    if (!partnerCode) {
      throw new Error(
        "Impossible de générer un code partenaire unique.",
      );
    }

    /*
     * Création du compte Supabase Auth.
     *
     * Le rôle est stocké dans app_metadata
     * afin qu'il ne puisse pas être modifié
     * par le partenaire depuis le navigateur.
     */
    const {
      data: authData,
      error: authError,
    } =
      await serviceClient
        .auth
        .admin
        .createUser({
          email,
          password,

          email_confirm:
            true,

          user_metadata: {
            name:
              managerName,

            company_name:
              companyName,

            partner_code:
              partnerCode,
          },

          app_metadata: {
            role:
              "partner",
          },
        });

    if (authError) {
      const normalizedMessage =
        authError.message
          .toLowerCase();

      if (
        normalizedMessage.includes(
          "already",
        ) ||
        normalizedMessage.includes(
          "registered",
        ) ||
        normalizedMessage.includes(
          "exists",
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Un compte existe déjà avec cette adresse e-mail.",
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

      throw new Error(
        authError.message,
      );
    }

    if (!authData.user) {
      throw new Error(
        "Supabase n’a pas retourné l’utilisateur partenaire créé.",
      );
    }

    createdAuthUserId =
      authData.user.id;

    /*
     * Création de la fiche partenaire
     * liée au compte Supabase Auth.
     */
    const {
      data: partner,
      error: insertError,
    } =
      await serviceClient
        .from("partners")
        .insert({
          code:
            partnerCode,

          company_name:
            companyName,

          manager_name:
            managerName,

          email,

          whatsapp_country_code:
            whatsappCountryCode,

          whatsapp_number:
            whatsappNumber,

          auth_user_id:
            createdAuthUserId,

          is_active:
            true,
        })
        .select(
          `
            id,
            code,
            company_name,
            manager_name,
            email,
            whatsapp_country_code,
            whatsapp_number,
            auth_user_id,
            is_active,
            created_at
          `,
        )
        .single();

    if (insertError) {
      /*
       * Rollback :
       * si la fiche partenaire échoue,
       * supprimer immédiatement le compte
       * Auth créé juste avant.
       */
      const {
        error:
          rollbackError,
      } =
        await serviceClient
          .auth
          .admin
          .deleteUser(
            createdAuthUserId,
          );

      if (rollbackError) {
        console.error(
          "Impossible de supprimer le compte Auth partenaire après échec de création :",
          rollbackError,
        );
      }

      createdAuthUserId =
        null;

      const normalizedMessage =
        insertError.message
          .toLowerCase();

      if (
        normalizedMessage.includes(
          "duplicate",
        ) ||
        normalizedMessage.includes(
          "unique",
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Un partenaire existe déjà avec ces informations.",
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

      throw new Error(
        insertError.message,
      );
    }

    return NextResponse.json(
      {
        success: true,

        partnerId:
          partner.id,

        partnerCode:
          partner.code,

        partner,
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Erreur de création du partenaire :",
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