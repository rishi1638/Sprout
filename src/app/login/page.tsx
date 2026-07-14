"use client";

import { Suspense, startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Sprout, Delete, KeyRound } from "lucide-react";
import { loginSchema, type LoginValues } from "@/lib/validations";
import { loginWithEmailAction, loginWithPinAction, type LoginActionState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field } from "@/components/shared/form-field";

const INITIAL_STATE: LoginActionState = { ok: false };

function LoginForm() {
  const searchParams = useSearchParams();
  const [emailState, formEmailAction, isEmailPending] = useActionState(loginWithEmailAction, INITIAL_STATE);
  const [pinState, formPinAction, isPinPending] = useActionState(loginWithPinAction, INITIAL_STATE);
  const [pin, setPin] = useState("");
  const [activeTab, setActiveTab] = useState("email");
  const lastMessageRef = useRef<string | null>(null);

  const demoEmail = "admin@sproutdaycare.test";
  const demoPassword = "Sprout123!";

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: demoEmail, password: demoPassword },
  });

  const keyPad = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 0], []);

  const onEmailSubmit = form.handleSubmit(() => {
    const formData = new FormData();
    formData.set("email", form.getValues("email"));
    formData.set("password", form.getValues("password"));
    formData.set("next", searchParams.get("next") ?? "");
    startTransition(() => {
      formEmailAction(formData);
    });
  });

  const onPinSubmit = () => {
    const formData = new FormData();
    formData.set("pin", pin);
    formData.set("next", searchParams.get("next") ?? "");
    startTransition(() => {
      formPinAction(formData);
    });
  };

  const handlePinInput = (value: string) => {
    setPin((current) => (current.length < 6 ? `${current}${value}` : current));
  };

  const handleClear = () => setPin("");
  const handleBackspace = () => setPin((current) => current.slice(0, -1));

  const stateMessage = emailState?.message || pinState?.message;
  useEffect(() => {
    if (!stateMessage || stateMessage === lastMessageRef.current) return;
    lastMessageRef.current = stateMessage;
    toast.error(stateMessage.includes("Incorrect") || stateMessage.includes("Invalid") ? stateMessage : "Unable to sign in", {
      description: stateMessage,
    });
  }, [stateMessage]);

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sprout className="size-7" />
        </div>
        <CardTitle className="text-2xl">Welcome to Sprout</CardTitle>
        <CardDescription>Choose how you&apos;d like to sign in for daily care, attendance, and family updates.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Staff & Parents</TabsTrigger>
            <TabsTrigger value="pin">Quick PIN</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4 space-y-4">
            <form onSubmit={onEmailSubmit} className="space-y-4" noValidate>
              <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message || emailState.fieldErrors?.email}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  defaultValue={demoEmail}
                  {...form.register("email")}
                />
              </Field>
              <Field label="Password" htmlFor="password" error={form.formState.errors.password?.message || emailState.fieldErrors?.password}>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  defaultValue={demoPassword}
                  {...form.register("password")}
                />
              </Field>
              <input type="hidden" name="next" value={searchParams.get("next") ?? ""} />
              <Button type="submit" className="w-full" size="lg" disabled={isEmailPending}>
                {isEmailPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="pin" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <KeyRound className="size-4" /> Educator fast login
              </div>
              <div className="flex justify-center gap-2 rounded-lg bg-background p-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <span key={index} className={`size-3 rounded-full ${pin.length > index ? "bg-foreground" : "bg-muted-foreground/30"}`} />
                ))}
              </div>
            </div>

            <form onSubmit={(event) => {
              event.preventDefault();
              onPinSubmit();
            }} className="space-y-4">
              <input type="hidden" name="next" value={searchParams.get("next") ?? ""} />
              <div className="grid grid-cols-3 gap-3">
              {keyPad.map((digit) => (
                <Button key={digit} type="button" variant="outline" className="h-14 text-xl" onClick={() => handlePinInput(String(digit))}>
                  {digit}
                </Button>
              ))}
              <Button type="button" variant="outline" className="h-14" onClick={handleBackspace}>
                <Delete className="size-5" />
              </Button>
              <Button type="button" variant="outline" className="h-14 text-xl" onClick={() => handlePinInput("0")}>
                0
              </Button>
                <Button type="submit" className="h-14" disabled={isPinPending || pin.length < 4}>
                  {isPinPending ? "Checking…" : "Submit"}
                </Button>
              </div>
              {pinState.fieldErrors?.pin ? <p className="text-sm text-destructive">{pinState.fieldErrors.pin}</p> : null}
              <Button type="button" variant="ghost" className="w-full" onClick={handleClear}>
                Clear PIN
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
