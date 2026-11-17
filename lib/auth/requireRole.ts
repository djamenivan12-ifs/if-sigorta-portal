import { redirect } from "next/navigation";

import {
  getUserRole,
  UserRole,
} from "@/lib/auth/roles";

import { getVerifiedUser } from "./getVerifiedUser";

export async function requireRole<
  TAllowedRole extends UserRole,
>(
  allowedRoles: readonly TAllowedRole[],
) {
  const {
    data: {
      user,
    },
    error,
  } =
    await getVerifiedUser();

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