import "server-only";
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// React cache is scoped to one server render, never shared between requests/users.
// Keep getUser(): revoked sessions and current app_metadata still come from Auth.
export const getVerifiedUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  return supabase.auth.getUser();
});
