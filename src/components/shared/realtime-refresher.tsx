"use client";

import { useRealtimeRefresh } from "@/hooks/use-realtime-feed";

export function RealtimeRefresher({ table, channelKey }: { table: "activities" | "attendance"; channelKey: string }) {
  useRealtimeRefresh(table, channelKey);
  return null;
}
