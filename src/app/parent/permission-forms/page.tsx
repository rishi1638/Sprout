import { ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { PermissionForm } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RealtimeRefresher } from "@/components/shared/realtime-refresher";
import { SignPermissionButton } from "@/components/forms/sign-permission-button";

export const dynamic = "force-dynamic";

export default async function ParentPermissionFormsPage() {
  const profile = await requireRole("parent");
  const supabase = await createClient();

  const [{ data: forms }, { data: signatures }] = await Promise.all([
    supabase.from("permission_forms").select("*").eq("active", true).order("created_at", { ascending: true }),
    supabase.from("permission_signatures").select("*").eq("parent_id", profile.id),
  ]);

  const safeForms = (forms ?? []) as PermissionForm[];
  const signedMap = new Map((signatures ?? []).map((s) => [s.form_id, s]));

  return (
    <>
      <PageHeader title="Forms" description="Sign permission requests sent by your child's center." />
      {safeForms.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No pending forms"
          description="Your director will create a form when permission is required."
        />
      ) : (
        <div className="space-y-4">
          {safeForms.map((form) => (
            <article key={form.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{form.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{form.description ?? "No description"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Due {new Date(form.due_date).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <SignPermissionButton formId={form.id} parentId={profile.id} signed={Boolean(signedMap.get(form.id))} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
