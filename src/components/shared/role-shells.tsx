"use client";

import {
  Baby,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  Home,
  LayoutDashboard,
  Megaphone,
  Receipt,
  School,
  UserPlus,
  UserRound,
  Users,
  CalendarDays,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/shared/app-shell";

const ADMIN_ITEMS: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/children", label: "Children", icon: Baby },
  { href: "/dashboard/admin/classrooms", label: "Classrooms", icon: School },
  { href: "/dashboard/admin/staff", label: "People", icon: Users },
  { href: "/dashboard/admin/onboarding", label: "Invitations", icon: UserPlus },
  { href: "/dashboard/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/dashboard/admin/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/admin/permission-forms", label: "Forms", icon: ClipboardCheck },
  { href: "/dashboard/admin/billing", label: "Billing", icon: Receipt },
];

const ECE_ITEMS: NavItem[] = [
  { href: "/dashboard/ece", label: "My rooms", icon: Home },
  { href: "/dashboard/ece/log", label: "Log", icon: ClipboardList },
  { href: "/dashboard/ece/attendance", label: "Attendance", icon: CalendarCheck },
];

const PARENT_ITEMS: NavItem[] = [
  { href: "/dashboard/parent", label: "Feed", icon: Home },
  { href: "/dashboard/parent/announcements", label: "Announcements", icon: Megaphone },
  { href: "/dashboard/parent/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/parent/permission-forms", label: "Forms", icon: ClipboardCheck },
  { href: "/dashboard/parent/children", label: "My children", icon: UserRound },
  { href: "/dashboard/parent/billing", label: "Billing", icon: Receipt },
];

export function AdminShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  return (
    <AppShell items={ADMIN_ITEMS} userName={userName} roleLabel="Direction">
      {children}
    </AppShell>
  );
}

export function StaffShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  return (
    <AppShell items={ECE_ITEMS} userName={userName} roleLabel="Éducateur">
      {children}
    </AppShell>
  );
}

export function ParentShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  return (
    <AppShell items={PARENT_ITEMS} userName={userName} roleLabel="Parent">
      {children}
    </AppShell>
  );
}
