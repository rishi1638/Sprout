"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Sprout, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface AppShellProps {
  items: NavItem[];
  userName: string;
  roleLabel: string;
  children: React.ReactNode;
}

export function AppShell({ items, userName, roleLabel, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Sign-out failed", { description: error.message });
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  function isActive(href: string): boolean {
    const root = items[0]?.href;
    if (href === root) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sprout className="size-5" />
          </div>
          <div>
            <p className="font-bold leading-tight">Sprout</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                isActive(item.href)
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-foreground">
            {initials(userName) || "?"}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{userName}</p>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sprout className="size-4" />
            </div>
            <span className="font-bold">Sprout</span>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 pb-24 md:p-8 md:pb-8">
          {children}
        </main>

        {/* Mobile bottom tabs */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
          <div className="flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold",
                  isActive(item.href) ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
