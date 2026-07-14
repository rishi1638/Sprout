import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { ActivityWithChild } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ActivityFeedItem } from "@/components/shared/activity-feed-item";
import { ActivityLogger, type LoggerChild } from "@/components/forms/activity-logger";
import { DailySummaryComposer } from "@/components/forms/daily-summary-composer";

export const dynamic = "force-dynamic";

interface EnrollmentRow {
  classroom_id: string;
  children: { id: string; first_name: string; last_name: string } | null;
  classrooms: { id: string; name: string } | null;
}

export default async function StaffLogPage() {
  const profile = await requireRole("ece");
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("staff_assignments")
    .select("classroom_id")
    .eq("staff_id", profile.id);
  const roomIds = (assignments ?? []).map((assignment) => assignment.classroom_id);

  const enrollmentsRes = roomIds.length
    ? await supabase
        .from("enrollments")
        .select("classroom_id, children(id, first_name, last_name), classrooms(id, name)")
        .in("classroom_id", roomIds)
        .is("end_date", null)
    : { data: [] };

  const rows = (enrollmentsRes.data ?? []) as unknown as EnrollmentRow[];
  const childrenOptions: LoggerChild[] = rows
    .filter((row) => row.children && row.classrooms)
    .map((row) => ({
      id: row.children!.id,
      first_name: row.children!.first_name,
      last_name: row.children!.last_name,
      classroom_id: row.classroom_id,
      classroom_name: row.classrooms!.name,
    }))
    .sort((a, b) => a.first_name.localeCompare(b.first_name));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const activitiesRes =
    childrenOptions.length > 0
      ? await supabase
          .from("activities")
          .select("*, children(id, first_name, last_name), profiles(id, full_name)")
          .in("child_id", childrenOptions.map((child) => child.id))
          .gte("occurred_at", todayStart.toISOString())
          .order("occurred_at", { ascending: false })
          .limit(30)
      : { data: [] };

  const activities = (activitiesRes.data ?? []) as unknown as ActivityWithChild[];

  return (
    <>
      <PageHeader title="Daily log" description="Record meals, naps, changes, notes, and photos." />
      {childrenOptions.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No children to log for"
          description="Once you're assigned to a room with enrolled children, you can log their day here."
        />
      ) : (
        <>
          <ActivityLogger childrenOptions={childrenOptions} staffId={profile.id} />
          <DailySummaryComposer childrenOptions={childrenOptions} staffId={profile.id} />
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Today&apos;s entries</h2>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing logged yet today.</p>
            ) : (
              <div className="space-y-2">
                {activities.map((activity) => (
                  <ActivityFeedItem key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
