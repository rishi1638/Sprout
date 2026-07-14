import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/database.types";
import type { Profile } from "@/types";

/**
 * Server-side guard: returns the signed-in profile, redirecting to /login
 * (or the user's own dashboard) when the role doesn't match.
 * Middleware enforces this too; this is defense in depth for direct renders.
 */
export async function requireRole(role: UserRole): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) redirect("/login");
  if (profile.role !== role) {
    redirect(profile.role === "admin" ? "/admin" : profile.role === "staff" ? "/staff" : "/parent");
  }
  return profile;
}
