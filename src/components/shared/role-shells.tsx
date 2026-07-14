"use client";

import {
  Baby,
  CalendarCheck,
  ClipboardList,
  Home,
  LayoutDashboard,
  Receipt,
  School,
  UserRound,
  Users,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/shared/app-shell";

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/children", label: "Children", icon: Baby },
  { href: "/admin/classrooms", label: "Classrooms", icon: School },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/billing", label: "Billing", icon: Receipt },
];

const STAFF_ITEMS: NavItem[] = [
  { href: "/staff", label: "My rooms", icon: Home },
  { href: "/staff/log", label: "Log", icon: ClipboardList },
  { href: "/staff/attendance", label: "Attendance", icon: CalendarCheck },
];

const PARENT_ITEMS: NavItem[] = [
  { href: "/parent", label: "Feed", icon: Home },
  { href: "/parent/children", label: "My children", icon: UserRound },
  { href: "/parent/billing", label: "Billing", icon: Receipt },
];

export function AdminShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  return (
    <AppShell items={ADMIN_ITEMS} userName={userName} roleLabel="Director">
      {children}
    </AppShell>
  );
}

export function StaffShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  return (
    <AppShell items={STAFF_ITEMS} userName={userName} roleLabel="Educator">
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
