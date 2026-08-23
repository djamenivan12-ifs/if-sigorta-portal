"use client";

import {
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

export default function NotificationsRealtimeSync() {
  const router =
    useRouter();

  useEffect(() => {
    const supabase =
      createClient();

    const requestsChannel =
      supabase
        .channel(
          "notifications-requests-sync",
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "insurance_requests",
          },
          () => {
            router.refresh();
          },
        )
        .subscribe();

    const renewalsChannel =
      supabase
        .channel(
          "notifications-renewals-sync",
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "insurance_renewals",
          },
          () => {
            router.refresh();
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        requestsChannel,
      );

      void supabase.removeChannel(
        renewalsChannel,
      );
    };
  }, [
    router,
  ]);

  return null;
}