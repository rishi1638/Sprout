"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToastError } from "@/hooks/use-toast-error";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/form-field";

const inviteSchema = z.object({
  child_id: z.string().uuid("Choose a child."),
  email: z.string().trim().email("Enter a valid parent email."),
  relationship: z.string().trim().min(1, "Relationship is required."),
  classroom_id: z.string().uuid("Choose a classroom."),
});

type InviteValues = z.infer<typeof inviteSchema>;

interface ParentInviteDialogProps {
  children: { id: string; first_name: string; last_name: string }[];
  classrooms: { id: string; name: string }[];
  trigger: React.ReactNode;
}

export function ParentInviteDialog({ children, classrooms, trigger }: ParentInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      child_id: children[0]?.id ?? "",
      email: "",
      relationship: "guardian",
      classroom_id: classrooms[0]?.id ?? "",
    },
  });

  const selectedChild = useMemo(() => children.find((child) => child.id === form.watch("child_id")), [children, form.watch("child_id")]);

  async function onSubmit(values: InviteValues) {
    setSaving(true);
    const supabase = createClient();
    const { data: existingProfile } = await supabase.from("profiles").select("id").eq("role", "parent").eq("full_name", values.email).maybeSingle();

    let parentId: string | null = existingProfile?.id ?? null;
    if (!parentId) {
      const { data: createdUser, error: createUserError } = await supabase.auth.signUp({
        email: values.email,
        password: crypto.randomUUID(),
      });
      if (createUserError || !createdUser.user) {
        setSaving(false);
        toastError("Couldn't invite parent", createUserError ?? new Error("No user returned"));
        return;
      }
      parentId = createdUser.user.id;
      await supabase.from("profiles").update({ full_name: values.email, role: "parent" }).eq("id", parentId);
    }

    const { error } = await supabase.from("guardianships").insert({
      child_id: values.child_id,
      parent_id: parentId,
      relationship: values.relationship,
      is_primary: true,
    });
    if (error) {
      setSaving(false);
      toastError("Couldn't link parent", error);
      return;
    }

    const { error: enrollmentError } = await supabase.from("enrollments").insert({
      child_id: values.child_id,
      classroom_id: values.classroom_id,
    });

    if (enrollmentError && enrollmentError.message !== "duplicate key value violates unique constraint \"enrollments_one_active_per_child\"") {
      setSaving(false);
      toastError("Couldn't enroll child in the classroom", enrollmentError);
      return;
    }

    setSaving(false);
    toast.success("Parent invited and linked to the child");
    form.reset({
      child_id: children[0]?.id ?? "",
      email: "",
      relationship: "guardian",
      classroom_id: classrooms[0]?.id ?? "",
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a parent</DialogTitle>
          <DialogDescription>Invite a caregiver to the classroom and connect them to the child profile.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Child" htmlFor="invite_child" error={form.formState.errors.child_id?.message}>
            <Select
              value={form.watch("child_id")}
              onValueChange={(value) => form.setValue("child_id", value, { shouldValidate: true })}
            >
              <SelectTrigger id="invite_child">
                <SelectValue placeholder="Select a child" />
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
          <Field label="Parent email" htmlFor="invite_email" error={form.formState.errors.email?.message}>
            <Input id="invite_email" type="email" {...form.register("email")} />
          </Field>
          <Field label="Relationship" htmlFor="invite_relationship" error={form.formState.errors.relationship?.message}>
            <Input id="invite_relationship" placeholder="Mother, Father, Guardian" {...form.register("relationship")} />
          </Field>
          <Field label="Classroom" htmlFor="invite_classroom" error={form.formState.errors.classroom_id?.message}>
            <Select
              value={form.watch("classroom_id")}
              onValueChange={(value) => form.setValue("classroom_id", value, { shouldValidate: true })}
            >
              <SelectTrigger id="invite_classroom">
                <SelectValue placeholder="Choose a classroom" />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {selectedChild ? (
            <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              The invite will connect {selectedChild.first_name} {selectedChild.last_name} to the selected classroom and parent account.
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Inviting…" : "Invite parent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
