import { Pencil, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateUserDialog, EditProfileDialog } from "@/components/forms/user-dialogs";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<Profile["role"], string> = {
  admin: "Director",
  staff: "Educator",
  parent: "Parent",
};

const ROLE_VARIANTS = {
  admin: "accent",
  staff: "default",
  parent: "muted",
} as const;

interface AssignmentRow {
  staff_id: string;
  classrooms: { name: string } | null;
}

export default async function AdminStaffPage() {
  const supabase = await createClient();

  const [profilesRes, assignmentsRes] = await Promise.all([
    supabase.from("profiles").select("*").order("role").order("full_name"),
    supabase.from("staff_assignments").select("staff_id, classrooms(name)"),
  ]);

  const profiles: Profile[] = profilesRes.data ?? [];
  const assignments = (assignmentsRes.data ?? []) as unknown as AssignmentRow[];
  const roomsByStaff = new Map<string, string[]>();
  for (const assignment of assignments) {
    if (!assignment.classrooms) continue;
    const rooms = roomsByStaff.get(assignment.staff_id) ?? [];
    rooms.push(assignment.classrooms.name);
    roomsByStaff.set(assignment.staff_id, rooms);
  }

  return (
    <>
      <PageHeader
        title="People"
        description="Every account: directors, educators, and parents."
        action={
          <CreateUserDialog
            trigger={
              <Button>
                <UserPlus /> Create account
              </Button>
            }
          />
        }
      />
      {profiles.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No accounts yet"
          description="Create educator and parent accounts so they can sign in."
        />
      ) : (
        <ul className="space-y-2">
          {profiles.map((profile) => (
            <li
              key={profile.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold">{profile.full_name || "Unnamed"}</p>
                <p className="text-sm text-muted-foreground">
                  {profile.phone ? `${profile.phone} · ` : ""}
                  {profile.role === "staff"
                    ? roomsByStaff.get(profile.id)?.join(", ") || "No rooms assigned"
                    : ROLE_LABELS[profile.role]}
                </p>
              </div>
              <Badge variant={ROLE_VARIANTS[profile.role]}>{ROLE_LABELS[profile.role]}</Badge>
              <EditProfileDialog
                profile={profile}
                trigger={
                  <Button variant="ghost" size="icon" aria-label={`Edit ${profile.full_name}`}>
                    <Pencil className="size-4" />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
