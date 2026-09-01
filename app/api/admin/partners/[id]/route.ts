import {
  NextResponse,
} from "next/server";

import {
  requireApiRole,
} from "@/lib/auth/requireApiRole";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type UpdatePartnerPayload = {
  companyName?: string;
  managerName?: string;
  email?: string;
  password?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;
  isActive?: boolean;
};

function cleanPhoneNumber(
  value: string,
) {
  return value.replace(
    /\D/g,
    "",
  );
}

function isDuplicateError(
  message: string,
) {
  const normalized =
    message.toLowerCase();

  return (
    normalized.includes(
      "duplicate",
    ) ||
    normalized.includes(
      "unique",
    ) ||
    normalized.includes(
      "already",
    ) ||
    normalized.includes(
      "registered",
    ) ||
    normalized.includes(
      "exists",
    )
  );
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store",
  };
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const auth =
      await requireApiRole([
        "admin",
      ]);

    if (!auth.success) {
      return auth.response;
    }

    const {
      id,
    } =
      await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant partenaire invalide.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    const body =
      (await request.json()) as UpdatePartnerPayload;

    const companyName =
      body.companyName
        ?.trim();

    const managerName =
      body.managerName
        ?.trim();

    const email =
      body.email
        ?.trim()
        .toLowerCase();

    const password =
      body.password;

    const whatsappCountryCode =
      body.whatsappCountryCode
        ?.trim();

    const whatsappNumber =
      body.whatsappNumber !==
      undefined
        ? cleanPhoneNumber(
            body.whatsappNumber,
          )
        : undefined;

    if (
      companyName !==
        undefined &&
      !companyName
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nom du partenaire est obligatoire.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    if (
      managerName !==
        undefined &&
      !managerName
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nom du responsable est obligatoire.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    if (
      email !== undefined &&
      (
        !email ||
        !email.includes("@")
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "L’adresse e-mail est invalide.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    if (
      password !== undefined &&
      password.length < 8
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nouveau mot de passe doit contenir au moins 8 caractères.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    if (
      whatsappCountryCode !==
        undefined &&
      !whatsappCountryCode
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "L’indicatif WhatsApp est obligatoire.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    if (
      whatsappNumber !==
        undefined &&
      !whatsappNumber
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le numéro WhatsApp est obligatoire.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    const supabase =
      createServiceClient();

    const {
      data: existingPartner,
      error:
        existingPartnerError,
    } =
      await supabase
        .from("partners")
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
            created_at,
            updated_at
          `,
        )
        .eq(
          "id",
          id,
        )
        .maybeSingle();

    if (
      existingPartnerError
    ) {
      throw new Error(
        existingPartnerError.message,
      );
    }

    if (!existingPartner) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Partenaire introuvable.",
        },
        {
          status: 404,
          headers:
            noStoreHeaders(),
        },
      );
    }

    if (
      password &&
      !existingPartner.auth_user_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ce partenaire ne possède pas encore de compte de connexion.",
        },
        {
          status: 409,
          headers:
            noStoreHeaders(),
        },
      );
    }

    if (
      email !== undefined &&
      email !==
        existingPartner.email
    ) {
      const {
        data:
          partnerWithSameEmail,
        error:
          duplicateEmailError,
      } =
        await supabase
          .from("partners")
          .select("id")
          .eq(
            "email",
            email,
          )
          .neq(
            "id",
            id,
          )
          .maybeSingle();

      if (
        duplicateEmailError
      ) {
        throw new Error(
          duplicateEmailError.message,
        );
      }

      if (
        partnerWithSameEmail
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Un autre partenaire utilise déjà cette adresse e-mail.",
          },
          {
            status: 409,
            headers:
              noStoreHeaders(),
          },
        );
      }
    }

    const finalCompanyName =
      companyName ??
      existingPartner.company_name;

    const finalManagerName =
      managerName ??
      existingPartner.manager_name;

    const finalEmail =
      email ??
      existingPartner.email;

    const finalWhatsappCountryCode =
      whatsappCountryCode ??
      existingPartner.whatsapp_country_code;

    const finalWhatsappNumber =
      whatsappNumber ??
      existingPartner.whatsapp_number;

    const finalIsActive =
      typeof body.isActive ===
      "boolean"
        ? body.isActive
        : existingPartner.is_active;

    const authNeedsUpdate =
      Boolean(
        existingPartner.auth_user_id,
      ) &&
      (
        finalEmail !==
          existingPartner.email ||
        finalCompanyName !==
          existingPartner.company_name ||
        finalManagerName !==
          existingPartner.manager_name ||
        Boolean(password)
      );

    const updateTimestamp =
      new Date().toISOString();

    /*
     * 1. On met d'abord à jour la fiche
     * partenaire.
     *
     * Si cette étape échoue, Supabase Auth
     * n'a encore subi aucune modification.
     */

    const {
      data: updatedPartner,
      error: updateError,
    } =
      await supabase
        .from("partners")
        .update({
          company_name:
            finalCompanyName,

          manager_name:
            finalManagerName,

          email:
            finalEmail,

          whatsapp_country_code:
            finalWhatsappCountryCode,

          whatsapp_number:
            finalWhatsappNumber,

          is_active:
            finalIsActive,

          updated_at:
            updateTimestamp,
        })
        .eq(
          "id",
          id,
        )
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
            created_at,
            updated_at
          `,
        )
        .single();

    if (
      updateError
    ) {
      if (
        isDuplicateError(
          updateError.message,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Un partenaire utilise déjà ces informations.",
          },
          {
            status: 409,
            headers:
              noStoreHeaders(),
          },
        );
      }

      throw new Error(
        updateError.message,
      );
    }

    /*
     * 2. Synchronisation Supabase Auth.
     *
     * Elle n'est nécessaire que si les
     * informations utilisées par le compte
     * Auth ont changé ou si un nouveau mot
     * de passe a été fourni.
     */

    if (
      authNeedsUpdate &&
      existingPartner.auth_user_id
    ) {
      const {
        error:
          authUpdateError,
      } =
        await supabase
          .auth
          .admin
          .updateUserById(
            existingPartner.auth_user_id,
            {
              email:
                finalEmail,

              ...(password
                ? {
                    password,
                  }
                : {}),

              user_metadata: {
                name:
                  finalManagerName,

                company_name:
                  finalCompanyName,

                partner_code:
                  existingPartner.code,
              },

              app_metadata: {
                role:
                  "partner",
              },
            },
          );

      if (
        authUpdateError
      ) {
        /*
         * 3. Auth a échoué.
         *
         * On remet la fiche partenaire
         * exactement dans son état précédent.
         */

        const {
          error:
            rollbackError,
        } =
          await supabase
            .from("partners")
            .update({
              company_name:
                existingPartner.company_name,

              manager_name:
                existingPartner.manager_name,

              email:
                existingPartner.email,

              whatsapp_country_code:
                existingPartner.whatsapp_country_code,

              whatsapp_number:
                existingPartner.whatsapp_number,

              is_active:
                existingPartner.is_active,

              updated_at:
                existingPartner.updated_at,
            })
            .eq(
              "id",
              id,
            );

        if (
          rollbackError
        ) {
          console.error(
            "Échec du rollback partenaire après erreur Supabase Auth :",
            {
              partnerId:
                id,

              authUserId:
                existingPartner.auth_user_id,

              authError:
                authUpdateError.message,

              rollbackError:
                rollbackError.message,
            },
          );

          return NextResponse.json(
            {
              success: false,
              error:
                "La mise à jour du compte de connexion a échoué et la fiche partenaire n’a pas pu être restaurée automatiquement. Vérifiez ce partenaire dans Supabase.",
            },
            {
              status: 500,
              headers:
                noStoreHeaders(),
            },
          );
        }

        if (
          isDuplicateError(
            authUpdateError.message,
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
              headers:
                noStoreHeaders(),
            },
          );
        }

        return NextResponse.json(
          {
            success: false,
            error:
              "La mise à jour du compte de connexion a échoué. Les informations précédentes ont été restaurées.",
          },
          {
            status: 500,
            headers:
              noStoreHeaders(),
          },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        partner:
          updatedPartner,
      },
      {
        headers:
          noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error(
      "Erreur modification partenaire :",
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
        headers:
          noStoreHeaders(),
      },
    );
  }
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const auth =
      await requireApiRole([
        "admin",
      ]);

    if (!auth.success) {
      return auth.response;
    }

    const {
      id,
    } =
      await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant partenaire invalide.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    const supabase =
      createServiceClient();

    const {
      data: partner,
      error: partnerError,
    } =
      await supabase
        .from("partners")
        .select(
          `
            id,
            company_name,
            auth_user_id
          `,
        )
        .eq(
          "id",
          id,
        )
        .maybeSingle();

    if (
      partnerError
    ) {
      throw new Error(
        partnerError.message,
      );
    }

    if (!partner) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Partenaire introuvable.",
        },
        {
          status: 404,
          headers:
            noStoreHeaders(),
        },
      );
    }

    const {
      count:
        requestCount,
      error:
        requestCountError,
    } =
      await supabase
        .from(
          "insurance_requests",
        )
        .select(
          "id",
          {
            count:
              "exact",
            head:
              true,
          },
        )
        .eq(
          "partner_id",
          id,
        );

    if (
      requestCountError
    ) {
      throw new Error(
        requestCountError.message,
      );
    }

    if (
      (requestCount ??
        0) > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ce partenaire possède déjà des dossiers. Il ne peut pas être supprimé. Désactivez-le afin de conserver l’historique.",
        },
        {
          status: 409,
          headers:
            noStoreHeaders(),
        },
      );
    }

    const authUserId =
      partner.auth_user_id;

    /*
     * On supprime d'abord la fiche partenaire.
     *
     * Le garde partenaire exige une ligne
     * partners active liée à auth_user_id.
     * Ainsi, même si la suppression Auth
     * échoue ensuite, le compte orphelin
     * ne peut plus accéder à l'espace
     * partenaire.
     */

    const {
      error: deleteError,
    } =
      await supabase
        .from("partners")
        .delete()
        .eq(
          "id",
          id,
        );

    if (
      deleteError
    ) {
      throw new Error(
        deleteError.message,
      );
    }

    if (authUserId) {
      const {
        error:
          deleteAuthError,
      } =
        await supabase
          .auth
          .admin
          .deleteUser(
            authUserId,
          );

      if (
        deleteAuthError
      ) {
        console.error(
          "Fiche partenaire supprimée mais compte Auth non supprimé :",
          {
            partnerId:
              id,

            authUserId,

            error:
              deleteAuthError,
          },
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "La fiche partenaire a été supprimée, mais le compte de connexion n’a pas pu être supprimé. Vérifiez Supabase Auth.",
          },
          {
            status: 500,
            headers:
              noStoreHeaders(),
          },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Partenaire et compte de connexion supprimés avec succès.",
      },
      {
        headers:
          noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error(
      "Erreur suppression partenaire :",
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
        headers:
          noStoreHeaders(),
      },
    );
  }
}