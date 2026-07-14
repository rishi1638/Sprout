import { Baby, Link2, Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ageFromDob } from "@/lib/utils";
import type { ChildWithRelations } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ChildFormDialog } from "@/components/forms/child-form-dialog";
import { ChildLinksDialog } from "@/components/forms/child-links-dialog";
import { ParentInviteDialog } from "@/components/forms/parent-invite-dialog";

export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  enrolled: "default",
  waitlisted: "accent",
  withdrawn: "muted",
} as const;

export default async function AdminChildrenPage() {
  const supabase = await createClient();

  const [childrenRes, parentsRes, classroomsRes] = await Promise.all([
    supabase
      .from("children")
      .select(
        "*, guardianships(*, profiles(id, full_name, phone)), enrollments(*, classrooms(id, name)), emergency_contacts(*)"
      )
      .order("last_name"),
    supabase.from("profiles").select("id, full_name").eq("role", "parent").order("full_name"),
    supabase.from("classrooms").select("id, name").order("name"),
  ]);

  const children = (childrenRes.data ?? []) as unknown as ChildWithRelations[];
  const parents = parentsRes.data ?? [];
  const classrooms = classroomsRes.data ?? [];

  return (
    <>
      <PageHeader
        title="Children"
        description="Profiles, guardians, and emergency contacts."
        action={
          <ChildFormDialog
            trigger={
              <Button>
                <Plus /> Add child
              </Button>
            }
          />
        }
      />
      {children.length === 0 ? (
        <EmptyState
          icon={Baby}
          title="No children yet"
          description="Add your first child profile to begin enrollment."
          action={<ChildFormDialog trigger={<Button>Add child</Button>} />}
        />
      ) : (
        <ul className="space-y-3">
          {children.map((child) => {
            const activeEnrollment = child.enrollments.find((enrollment) => enrollment.end_date === null);
            return (
              <li key={child.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {child.first_name} {child.last_name}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">{ageFromDob(child.dob)}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activeEnrollment?.classrooms?.name ?? "Not enrolled in a classroom"}
                      {child.guardianships.length > 0
                        ? ` · ${child.guardianships.map((g) => g.profiles?.full_name).filter(Boolean).join(", ")}`
                        : " · No guardians linked"}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[child.enrollment_status]}>{child.enrollment_status}</Badge>
                  <ParentInviteDialog
                    children={[{ id: child.id, first_name: child.first_name, last_name: child.last_name }]}
                    classrooms={classrooms}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Link2 /> Invite parent
                      </Button>
                    }
                  />
                  <ChildLinksDialog
                    child={child}
                    parents={parents}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Link2 /> Guardians
                      </Button>
                    }
                  />
                  <ChildFormDialog
                    child={child}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Edit ${child.first_name}`}>
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                </div>
                {child.allergies.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {child.allergies.map((allergy) => (
                      <Badge key={allergy} variant="destructive">
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
