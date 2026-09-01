import { redirect } from "next/navigation";

import {
  getUserRole,
  UserRole,
} from "@/lib/auth/roles";

import {
  createServerSupabaseClient,
} from "@/lib/supabase/server";

export async function requireRole<
  TAllowedRole extends UserRole,
>(
  allowedRoles: readonly TAllowedRole[],
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
    redirect(
      "/admin/connexion",
    );
  }

  const role =
    getUserRole(
      user.app_metadata ??
        {},
    );

  if (
    !role ||
    !allowedRoles.includes(
      role as TAllowedRole,
    )
  ) {
    redirect(
      "/admin/acces-refuse",
    );
  }

  return {
    user,
    role:
      role as TAllowedRole,
  };
}