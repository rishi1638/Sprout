import { School } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { ActivityWithChild, ClassroomRatio } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RatioCard } from "@/components/shared/ratio-card";
import { ActivityFeedItem } from "@/components/shared/activity-feed-item";
import { RealtimeRefresher } from "@/components/shared/realtime-refresher";

export const dynamic = "force-dynamic";

export default async function StaffHomePage() {
  const profile = await requireRole("ece");
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("staff_assignments")
    .select("classroom_id")
    .eq("staff_id", profile.id);

  const roomIds = (assignments ?? []).map((assignment) => assignment.classroom_id);

  const [ratiosRes, activitiesRes] = await Promise.all([
    roomIds.length
      ? supabase.from("classroom_ratios").select("*").in("classroom_id", roomIds).order("name")
      : Promise.resolve({ data: [] as ClassroomRatio[] }),
    roomIds.length
      ? supabase
          .from("activities")
          .select("*, children(id, first_name, last_name), profiles(id, full_name)")
          .in("classroom_id", roomIds)
          .order("occurred_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  const ratios = (ratiosRes.data ?? []) as ClassroomRatio[];
  const activities = (activitiesRes.data ?? []) as unknown as ActivityWithChild[];

  return (
    <>
      <RealtimeRefresher table="attendance" channelKey="staff-home" />
      <PageHeader
        title={`Hi, ${profile.full_name.split(" ")[0] || "there"}`}
        description="Your rooms right now."
      />
      {ratios.length === 0 ? (
        <EmptyState
          icon={School}
          title="No rooms assigned"
          description="Ask your director to assign you to a classroom. Your rooms will appear here."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ratios.map((ratio) => (
            <RatioCard key={ratio.classroom_id} ratio={ratio} />
          ))}
        </div>
      )}
      {activities.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Recent activity in your rooms</h2>
          <div className="space-y-2">
            {activities.map((activity) => (
              <ActivityFeedItem key={activity.id} activity={activity} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
