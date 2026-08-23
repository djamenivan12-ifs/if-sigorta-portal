import "server-only";

import {
  createClient,
} from "@supabase/supabase-js";

export function createServiceClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl
  ) {
    throw new Error(
      "La variable NEXT_PUBLIC_SUPABASE_URL est absente.",
    );
  }

  if (
    !serviceRoleKey
  ) {
    throw new Error(
      "La variable SUPABASE_SERVICE_ROLE_KEY est absente.",
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,

        detectSessionInUrl:
          false,
      },
    },
  );
}