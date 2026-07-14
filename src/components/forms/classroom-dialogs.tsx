"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToastError } from "@/hooks/use-toast-error";
import {
  classroomSchema,
  enrollmentSchema,
  staffAssignmentSchema,
  type ClassroomFormValues,
  type EnrollmentValues,
  type StaffAssignmentValues,
} from "@/lib/validations";
import type { Child, Classroom, Profile } from "@/types";
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

export function ClassroomFormDialog({ classroom, trigger }: { classroom?: Classroom; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  const form = useForm<z.input<typeof classroomSchema>, unknown, ClassroomFormValues>({
    resolver: zodResolver(classroomSchema),
    defaultValues: {
      name: classroom?.name ?? "",
      description: classroom?.description ?? "",
      capacity: classroom?.capacity ?? 10,
      min_age_months: classroom?.min_age_months ?? 0,
      max_age_months: classroom?.max_age_months ?? 0,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: values.name,
      description: values.description || null,
      capacity: values.capacity,
      min_age_months: values.min_age_months || null,
      max_age_months: values.max_age_months || null,
    };

    let error;
    if (classroom) {
      ({ error } = await supabase.from("classrooms").update(payload).eq("id", classroom.id));
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: center } = await supabase
        .from("centers")
        .select("id")
        .or(`admin_id.eq.${user?.id},admin_id.is.null`)
        .limit(1)
        .maybeSingle();

      if (!center?.id) {
        setSaving(false);
        toast.error("No daycare center found. Run the onboarding migration first.");
        return;
      }

      ({ error } = await supabase.from("classrooms").insert({ ...payload, center_id: center.id }));
    }
    setSaving(false);
    if (error) {
      toastError(classroom ? "Couldn't save classroom" : "Couldn't create classroom", error);
      return;
    }
    toast.success(classroom ? "Classroom updated" : "Classroom created");
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{classroom ? "Edit classroom" : "Create classroom"}</DialogTitle>
          <DialogDescription>Set the room&apos;s name, capacity, and age range.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Name" htmlFor="cl_name" error={form.formState.errors.name?.message}>
            <Input id="cl_name" placeholder="Toddler Room" {...form.register("name")} />
          </Field>
          <Field label="Description" htmlFor="cl_description" error={form.formState.errors.description?.message}>
            <Textarea id="cl_description" placeholder="Ages 18–36 months, north wing" {...form.register("description")} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Capacity" htmlFor="cl_capacity" error={form.formState.errors.capacity?.message}>
              <Input id="cl_capacity" type="number" min={1} {...form.register("capacity")} />
            </Field>
            <Field label="Min age (mo)" htmlFor="cl_min" error={form.formState.errors.min_age_months?.message}>
              <Input id="cl_min" type="number" min={0} {...form.register("min_age_months")} />
            </Field>
            <Field label="Max age (mo)" htmlFor="cl_max" error={form.formState.errors.max_age_months?.message}>
              <Input id="cl_max" type="number" min={0} {...form.register("max_age_months")} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : classroom ? "Save changes" : "Create classroom"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteClassroomButton({ classroom }: { classroom: Classroom }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("classrooms").delete().eq("id", classroom.id);
    setDeleting(false);
    if (error) {
      toastError("Couldn't delete classroom", error);
      return;
    }
    toast.success("Classroom deleted");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Delete ${classroom.name}`}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {classroom.name}?</DialogTitle>
          <DialogDescription>
            This removes the classroom along with its enrollments, staff assignments, and attendance
            history. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep classroom
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete classroom"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AssignStaffDialogProps {
  classroom: Classroom;
  staff: Pick<Profile, "id" | "full_name">[];
  assignedStaffIds: string[];
  trigger: React.ReactNode;
}

export function AssignStaffDialog({ classroom, staff, assignedStaffIds, trigger }: AssignStaffDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  const form = useForm<StaffAssignmentValues>({
    resolver: zodResolver(staffAssignmentSchema),
    defaultValues: { staff_id: "", classroom_id: classroom.id },
  });

  const assigned = new Set(assignedStaffIds);
  const available = staff.filter((member) => !assigned.has(member.id));

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("staff_assignments").insert({
      classroom_id: values.classroom_id,
      staff_id: values.staff_id,
    });
    if (!error) {
      await supabase.from("classrooms").update({ instructor_id: values.staff_id }).eq("id", values.classroom_id);
    }
    setSaving(false);
    if (error) {
      toastError("Couldn't assign educator", error);
      return;
    }
    toast.success("Educator assigned");
    form.reset({ staff_id: "", classroom_id: classroom.id });
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign educator to {classroom.name}</DialogTitle>
          <DialogDescription>Assigned educators can log activities and take attendance for this room.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Educator" htmlFor="staff_id" error={form.formState.errors.staff_id?.message}>
            <Select
              value={form.watch("staff_id")}
              onValueChange={(value) => form.setValue("staff_id", value, { shouldValidate: true })}
            >
              <SelectTrigger id="staff_id">
                <SelectValue placeholder={available.length ? "Select an educator" : "All educators assigned"} />
              </SelectTrigger>
              <SelectContent>
                {available.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name || "Unnamed educator"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || available.length === 0}>
              {saving ? "Assigning…" : "Assign educator"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UnassignStaffButton({ classroomId, staffId, name }: { classroomId: string; staffId: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  async function unassign() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("staff_assignments")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("staff_id", staffId);
    setBusy(false);
    if (error) {
      toastError("Couldn't remove educator", error);
      return;
    }
    toast.success(`${name} removed from room`);
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" onClick={unassign} disabled={busy} aria-label={`Remove ${name}`}>
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}

interface EnrollChildDialogProps {
  classroom: Classroom;
  children_options: Pick<Child, "id" | "first_name" | "last_name">[];
  trigger: React.ReactNode;
}

export function EnrollChildDialog({ classroom, children_options, trigger }: EnrollChildDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  const form = useForm<EnrollmentValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: { child_id: "", classroom_id: classroom.id },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("enrollments").insert({
      child_id: values.child_id,
      classroom_id: values.classroom_id,
    });
    if (!error) {
      await supabase.from("children").update({ classroom_id: values.classroom_id }).eq("id", values.child_id);
    }
    setSaving(false);
    if (error) {
      toastError("Couldn't enroll child", error);
      return;
    }
    toast.success("Child enrolled");
    form.reset({ child_id: "", classroom_id: classroom.id });
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll a child in {classroom.name}</DialogTitle>
          <DialogDescription>
            Only children without an active classroom are listed. Capacity is enforced automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Child" htmlFor="child_id" error={form.formState.errors.child_id?.message}>
            <Select
              value={form.watch("child_id")}
              onValueChange={(value) => form.setValue("child_id", value, { shouldValidate: true })}
            >
              <SelectTrigger id="child_id">
                <SelectValue placeholder={children_options.length ? "Select a child" : "No unassigned children"} />
              </SelectTrigger>
              <SelectContent>
                {children_options.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.first_name} {child.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || children_options.length === 0}>
              {saving ? "Enrolling…" : "Enroll child"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UnenrollChildButton({ enrollmentId, name }: { enrollmentId: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  async function unenroll() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("enrollments")
      .update({ end_date: new Date().toISOString().slice(0, 10) })
      .eq("id", enrollmentId);
    setBusy(false);
    if (error) {
      toastError("Couldn't end enrollment", error);
      return;
    }
    toast.success(`${name}'s enrollment ended`);
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" onClick={unenroll} disabled={busy} aria-label={`Unenroll ${name}`}>
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}
