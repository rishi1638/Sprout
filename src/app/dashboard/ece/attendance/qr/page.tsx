import { ArrowLeft, QrCode } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { QRCodeSVG } from "qrcode.react";

export const dynamic = "force-dynamic";

export default async function AttendanceQrIndexPage() {
  await requireRole("ece");
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("child_id, classroom_id")
    .is("end_date", null)
    .order("child_id");

  const childIds = [...new Set((enrollments ?? []).map((row) => row.child_id))];
  const classroomIds = [...new Set((enrollments ?? []).map((row) => row.classroom_id))];

  const [childrenRes, classroomsRes] = await Promise.all([
    childIds.length
      ? supabase.from("children").select("id, first_name, last_name").in("id", childIds)
      : Promise.resolve({ data: [] as Array<{ id: string; first_name: string; last_name: string }> }),
    classroomIds.length
      ? supabase.from("classrooms").select("id, name").in("id", classroomIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const childrenById = new Map((childrenRes.data ?? []).map((child) => [child.id, child]));
  const classroomsById = new Map((classroomsRes.data ?? []).map((classroom) => [classroom.id, classroom]));

  const rows = (enrollments ?? []).map((row) => ({
    child_id: row.child_id,
    child: childrenById.get(row.child_id) ?? null,
    classroom: classroomsById.get(row.classroom_id) ?? null,
  }));

  return (
    <>
      <PageHeader title="QR codes" description="Open a child-specific attendance page for quick check-in and check-out." />
      <Button variant="ghost" asChild>
        <Link href="/dashboard/ece/attendance">
          <ArrowLeft className="mr-2 size-4" /> Back to attendance
        </Link>
      </Button>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {rows.map((row) => (
          <Card key={row.child_id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="size-4" /> {row.child ? `${row.child.first_name} ${row.child.last_name}` : "Child"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border bg-white p-4">
                <QRCodeSVG
                  value={`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dashboard/ece/attendance/scan/${row.child_id}`}
                  size={180}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {row.classroom?.name ? `Classroom: ${row.classroom.name}` : "Classroom: not assigned"}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/ece/attendance/${row.child_id}`}>Open QR page</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
