"use client";

import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createChildAndInviteParent,
  inviteInstructor,
  type ActionResult,
} from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t } from "@/lib/i18n";

const instructorSchema = z.object({
  email: z.string().trim().email(t("invalidEmail")),
  classroom_id: z.string().optional(),
});

const childInviteSchema = z.object({
  first_name: z.string().trim().min(1, t("required")),
  last_name: z.string().trim().min(1, t("required")),
  dob: z.string().min(1, t("required")),
  classroom_id: z.string().uuid(t("required")),
  parent_email: z.string().trim().email(t("invalidEmail")),
});

type InstructorValues = z.infer<typeof instructorSchema>;
type ChildInviteValues = z.infer<typeof childInviteSchema>;

const emptyInstructor: ActionResult<{ inviteUrl: string }> = { ok: false };
const emptyChild: ActionResult<{ inviteUrl?: string; childId: string }> = { ok: false };

export function OnboardingForms({
  classrooms,
}: {
  classrooms: { id: string; name: string }[];
}) {
  const [instructorState, instructorAction, instructorPending] = useActionState(
    inviteInstructor,
    emptyInstructor
  );
  const [childState, childAction, childPending] = useActionState(createChildAndInviteParent, emptyChild);

  const instructorForm = useForm<InstructorValues>({
    resolver: zodResolver(instructorSchema),
    mode: "onChange",
    defaultValues: { email: "", classroom_id: "" },
  });

  const childForm = useForm<ChildInviteValues>({
    resolver: zodResolver(childInviteSchema),
    mode: "onChange",
    defaultValues: {
      first_name: "",
      last_name: "",
      dob: "",
      classroom_id: "",
      parent_email: "",
    },
  });

  useEffect(() => {
    if (instructorState.ok && instructorState.data?.inviteUrl) {
      void navigator.clipboard.writeText(instructorState.data.inviteUrl);
      toast.success(t("invitationLinkCopied"), { description: instructorState.data.inviteUrl });
      instructorForm.reset();
    } else if (instructorState.message && !instructorState.ok) {
      toast.error(instructorState.message);
    }
  }, [instructorForm, instructorState]);

  useEffect(() => {
    if (childState.ok) {
      if (childState.data?.inviteUrl) {
        void navigator.clipboard.writeText(childState.data.inviteUrl);
        toast.success(t("invitationLinkCopied"), { description: childState.data.inviteUrl });
      } else {
        toast.success(childState.message ?? t("parentLinked"));
      }
      childForm.reset();
    } else if (childState.message && !childState.ok) {
      toast.error(childState.message);
    }
  }, [childForm, childState]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("inviteInstructorTitle")}</CardTitle>
          <CardDescription>{t("roleEce")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={instructorAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ece-email">{t("email")}</Label>
              <Input id="ece-email" type="email" {...instructorForm.register("email")} disabled={instructorPending} />
              {instructorForm.formState.errors.email && (
                <p className="text-sm text-destructive">{instructorForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("classroom")}</Label>
              <input type="hidden" name="classroom_id" value={instructorForm.watch("classroom_id") ?? ""} />
              <Select
                value={instructorForm.watch("classroom_id") || undefined}
                onValueChange={(value) => instructorForm.setValue("classroom_id", value, { shouldValidate: true })}
                disabled={instructorPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("classroom")} />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={instructorPending || !instructorForm.formState.isValid}>
              {instructorPending ? <Loader2 className="animate-spin" /> : null}
              {t("inviteInstructorCta")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("inviteParentTitle")}</CardTitle>
          <CardDescription>{t("roleParent")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={childAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">{t("firstName")}</Label>
                <Input id="first_name" {...childForm.register("first_name")} disabled={childPending} />
                {childForm.formState.errors.first_name && (
                  <p className="text-sm text-destructive">{childForm.formState.errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">{t("lastName")}</Label>
                <Input id="last_name" {...childForm.register("last_name")} disabled={childPending} />
                {childForm.formState.errors.last_name && (
                  <p className="text-sm text-destructive">{childForm.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">{t("dob")}</Label>
              <Input id="dob" type="date" {...childForm.register("dob")} disabled={childPending} />
              {childForm.formState.errors.dob && (
                <p className="text-sm text-destructive">{childForm.formState.errors.dob.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("classroom")}</Label>
              <input type="hidden" name="classroom_id" value={childForm.watch("classroom_id")} />
              <Select
                value={childForm.watch("classroom_id") || undefined}
                onValueChange={(value) => childForm.setValue("classroom_id", value, { shouldValidate: true })}
                disabled={childPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("classroom")} />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {childForm.formState.errors.classroom_id && (
                <p className="text-sm text-destructive">{childForm.formState.errors.classroom_id.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent_email">{t("parentEmail")}</Label>
              <Input id="parent_email" type="email" {...childForm.register("parent_email")} disabled={childPending} />
              {childForm.formState.errors.parent_email && (
                <p className="text-sm text-destructive">{childForm.formState.errors.parent_email.message}</p>
              )}
            </div>
            <Button type="submit" disabled={childPending || !childForm.formState.isValid}>
              {childPending ? <Loader2 className="animate-spin" /> : null}
              {t("inviteParentCta")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
