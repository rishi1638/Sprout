import { AdminShell } from "@/components/shared/role-shells";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin");
  return <AdminShell userName={profile.full_name || "Director"}>{children}</AdminShell>;
}
