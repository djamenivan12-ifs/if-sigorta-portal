"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

function isIOSDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1)
  );
}

export default function NotificationsRealtimeSync() {
  const router = useRouter();

  useEffect(() => {
    /*
     * Sur iPhone/iPad, on évite Supabase Realtime
     * sur cette page car il provoque le plantage
     * constaté sur les navigateurs iOS.
     *
     * On garde néanmoins les notifications à jour
     * avec un rafraîchissement toutes les 30 secondes.
     */
    if (isIOSDevice()) {
      const interval = window.setInterval(() => {
        router.refresh();
      }, 30_000);

      return () => {
        window.clearInterval(interval);
      };
    }

    /*
     * Sur ordinateur / autres appareils :
     * Supabase Realtime reste actif.
     */
    const supabase = createClient();

    let refreshTimeout:
      | ReturnType<typeof setTimeout>
      | null = null;

    /*
     * Évite plusieurs router.refresh()
     * successifs si plusieurs événements arrivent
     * presque en même temps.
     */
    const scheduleRefresh = () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      refreshTimeout = setTimeout(() => {
        router.refresh();
        refreshTimeout = null;
      }, 500);
    };

    const requestsChannel = supabase
      .channel("notifications-requests-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "insurance_requests",
        },
        scheduleRefresh,
      )
      .subscribe();

    const renewalsChannel = supabase
      .channel("notifications-renewals-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "insurance_renewals",
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      void supabase.removeChannel(
        requestsChannel,
      );

      void supabase.removeChannel(
        renewalsChannel,
      );
    };
  }, [router]);

  return null;
}