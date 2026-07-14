import { StaffShell } from "@/components/shared/role-shells";
import { requireRole } from "@/lib/auth";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("ece");
  return <StaffShell userName={profile.full_name || "Educator"}>{children}</StaffShell>;
}
