import { CalendarDays, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { Event } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RealtimeRefresher } from "@/components/shared/realtime-refresher";

export const dynamic = "force-dynamic";

export default async function ParentEventsPage() {
  await requireRole("parent");
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .in("audience", ["all", "parents"])
    .order("start_at", { ascending: false });

  const safeEvents = (events ?? []) as Event[];

  return (
    <>
      <PageHeader title="Events" description="See upcoming classroom and center activities." />
      {safeEvents.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description="Scheduled events will appear here for your family."
        />
      ) : (
        <div className="space-y-4">
          {safeEvents.map((event) => (
            <article key={event.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{event.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{event.description ?? "No description"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {new Date(event.start_at).toLocaleString()} – {new Date(event.end_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
