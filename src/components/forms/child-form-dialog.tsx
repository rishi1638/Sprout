"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useToastError } from "@/hooks/use-toast-error";
import {
  childSchema,
  parseAllergies,
  parseImmunizations,
  type ChildFormValues,
} from "@/lib/validations";
import type { Child } from "@/types";
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

interface ChildFormDialogProps {
  child?: Child;
  trigger: React.ReactNode;
}

function toFormValues(child?: Child): ChildFormValues {
  return {
    first_name: child?.first_name ?? "",
    last_name: child?.last_name ?? "",
    dob: child?.dob ?? "",
    enrollment_status: child?.enrollment_status ?? "enrolled",
    allergies: child?.allergies.join(", ") ?? "",
    immunizations: Array.isArray(child?.immunizations)
      ? child.immunizations
          .map((entry) =>
            entry && typeof entry === "object" && !Array.isArray(entry) && typeof entry.name === "string"
              ? entry.name
              : ""
          )
          .filter(Boolean)
          .join(", ")
      : "",
    medical_notes: child?.medical_notes ?? "",
  };
}

export function ChildFormDialog({ child, trigger }: ChildFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  const form = useForm<ChildFormValues>({
    resolver: zodResolver(childSchema),
    defaultValues: toFormValues(child),
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(toFormValues(child));
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    const supabase = createClient();
    const payload = {
      first_name: values.first_name,
      last_name: values.last_name,
      dob: values.dob,
      enrollment_status: values.enrollment_status,
      allergies: parseAllergies(values.allergies),
      immunizations: parseImmunizations(values.immunizations),
      medical_notes: values.medical_notes || null,
    };

    const { error } = child
      ? await supabase.from("children").update(payload).eq("id", child.id)
      : await supabase.from("children").insert(payload);

    setSaving(false);
    if (error) {
      toastError(child ? "Couldn't save child" : "Couldn't add child", error);
      return;
    }
    toast.success(child ? "Child updated" : "Child added");
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{child ? "Edit child" : "Add a child"}</DialogTitle>
          <DialogDescription>
            {child
              ? "Update this child's profile and medical details."
              : "Create a profile, then link guardians and enroll them in a classroom."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="first_name" error={form.formState.errors.first_name?.message}>
              <Input id="first_name" {...form.register("first_name")} />
            </Field>
            <Field label="Last name" htmlFor="last_name" error={form.formState.errors.last_name?.message}>
              <Input id="last_name" {...form.register("last_name")} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date of birth" htmlFor="dob" error={form.formState.errors.dob?.message}>
              <Input id="dob" type="date" {...form.register("dob")} />
            </Field>
            <Field label="Enrollment status" htmlFor="enrollment_status" error={form.formState.errors.enrollment_status?.message}>
              <Select
                value={form.watch("enrollment_status")}
                onValueChange={(value) =>
                  form.setValue("enrollment_status", value as ChildFormValues["enrollment_status"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="enrollment_status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="waitlisted">Waitlisted</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field
            label="Allergies"
            htmlFor="allergies"
            hint="Separate with commas, e.g. peanuts, dairy"
            error={form.formState.errors.allergies?.message}
          >
            <Input id="allergies" placeholder="peanuts, dairy" {...form.register("allergies")} />
          </Field>
          <Field
            label="Immunizations"
            htmlFor="immunizations"
            hint="Separate with commas, e.g. MMR, DTaP"
            error={form.formState.errors.immunizations?.message}
          >
            <Input id="immunizations" placeholder="MMR, DTaP" {...form.register("immunizations")} />
          </Field>
          <Field label="Medical notes" htmlFor="medical_notes" error={form.formState.errors.medical_notes?.message}>
            <Textarea id="medical_notes" placeholder="Anything staff should know" {...form.register("medical_notes")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : child ? "Save changes" : "Add child"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
