import { CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { ClassroomRatio } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RatioCard } from "@/components/shared/ratio-card";
import { RealtimeRefresher } from "@/components/shared/realtime-refresher";
import { AttendanceBoard, type AttendanceChild } from "@/components/forms/attendance-board";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";

export const dynamic = "force-dynamic";

interface EnrollmentRow {
  classroom_id: string;
  children: { id: string; first_name: string; last_name: string } | null;
  classrooms: { id: string; name: string } | null;
}

export default async function StaffAttendancePage() {
  const profile = await requireRole("staff");
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("staff_assignments")
    .select("classroom_id")
    .eq("staff_id", profile.id);
  const roomIds = (assignments ?? []).map((assignment) => assignment.classroom_id);

  const [enrollmentsRes, openAttendanceRes, ratiosRes] = await Promise.all([
    roomIds.length
      ? supabase
          .from("enrollments")
          .select("classroom_id, children(id, first_name, last_name), classrooms(id, name)")
          .in("classroom_id", roomIds)
          .is("end_date", null)
      : Promise.resolve({ data: [] }),
    roomIds.length
      ? supabase
          .from("attendance")
          .select("id, child_id, check_in_at")
          .in("classroom_id", roomIds)
          .is("check_out_at", null)
      : Promise.resolve({ data: [] }),
    roomIds.length
      ? supabase.from("classroom_ratios").select("*").in("classroom_id", roomIds).order("name")
      : Promise.resolve({ data: [] as ClassroomRatio[] }),
  ]);

  const rows = (enrollmentsRes.data ?? []) as unknown as EnrollmentRow[];
  const openByChild = new Map(
    (openAttendanceRes.data ?? []).map((record) => [record.child_id, record])
  );
  const ratios = (ratiosRes.data ?? []) as ClassroomRatio[];

  const childrenRows: AttendanceChild[] = rows
    .filter((row) => row.children && row.classrooms)
    .map((row) => {
      const open = openByChild.get(row.children!.id);
      return {
        child_id: row.children!.id,
        first_name: row.children!.first_name,
        last_name: row.children!.last_name,
        classroom_id: row.classroom_id,
        classroom_name: row.classrooms!.name,
        open_attendance_id: open?.id ?? null,
        check_in_at: open?.check_in_at ?? null,
      };
    })
    .sort((a, b) => a.first_name.localeCompare(b.first_name));

  return (
    <>
      <RealtimeRefresher table="attendance" channelKey="staff-attendance" />
      <PageHeader
        title="Attendance"
        description="Check children in and out. Ratios update live."
        action={
          <Button asChild variant="outline">
            <Link href="/staff/attendance/qr">
              <QrCode className="mr-2 size-4" /> QR codes
            </Link>
          </Button>
        }
      />
      {ratios.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {ratios.map((ratio) => (
            <RatioCard key={ratio.classroom_id} ratio={ratio} />
          ))}
        </div>
      ) : null}
      {childrenRows.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No children in your rooms"
          description="Attendance appears here once children are enrolled in your assigned classrooms."
        />
      ) : (
        <AttendanceBoard childrenRows={childrenRows} staffId={profile.id} />
      )}
    </>
  );
}
