"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useToastError } from "@/hooks/use-toast-error";
import { permissionFormSchema, type PermissionFormValues } from "@/lib/validations";
import type { Child, PermissionForm } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/form-field";

interface PermissionFormDialogProps {
  form?: PermissionForm;
  children: Pick<Child, "id" | "first_name" | "last_name">[];
  trigger: React.ReactNode;
}

export function PermissionFormDialog({ form, children, trigger }: PermissionFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  const formControl = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: {
      title: form?.title ?? "",
      description: form?.description ?? "",
      child_id: form?.child_id ?? children[0]?.id ?? "",
      due_date: form?.due_date ?? new Date().toISOString().slice(0, 10),
      active: form?.active ?? true,
    },
  });

  const onSubmit = formControl.handleSubmit(async (values) => {
    setSaving(true);
    const supabase = createClient();
    const payload = {
      title: values.title,
      description: values.description || null,
      child_id: values.child_id,
      due_date: values.due_date,
      active: values.active,
    };

    const { error } = form
      ? await supabase.from("permission_forms").update(payload).eq("id", form.id)
      : await supabase.from("permission_forms").insert(payload);

    setSaving(false);

    if (error) {
      toastError(form ? "Couldn't update permission form" : "Couldn't create permission form", error);
      return;
    }

    toast.success(form ? "Permission form updated" : "Permission form created");
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form ? "Edit permission form" : "Create permission form"}</DialogTitle>
          <DialogDescription>Send a form to a guardian for signatures and approvals.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Title" htmlFor="permission_title" error={formControl.formState.errors.title?.message}>
            <Input id="permission_title" {...formControl.register("title")} />
          </Field>
          <Field label="Description" htmlFor="permission_description" error={formControl.formState.errors.description?.message}>
            <Textarea id="permission_description" rows={4} {...formControl.register("description")} />
          </Field>
          <Field label="Child" htmlFor="permission_child" error={formControl.formState.errors.child_id?.message}>
            <Select
              value={formControl.watch("child_id")}
              onValueChange={(value) => formControl.setValue("child_id", value as PermissionFormValues["child_id"], { shouldValidate: true })}
            >
              <SelectTrigger id="permission_child">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.first_name} {child.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Due date" htmlFor="permission_due" error={formControl.formState.errors.due_date?.message}>
            <Input id="permission_due" type="date" {...formControl.register("due_date")} />
          </Field>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="permission_active" className="text-sm font-semibold">
              Active
            </label>
            <Input
              id="permission_active"
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus-visible:ring-primary"
              checked={formControl.watch("active")}
              onChange={(event) => formControl.setValue("active", event.target.checked)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : form ? "Save form" : "Create form"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
