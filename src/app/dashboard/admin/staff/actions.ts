"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  full_name: z.string().trim().min(1),
  role: z.enum(["admin", "ece", "parent"]),
});

export interface CreateUserResult {
  ok: boolean;
  message: string;
}

export async function createUserAction(input: unknown): Promise<CreateUserResult> {
  await requireRole("admin");

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Check the form: every field is required and the password needs 8+ characters." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      message: "SUPABASE_SERVICE_ROLE_KEY isn't configured on the server, so accounts must be created in the Supabase dashboard.",
    };
  }

  const admin = createAdminClient();
  const { email, password, full_name, role } = parsed.data;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  // The handle_new_user trigger creates the profile; make sure role/name match
  // even if the trigger defaults were used.
  if (data.user) {
    await admin.from("profiles").update({ full_name, role }).eq("id", data.user.id);
  }

  revalidatePath("/dashboard/admin/staff");
  return { ok: true, message: `Account created for ${full_name}.` };
}
