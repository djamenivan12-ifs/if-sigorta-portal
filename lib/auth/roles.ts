export const USER_ROLES = [
  "agent",
  "admin",
  "partner",
] as const;

export type UserRole =
  (typeof USER_ROLES)[number];

export function getUserRole(
  appMetadata: Record<string, unknown>,
): UserRole | null {
  const role = appMetadata.role;

  if (
    typeof role === "string" &&
    USER_ROLES.includes(role as UserRole)
  ) {
    return role as UserRole;
  }

  return null;
}

export function hasRequiredRole(
  currentRole: UserRole | null,
  allowedRoles: UserRole[],
): boolean {
  return (
    currentRole !== null &&
    allowedRoles.includes(currentRole)
  );
}