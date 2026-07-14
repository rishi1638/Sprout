"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useToastError } from "@/hooks/use-toast-error";
import { staffProfileSchema, type StaffProfileValues } from "@/lib/validations";
import { createUserAction } from "@/app/admin/staff/actions";
import type { Profile } from "@/types";
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

const newUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Initial password needs at least 8 characters."),
  full_name: z.string().trim().min(1, "Full name is required."),
  role: z.enum(["admin", "staff", "parent"]),
});
type NewUserValues = z.infer<typeof newUserSchema>;

export function CreateUserDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<NewUserValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { email: "", password: "", full_name: "", role: "staff" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createUserAction(values);
      if (!result.ok) {
        toast.error("Couldn't create account", { description: result.message });
        return;
      }
      toast.success("Account created", { description: "Share the email and initial password with them securely." });
      form.reset({ email: "", password: "", full_name: "", role: "staff" });
      setOpen(false);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an account</DialogTitle>
          <DialogDescription>
            For educators and parents. They sign in with this email and initial password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Full name" htmlFor="u_name" error={form.formState.errors.full_name?.message}>
            <Input id="u_name" {...form.register("full_name")} />
          </Field>
          <Field label="Email" htmlFor="u_email" error={form.formState.errors.email?.message}>
            <Input id="u_email" type="email" inputMode="email" {...form.register("email")} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Initial password" htmlFor="u_password" error={form.formState.errors.password?.message}>
              <Input id="u_password" type="text" autoComplete="off" {...form.register("password")} />
            </Field>
            <Field label="Role" htmlFor="u_role" error={form.formState.errors.role?.message}>
              <Select
                value={form.watch("role")}
                onValueChange={(value) => form.setValue("role", value as NewUserValues["role"], { shouldValidate: true })}
              >
                <SelectTrigger id="u_role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Educator</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="admin">Director</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditProfileDialog({ profile, trigger }: { profile: Profile; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  const form = useForm<StaffProfileValues>({
    resolver: zodResolver(staffProfileSchema),
    defaultValues: {
      full_name: profile.full_name,
      phone: profile.phone ?? "",
      role: profile.role,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: values.full_name, phone: values.phone || null, role: values.role })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toastError("Couldn't update profile", error);
      return;
    }
    toast.success("Profile updated");
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {profile.full_name || "profile"}</DialogTitle>
          <DialogDescription>Change their display name, phone, or role.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Full name" htmlFor="e_name" error={form.formState.errors.full_name?.message}>
            <Input id="e_name" {...form.register("full_name")} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Phone" htmlFor="e_phone" error={form.formState.errors.phone?.message}>
              <Input id="e_phone" type="tel" inputMode="tel" {...form.register("phone")} />
            </Field>
            <Field label="Role" htmlFor="e_role" error={form.formState.errors.role?.message}>
              <Select
                value={form.watch("role")}
                onValueChange={(value) => form.setValue("role", value as StaffProfileValues["role"], { shouldValidate: true })}
              >
                <SelectTrigger id="e_role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Educator</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="admin">Director</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
