"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";
import type { UserRole } from "@/lib/database.types";

export type ActionResult<T = undefined> = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
};

function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

function invitationUrl(token: string) {
  return `${siteOrigin()}/register?token=${encodeURIComponent(token)}`;
}

function secureToken() {
  return randomBytes(24).toString("base64url");
}

async function resolveCenterId(adminId: string) {
  const admin = createAdminClient();
  const { data: owned } = await admin.from("centers").select("id").eq("admin_id", adminId).limit(1).maybeSingle();
  if (owned?.id) return owned.id;

  const { data: anyCenter } = await admin.from("centers").select("id").limit(1).maybeSingle();
  if (anyCenter?.id) {
    await admin.from("centers").update({ admin_id: adminId }).eq("id", anyCenter.id);
    return anyCenter.id;
  }

  const { data: created, error } = await admin
    .from("centers")
    .insert({ name: "Sprout Daycare", admin_id: adminId })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}

const inviteInstructorSchema = z.object({
  email: z.string().trim().email(t("invalidEmail")),
  classroom_id: z.string().uuid().optional().or(z.literal("")),
});

export async function inviteInstructor(
  _prev: ActionResult<{ inviteUrl: string }>,
  formData: FormData
): Promise<ActionResult<{ inviteUrl: string }>> {
  const profile = await requireRole("admin");

  const parsed = inviteInstructorSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    classroom_id: String(formData.get("classroom_id") ?? ""),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] = issue.message;
    }
    return { ok: false, message: t("required"), fieldErrors };
  }

  const centerId = await resolveCenterId(profile.id);
  if (!centerId) return { ok: false, message: t("centerRequired") };

  const token = secureToken();
  const classroomId = parsed.data.classroom_id || null;
  const admin = createAdminClient();

  const { error } = await admin.from("invitations").insert({
    email: parsed.data.email.toLowerCase(),
    token,
    role: "ece",
    center_id: centerId,
    classroom_id: classroomId,
    status: "pending",
    invited_by: profile.id,
  });

  if (error) return { ok: false, message: error.message };

  const inviteUrl = invitationUrl(token);
  return { ok: true, message: t("invitationCreated"), data: { inviteUrl } };
}

const createChildInviteSchema = z.object({
  first_name: z.string().trim().min(1, t("required")),
  last_name: z.string().trim().min(1, t("required")),
  dob: z
    .string()
    .min(1, t("required"))
    .refine((value) => !Number.isNaN(Date.parse(value)), t("required")),
  classroom_id: z.string().uuid(t("required")),
  parent_email: z.string().trim().email(t("invalidEmail")),
});

export async function createChildAndInviteParent(
  _prev: ActionResult<{ inviteUrl?: string; childId: string }>,
  formData: FormData
): Promise<ActionResult<{ inviteUrl?: string; childId: string }>> {
  const profile = await requireRole("admin");

  const parsed = createChildInviteSchema.safeParse({
    first_name: String(formData.get("first_name") ?? ""),
    last_name: String(formData.get("last_name") ?? ""),
    dob: String(formData.get("dob") ?? ""),
    classroom_id: String(formData.get("classroom_id") ?? ""),
    parent_email: String(formData.get("parent_email") ?? ""),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] = issue.message;
    }
    return { ok: false, message: t("required"), fieldErrors };
  }

  const centerId = await resolveCenterId(profile.id);
  if (!centerId) return { ok: false, message: t("centerRequired") };

  const admin = createAdminClient();
  const email = parsed.data.parent_email.toLowerCase();

  const { data: child, error: childError } = await admin
    .from("children")
    .insert({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      dob: parsed.data.dob,
      classroom_id: parsed.data.classroom_id,
      enrollment_status: "enrolled",
    })
    .select("id")
    .single();

  if (childError || !child) return { ok: false, message: childError?.message ?? t("required") };

  await admin.from("enrollments").insert({
    child_id: child.id,
    classroom_id: parsed.data.classroom_id,
  });

  const { data: existingParent } = await admin
    .from("profiles")
    .select("id, role")
    .eq("role", "parent")
    .limit(500);

  const authUsers = await admin.auth.admin.listUsers({ perPage: 1000 });
  const matchedUser = authUsers.data?.users?.find((user) => user.email?.toLowerCase() === email);

  if (matchedUser) {
    const parentProfile = existingParent?.find((row) => row.id === matchedUser.id) ?? null;
    if (parentProfile || matchedUser) {
      await admin.from("profiles").upsert({
        id: matchedUser.id,
        full_name: matchedUser.user_metadata?.full_name ?? email,
        role: "parent",
      });
      await admin.from("parent_child_relationships").upsert(
        {
          parent_id: matchedUser.id,
          child_id: child.id,
        },
        { onConflict: "parent_id,child_id" }
      );
      return {
        ok: true,
        message: t("parentLinked"),
        data: { childId: child.id },
      };
    }
  }

  const token = secureToken();
  const { error: inviteError } = await admin.from("invitations").insert({
    email,
    token,
    role: "parent",
    center_id: centerId,
    classroom_id: parsed.data.classroom_id,
    child_id: child.id,
    status: "pending",
    invited_by: profile.id,
  });

  if (inviteError) return { ok: false, message: inviteError.message };

  return {
    ok: true,
    message: t("invitationCreated"),
    data: { inviteUrl: invitationUrl(token), childId: child.id },
  };
}

