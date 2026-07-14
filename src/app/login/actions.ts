"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations";

export interface LoginActionState {
  ok: boolean;
  message?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    pin?: string;
  };
}

const initialState: LoginActionState = { ok: false };
const FALLBACK_DEMO_EMAIL = "admin@sproutdaycare.test";
const FALLBACK_DEMO_PASSWORD = "Sprout123!";
const FALLBACK_DEMO_PIN = "123456";

function getDemoCredentials() {
  return {
    email: process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? FALLBACK_DEMO_EMAIL,
    password: process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? FALLBACK_DEMO_PASSWORD,
    pin: process.env.NEXT_PUBLIC_DEMO_ADMIN_PIN ?? FALLBACK_DEMO_PIN,
  };
}

function getHomeForRole(role?: string) {
  if (role === "admin") return "/dashboard/admin";
  if (role === "ece") return "/dashboard/ece";
  return "/dashboard/parent";
}

async function ensureDemoAdminAccount() {
  const demo = getDemoCredentials();
  const email = demo.email;
  const password = demo.password;

  const admin = createAdminClient();
  const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
  const existingUser = usersData?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase());

  if (!listError && existingUser) {
    await admin.from("profiles").upsert({
      id: existingUser.id,
      full_name: "Demo Admin",
      role: "admin",
      quick_pin: demo.pin,
    });
    return { email, password };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Demo Admin", role: "admin" },
  });

  if (error || !data.user) return null;

  await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: "Demo Admin",
    role: "admin",
    quick_pin: demo.pin,
  });

  return { email, password };
}

export async function loginWithEmailAction(_prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: {
        email: parsed.error.flatten().fieldErrors.email?.[0],
        password: parsed.error.flatten().fieldErrors.password?.[0],
      },
      message: "Please enter a valid email and a password with at least 8 characters.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const demoCredentials = await ensureDemoAdminAccount();
    if (demoCredentials && email.toLowerCase() === demoCredentials.email.toLowerCase() && password === demoCredentials.password) {
      const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
        email: demoCredentials.email,
        password: demoCredentials.password,
      });
      if (!retryError && retryData.user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", retryData.user.id).single();
        redirect(getHomeForRole(profile?.role));
      }
    }

    return {
      ok: false,
      message: error.message === "Invalid login credentials" ? "Invalid credentials. Try again or use the demo admin option." : error.message,
    };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  redirect(getHomeForRole(profile?.role));
}

export async function loginWithPinAction(_prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const pin = String(formData.get("pin") ?? "").trim();
  const pinSchema = z.string().regex(/^\d{4,6}$/, "Enter a 4–6 digit PIN.");
  const parsed = pinSchema.safeParse(pin);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: { pin: parsed.error.issues[0]?.message },
      message: "Enter a 4–6 digit PIN.",
    };
  }

  const supabase = await createClient();
  const demoCredentials = await ensureDemoAdminAccount();
  const demoPin = getDemoCredentials().pin;

  if (pin === demoPin && demoCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: demoCredentials.email,
      password: demoCredentials.password,
    });
    if (!error && data.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      redirect(getHomeForRole(profile?.role));
    }
  }

  let profileResult;
  try {
    profileResult = await supabase.from("profiles").select("id, role, quick_pin").eq("quick_pin", pin).maybeSingle();
  } catch {
    profileResult = null;
  }

  const profile = profileResult?.data;
  if (profile?.id) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? "",
      password: process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? "",
    });

    if (!error && data.user) {
      const { data: profileData } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      redirect(getHomeForRole(profileData?.role));
    }
  }

  return {
    ok: false,
    message: "Incorrect PIN code entered.",
  };
}

