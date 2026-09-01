import "server-only";

import {
  NextResponse,
} from "next/server";

import {
  getUserRole,
} from "@/lib/auth/roles";

import {
  createServiceClient,
} from "@/lib/supabase/service";

import {
  createServerSupabaseClient,
} from "@/lib/supabase/server";

function jsonError(
  error: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

export async function requireApiPartner() {
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
    return {
      success:
        false as const,

      response:
        jsonError(
          "Authentification requise.",
          401,
        ),
    };
  }

  const role =
    getUserRole(
      user.app_metadata ??
        {},
    );

  if (
    role !== "partner"
  ) {
    return {
      success:
        false as const,

      response:
        jsonError(
          "Accès partenaire refusé.",
          403,
        ),
    };
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
          is_active
        `,
      )
      .eq(
        "auth_user_id",
        user.id,
      )
      .maybeSingle();

  if (partnerError) {
    console.error(
      "Erreur vérification API partenaire :",
      partnerError,
    );

    return {
      success:
        false as const,

      response:
        jsonError(
          "Le compte partenaire n’a pas pu être vérifié.",
          500,
        ),
    };
  }

  if (!partner) {
    return {
      success:
        false as const,

      response:
        jsonError(
          "Aucun partenaire n’est associé à ce compte.",
          403,
        ),
    };
  }

  if (
    !partner.is_active
  ) {
    return {
      success:
        false as const,

      response:
        jsonError(
          "Ce compte partenaire est désactivé.",
          403,
        ),
    };
  }

  return {
    success:
      true as const,

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
    },
  };
}