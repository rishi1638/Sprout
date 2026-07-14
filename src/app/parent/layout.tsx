import { ParentShell } from "@/components/shared/role-shells";
import { requireRole } from "@/lib/auth";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("parent");
  return <ParentShell userName={profile.full_name || "Parent"}>{children}</ParentShell>;
}
