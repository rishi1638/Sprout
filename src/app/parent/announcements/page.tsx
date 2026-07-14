import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { Announcement } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ActivityFeedItem } from "@/components/shared/activity-feed-item";
import { RealtimeRefresher } from "@/components/shared/realtime-refresher";

export const dynamic = "force-dynamic";

export default async function ParentAnnouncementsPage() {
  const profile = await requireRole("parent");
  const supabase = await createClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("active", true)
    .in("audience", ["all", "parents"])
    .order("created_at", { ascending: false });

  const safeAnnouncements = (announcements ?? []) as Announcement[];

  return (
    <>
      <PageHeader title="Announcements" description="Updates from your center." />
      {safeAnnouncements.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No announcements yet"
          description="Important messages will appear here when your center posts them."
        />
      ) : (
        <div className="space-y-4">
          {safeAnnouncements.map((announcement) => (
            <article key={announcement.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{announcement.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{announcement.message}</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(announcement.created_at).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
