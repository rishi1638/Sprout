"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  acceptInvitationAndRegister,
  resolveInvitationToken,
  type ActionResult,
  type InvitationPreview,
} from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";

const registerFormSchema = z
  .object({
    full_name: z.string().trim().min(1, t("required")),
    password: z.string().min(8, t("passwordMin")),
    confirm_password: z.string().min(8, t("passwordMin")),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: t("passwordMismatch"),
    path: ["confirm_password"],
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

const initialState: ActionResult = { ok: false };

function WaitingEmptyState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#e8f5e9,_#f7faf7_45%,_#eef2ee)] px-4">
      <Card className="w-full max-w-lg border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl text-primary">Sprout</CardTitle>
          <CardDescription className="text-base text-foreground">{t("waitingInvitation")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("waitingInvitationHint")}</p>
          <Button asChild variant="outline">
            <Link href="/login">{t("backToLogin")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

function RegisterWithToken({ token, invite }: { token: string; invite: InvitationPreview }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(acceptInvitationAndRegister, initialState);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    mode: "onChange",
    defaultValues: { full_name: "", password: "", confirm_password: "" },
  });

  useEffect(() => {
    if (!state.ok) return;
    const home =
      invite.role === "admin"
        ? "/dashboard/admin"
        : invite.role === "ece"
          ? "/dashboard/ece"
          : "/dashboard/parent";
    router.replace(home);
  }, [invite.role, router, state.ok]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#e8f5e9,_#f7faf7_45%,_#eef2ee)] px-4">
      <Card className="w-full max-w-lg border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{t("registerTitle")}</CardTitle>
          <CardDescription>{t("registerSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" value={invite.email} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">{t("fullName")}</Label>
              <Input id="full_name" {...form.register("full_name")} disabled={pending} />
              {(form.formState.errors.full_name?.message || state.fieldErrors?.full_name) && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.full_name?.message ?? state.fieldErrors?.full_name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input id="password" type="password" {...form.register("password")} disabled={pending} />
              {(form.formState.errors.password?.message || state.fieldErrors?.password) && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password?.message ?? state.fieldErrors?.password}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">{t("confirmPassword")}</Label>
              <Input
                id="confirm_password"
                type="password"
                {...form.register("confirm_password")}
                disabled={pending}
              />
              {(form.formState.errors.confirm_password?.message || state.fieldErrors?.confirm_password) && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.confirm_password?.message ?? state.fieldErrors?.confirm_password}
                </p>
              )}
            </div>
            {state.message && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
            <Button type="submit" className="w-full" disabled={pending || !form.formState.isValid}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  {t("registering")}
                </>
              ) : (
                t("submitRegister")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function RegisterClient() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [invite, setInvite] = useState<InvitationPreview | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(Boolean(token));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    startTransition(async () => {
      const result = await resolveInvitationToken(token);
      if (!result.ok || !result.data) {
        setInvalid(true);
        setInvite(null);
      } else {
        setInvite(result.data);
        setInvalid(false);
      }
      setLoading(false);
    });
  }, [token]);

  if (!token) return <WaitingEmptyState />;

  if (loading || isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </main>
    );
  }

  if (invalid || !invite) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{t("inviteInvalid")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/login">{t("backToLogin")}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <RegisterWithToken token={token} invite={invite} />;
}