export type InvitationPreview = {
  email: string;
  role: UserRole;
  classroom_id: string | null;
  child_id: string | null;
  center_id: string;
};

export async function resolveInvitationToken(token: string): Promise<ActionResult<InvitationPreview>> {
  if (!token.trim()) return { ok: false, message: t("inviteInvalid") };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_invitation_by_token", { lookup_token: token.trim() });

  if (error || !data) {
    const { data: row } = await admin
      .from("invitations")
      .select("email, role, classroom_id, child_id, center_id, status, expires_at")
      .eq("token", token.trim())
      .maybeSingle();

    if (!row || row.status !== "pending" || new Date(row.expires_at) <= new Date()) {
      return { ok: false, message: t("inviteInvalid") };
    }

    return {
      ok: true,
      data: {
        email: row.email,
        role: row.role,
        classroom_id: row.classroom_id,
        child_id: row.child_id,
        center_id: row.center_id,
      },
    };
  }

  const invite = data as {
    email: string;
    role: UserRole;
    classroom_id: string | null;
    child_id: string | null;
    center_id: string;
    status: string;
  };

  if (!invite.email) return { ok: false, message: t("inviteInvalid") };

  return {
    ok: true,
    data: {
      email: invite.email,
      role: invite.role,
      classroom_id: invite.classroom_id,
      child_id: invite.child_id,
      center_id: invite.center_id,
    },
  };
}

const registerSchema = z
  .object({
    token: z.string().min(1),
    full_name: z.string().trim().min(1, t("required")),
    password: z.string().min(8, t("passwordMin")),
    confirm_password: z.string().min(8, t("passwordMin")),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: t("passwordMismatch"),
    path: ["confirm_password"],
  });

export async function acceptInvitationAndRegister(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    token: String(formData.get("token") ?? ""),
    full_name: String(formData.get("full_name") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirm_password: String(formData.get("confirm_password") ?? ""),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] = issue.message;
    }
    return { ok: false, message: t("required"), fieldErrors };
  }

  const resolved = await resolveInvitationToken(parsed.data.token);
  if (!resolved.ok || !resolved.data) return { ok: false, message: t("inviteInvalid") };

  const invite = resolved.data;
  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name, role: invite.role },
  });

  if (createError || !created.user) {
    return { ok: false, message: createError?.message ?? t("inviteInvalid") };
  }

  await admin.from("profiles").upsert({
    id: created.user.id,
    full_name: parsed.data.full_name,
    role: invite.role,
  });

  if (invite.role === "ece" && invite.classroom_id) {
    await admin.from("classrooms").update({ instructor_id: created.user.id }).eq("id", invite.classroom_id);
    await admin.from("staff_assignments").upsert(
      {
        classroom_id: invite.classroom_id,
        staff_id: created.user.id,
      },
      { onConflict: "classroom_id,staff_id" }
    );
  }

  if (invite.role === "parent" && invite.child_id) {
    await admin.from("parent_child_relationships").upsert(
      {
        parent_id: created.user.id,
        child_id: invite.child_id,
      },
      { onConflict: "parent_id,child_id" }
    );
  }

  await admin
    .from("invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("token", parsed.data.token);

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password: parsed.data.password,
  });

  if (signInError) return { ok: false, message: signInError.message };

  return { ok: true, message: t("inviteAccepted") };
}
