import { Pencil, Plus, School, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Classroom, ClassroomRatio } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RatioCard } from "@/components/shared/ratio-card";
import {
  AssignStaffDialog,
  ClassroomFormDialog,
  DeleteClassroomButton,
  EnrollChildDialog,
  UnassignStaffButton,
  UnenrollChildButton,
} from "@/components/forms/classroom-dialogs";

export const dynamic = "force-dynamic";

interface StaffAssignmentRow {
  classroom_id: string;
  staff_id: string;
  profiles: { id: string; full_name: string } | null;
}

interface EnrollmentRow {
  id: string;
  classroom_id: string;
  end_date: string | null;
  children: { id: string; first_name: string; last_name: string } | null;
}

export default async function AdminClassroomsPage() {
  const supabase = await createClient();

  const [classroomsRes, ratiosRes, staffRes, assignmentsRes, enrollmentsRes, unassignedRes] =
    await Promise.all([
      supabase.from("classrooms").select("*").order("name"),
      supabase.from("classroom_ratios").select("*"),
      supabase.from("profiles").select("id, full_name").eq("role", "staff").order("full_name"),
      supabase.from("staff_assignments").select("classroom_id, staff_id, profiles(id, full_name)"),
      supabase
        .from("enrollments")
        .select("id, classroom_id, end_date, children(id, first_name, last_name)")
        .is("end_date", null),
      supabase.from("children").select("id, first_name, last_name").eq("enrollment_status", "enrolled").order("last_name"),
    ]);

  const classrooms: Classroom[] = classroomsRes.data ?? [];
  const ratios = new Map<string, ClassroomRatio>(
    ((ratiosRes.data ?? []) as ClassroomRatio[]).map((ratio) => [ratio.classroom_id, ratio])
  );
  const staff = staffRes.data ?? [];
  const assignments = (assignmentsRes.data ?? []) as unknown as StaffAssignmentRow[];
  const enrollments = (enrollmentsRes.data ?? []) as unknown as EnrollmentRow[];
  const enrolledChildIds = new Set(enrollments.map((row) => row.children?.id).filter(Boolean));
  const unassignedChildren = (unassignedRes.data ?? []).filter((child) => !enrolledChildIds.has(child.id));

  return (
    <>
      <PageHeader
        title="Classrooms"
        description="Rooms, capacity, educators, and enrollment."
        action={
          <ClassroomFormDialog
            trigger={
              <Button>
                <Plus /> New classroom
              </Button>
            }
          />
        }
      />
      {classrooms.length === 0 ? (
        <EmptyState
          icon={School}
          title="No classrooms yet"
          description="Create a room, set its capacity, then assign educators and enroll children."
          action={<ClassroomFormDialog trigger={<Button>New classroom</Button>} />}
        />
      ) : (
        <div className="space-y-4">
          {classrooms.map((classroom) => {
            const ratio = ratios.get(classroom.id);
            const roomStaff = assignments.filter((assignment) => assignment.classroom_id === classroom.id);
            const roomEnrollments = enrollments.filter((enrollment) => enrollment.classroom_id === classroom.id);

            return (
              <Card key={classroom.id}>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>{classroom.name}</CardTitle>
                    {classroom.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{classroom.description}</p>
                    ) : null}
                    {classroom.min_age_months !== null || classroom.max_age_months !== null ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ages {classroom.min_age_months ?? 0}–{classroom.max_age_months ?? "∞"} months
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <ClassroomFormDialog
                      classroom={classroom}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Edit ${classroom.name}`}>
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                    <DeleteClassroomButton classroom={classroom} />
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-3">
                  {ratio ? <RatioCard ratio={ratio} /> : null}

                  <div className="rounded-lg border border-border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-bold">Educators</h4>
                      <AssignStaffDialog
                        classroom={classroom}
                        staff={staff}
                        assignedStaffIds={roomStaff.map((assignment) => assignment.staff_id)}
                        trigger={
                          <Button variant="secondary" size="sm">
                            <UserPlus /> Assign
                          </Button>
                        }
                      />
                    </div>
                    {roomStaff.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No educators assigned.</p>
                    ) : (
                      <ul className="space-y-1">
                        {roomStaff.map((assignment) => (
                          <li key={assignment.staff_id} className="flex items-center justify-between text-sm">
                            <span className="truncate">{assignment.profiles?.full_name ?? "Unnamed"}</span>
                            <UnassignStaffButton
                              classroomId={classroom.id}
                              staffId={assignment.staff_id}
                              name={assignment.profiles?.full_name ?? "educator"}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-bold">Children</h4>
                      <EnrollChildDialog
                        classroom={classroom}
                        children_options={unassignedChildren}
                        trigger={
                          <Button variant="secondary" size="sm">
                            <Plus /> Enroll
                          </Button>
                        }
                      />
                    </div>
                    {roomEnrollments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No children enrolled.</p>
                    ) : (
                      <ul className="space-y-1">
                        {roomEnrollments.map((enrollment) => (
                          <li key={enrollment.id} className="flex items-center justify-between text-sm">
                            <span className="truncate">
                              {enrollment.children
                                ? `${enrollment.children.first_name} ${enrollment.children.last_name}`
                                : "Unknown child"}
                            </span>
                            <UnenrollChildButton
                              enrollmentId={enrollment.id}
                              name={enrollment.children?.first_name ?? "child"}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
