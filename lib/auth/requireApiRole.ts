import { NextResponse } from "next/server";

import {
  getUserRole,
  UserRole,
} from "@/lib/auth/roles";

import {
  createServerSupabaseClient,
} from "@/lib/supabase/server";

export async function requireApiRole(
  allowedRoles: UserRole[],
) {
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
        NextResponse.json(
          {
            success:
              false,

            error:
              "Vous devez être connecté.",
          },
          {
            status:
              401,

            headers: {
              "Cache-Control":
                "no-store",
            },
          },
        ),
    };
  }

  const role =
    getUserRole(
      user.app_metadata ??
        {},
    );

  if (
    !role ||
    !allowedRoles.includes(
      role,
    )
  ) {
    return {
      success:
        false as const,

      response:
        NextResponse.json(
          {
            success:
              false,

            error:
              "Vous n’avez pas l’autorisation d’effectuer cette action.",
          },
          {
            status:
              403,

            headers: {
              "Cache-Control":
                "no-store",
            },
          },
        ),
    };
  }

  return {
    success:
      true as const,

    user,

    role,
  };
}