import { redirect } from "next/navigation";

import {
  getUserRole,
  UserRole,
} from "@/lib/auth/roles";

import {
  createServerSupabaseClient,
} from "@/lib/supabase/server";

export async function requireRole(
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
      role,
    )
  ) {
    redirect(
      "/admin/acces-refuse",
    );
  }

  return {
    user,
    role,
  };
}