import "server-only";

import {
  redirect,
} from "next/navigation";

import {
  getUserRole,
} from "@/lib/auth/roles";

import {
  createServiceClient,
} from "@/lib/supabase/service";

import {
  createServerSupabaseClient,
} from "@/lib/supabase/server";

export async function requirePartner() {
  const supabase =
    await createServerSupabaseClient();

  const {
    data: {
      user,
    },
    error,
  } =
    await supabase.auth.getUser();

  if (
    error ||
    !user
  ) {
    redirect(
      "/partenaire/connexion",
    );
  }

  const role =
    getUserRole(
      user.app_metadata ??
        {},
    );

  if (
    role !== "partner"
  ) {
    redirect(
      "/partenaire/connexion?error=unauthorized",
    );
  }

  const serviceClient =
    createServiceClient();

  const {
    data: partner,
    error: partnerError,
  } =
    await serviceClient
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
        "auth_user_id",
        user.id,
      )
      .maybeSingle();

  if (
    partnerError
  ) {
    console.error(
      "Erreur vérification partenaire :",
      partnerError,
    );

    redirect(
      "/partenaire/connexion?error=account",
    );
  }

  if (!partner) {
    redirect(
      "/partenaire/connexion?error=account",
    );
  }

  if (
    !partner.is_active
  ) {
    redirect(
      "/partenaire/connexion?error=inactive",
    );
  }

  return {
    user,

    partner: {
      id:
        partner.id,

      code:
        partner.code,

      companyName:
        partner.company_name,

      managerName:
        partner.manager_name,

      email:
        partner.email,

      whatsappCountryCode:
        partner.whatsapp_country_code,

      whatsappNumber:
        partner.whatsapp_number,

      authUserId:
        partner.auth_user_id,

      isActive:
        partner.is_active,

      createdAt:
        partner.created_at,

      updatedAt:
        partner.updated_at,
    },
  };
}