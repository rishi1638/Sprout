import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { ActivityWithChild } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ActivityFeedItem } from "@/components/shared/activity-feed-item";
import { RealtimeRefresher } from "@/components/shared/realtime-refresher";

export const dynamic = "force-dynamic";

export default async function ParentFeedPage() {
  const profile = await requireRole("parent");
  const supabase = await createClient();

  const { data: guardianships } = await supabase
    .from("guardianships")
    .select("child_id")
    .eq("parent_id", profile.id);
  const childIds = (guardianships ?? []).map((row) => row.child_id);

  const activitiesRes = childIds.length
    ? await supabase
        .from("activities")
        .select("*, children(id, first_name, last_name), profiles(id, full_name)")
        .in("child_id", childIds)
        .order("occurred_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const activities = (activitiesRes.data ?? []) as unknown as ActivityWithChild[];

  return (
    <>
      <RealtimeRefresher table="activities" channelKey="parent-feed" />
      <PageHeader title="Today's moments" description="Live updates from your child's day." />
      {activities.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nothing here yet"
          description="Meals, naps, photos, and notes will appear here in real time as educators log them."
        />
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <ActivityFeedItem key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </>
  );
}
