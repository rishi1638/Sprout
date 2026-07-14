import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ageFromDob } from "@/lib/utils";
import type { ChildWithRelations } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const dynamic = "force-dynamic";

export default async function ParentChildrenPage() {
  const profile = await requireRole("parent");
  const supabase = await createClient();

  const { data: guardianships } = await supabase
    .from("guardianships")
    .select("child_id")
    .eq("parent_id", profile.id);
  const childIds = (guardianships ?? []).map((row) => row.child_id);

  const childrenRes = childIds.length
    ? await supabase
        .from("children")
        .select(
          "*, guardianships(*, profiles(id, full_name, phone)), enrollments(*, classrooms(id, name)), emergency_contacts(*)"
        )
        .in("id", childIds)
        .order("last_name")
    : { data: [] };

  const children = (childrenRes.data ?? []) as unknown as ChildWithRelations[];

  return (
    <>
      <PageHeader title="My children" description="Profiles on file with your daycare." />
      {children.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="No children linked"
          description="Ask your daycare's director to link your account to your child's profile."
        />
      ) : (
        <div className="space-y-4">
          {children.map((child) => {
            const activeEnrollment = child.enrollments.find((enrollment) => enrollment.end_date === null);
            const immunizations = Array.isArray(child.immunizations)
              ? child.immunizations
                  .map((entry) =>
                    entry && typeof entry === "object" && !Array.isArray(entry) && typeof entry.name === "string"
                      ? entry.name
                      : null
                  )
                  .filter((name): name is string => name !== null)
              : [];
            return (
              <Card key={child.id}>
                <CardHeader>
                  <CardTitle>
                    {child.first_name} {child.last_name}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">{ageFromDob(child.dob)}</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {activeEnrollment?.classrooms?.name ?? "Not currently in a classroom"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold">Allergies</h4>
                    {child.allergies.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None on file.</p>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {child.allergies.map((allergy) => (
                          <Badge key={allergy} variant="destructive">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Immunizations</h4>
                    {immunizations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None on file.</p>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {immunizations.map((name) => (
                          <Badge key={name} variant="muted">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Emergency contacts</h4>
                    {child.emergency_contacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None on file.</p>
                    ) : (
                      <ul className="mt-1 space-y-1 text-sm">
                        {[...child.emergency_contacts]
                          .sort((a, b) => a.priority - b.priority)
                          .map((contact) => (
                            <li key={contact.id}>
                              <span className="font-semibold">{contact.name}</span>{" "}
                              <span className="text-muted-foreground">
                                · {contact.relationship} · {contact.phone}
                              </span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                  {child.medical_notes ? (
                    <div>
                      <h4 className="text-sm font-bold">Medical notes</h4>
                      <p className="text-sm text-muted-foreground">{child.medical_notes}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
