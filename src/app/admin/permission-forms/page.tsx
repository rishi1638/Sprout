import { ClipboardCheck, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { Child, PermissionForm } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionFormDialog } from "@/components/forms/permission-form-dialog";

export const dynamic = "force-dynamic";

interface PermissionFormRow extends PermissionForm {
  children: { id: string; first_name: string; last_name: string } | null;
}

export default async function AdminPermissionFormsPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const [formsRes, childrenRes] = await Promise.all([
    supabase.from("permission_forms").select("*, children(id, first_name, last_name)").order("due_date", { ascending: true }),
    supabase.from("children").select("id, first_name, last_name").order("last_name"),
  ]);

  const forms = (formsRes.data ?? []) as unknown as PermissionFormRow[];
  const children = (childrenRes.data ?? []) as Child[];

  return (
    <>
      <PageHeader
        title="Permission forms"
        description="Manage permission requests and approvals for upcoming activities."
        action={
          <PermissionFormDialog
            children={children}
            trigger={
              <Button>
                New form
              </Button>
            }
          />
        }
      />

      {forms.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No permission forms yet"
          description="Create a form for field trips, media releases, or special permissions."
          action={<PermissionFormDialog children={children} trigger={<Button>New form</Button>} />}
        />
      ) : (
        <div className="space-y-4">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{form.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{form.children ? `${form.children.first_name} ${form.children.last_name}` : "Unknown child"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={form.active ? "default" : "muted"}>
                    {form.active ? "Open" : "Closed"}
                  </Badge>
                  <PermissionFormDialog
                    form={form}
                    children={children}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Edit form">
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{form.description ?? "No description"}</p>
                <p className="text-sm text-muted-foreground">Due {new Date(form.due_date).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
