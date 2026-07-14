import { Baby, Receipt, School, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import type { ClassroomRatio } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { RatioCard } from "@/components/shared/ratio-card";
import { EmptyState } from "@/components/shared/empty-state";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [childrenRes, staffRes, ratiosRes, unpaidRes] = await Promise.all([
    supabase.from("children").select("id", { count: "exact", head: true }).eq("enrollment_status", "enrolled"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "ece"),
    supabase.from("classroom_ratios").select("*").order("name"),
    supabase.from("invoices").select("amount_cents").eq("status", "unpaid"),
  ]);

  const ratios: ClassroomRatio[] = ratiosRes.data ?? [];
  const unpaidTotal = (unpaidRes.data ?? []).reduce((sum, invoice) => sum + invoice.amount_cents, 0);
  const presentNow = ratios.reduce((sum, ratio) => sum + ratio.children_present, 0);

  const stats = [
    { label: "Enrolled children", value: String(childrenRes.count ?? 0), icon: Baby },
    { label: "Checked in now", value: String(presentNow), icon: School },
    { label: "Educators", value: String(staffRes.count ?? 0), icon: Users },
    { label: "Outstanding invoices", value: formatCents(unpaidTotal), icon: Receipt },
  ];

  return (
    <>
      <PageHeader title="Overview" description="Today across the center, at a glance." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Live room ratios</h2>
        {ratios.length === 0 ? (
          <EmptyState
            icon={School}
            title="No classrooms yet"
            description="Create your first classroom to start tracking capacity and ratios."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ratios.map((ratio) => (
              <RatioCard key={ratio.classroom_id} ratio={ratio} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
