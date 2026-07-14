"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase Realtime inserts on a table and refreshes the
 * current route's server data when new rows arrive.
 */
export function useRealtimeRefresh(table: "activities" | "attendance", channelKey: string) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`realtime-${table}-${channelKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, channelKey, router]);
}
