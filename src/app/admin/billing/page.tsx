import { format } from "date-fns";
import { CreditCard, Pencil, Plus, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import type { BillingPlan, InvoiceWithRelations } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  AssignPlanDialog,
  GenerateInvoicesButton,
  InvoiceStatusButton,
  PlanFormDialog,
} from "@/components/forms/billing-dialogs";

export const dynamic = "force-dynamic";

interface ChildPlanRow {
  child_id: string;
  plan_id: string;
  children: { id: string; first_name: string; last_name: string } | null;
  billing_plans: { id: string; name: string } | null;
}

const INVOICE_VARIANTS = {
  paid: "default",
  unpaid: "accent",
  void: "muted",
} as const;

export default async function AdminBillingPage() {
  const supabase = await createClient();

  const [plansRes, childPlansRes, childrenRes, invoicesRes] = await Promise.all([
    supabase.from("billing_plans").select("*").order("name"),
    supabase.from("child_plans").select("child_id, plan_id, children(id, first_name, last_name), billing_plans(id, name)"),
    supabase.from("children").select("id, first_name, last_name").eq("enrollment_status", "enrolled").order("last_name"),
    supabase
      .from("invoices")
      .select("*, children(id, first_name, last_name), profiles(id, full_name)")
      .order("issued_at", { ascending: false })
      .limit(100),
  ]);

  const plans: BillingPlan[] = plansRes.data ?? [];
  const activePlans = plans.filter((plan) => plan.active);
  const childPlans = (childPlansRes.data ?? []) as unknown as ChildPlanRow[];
  const childrenOptions = childrenRes.data ?? [];
  const invoices = (invoicesRes.data ?? []) as unknown as InvoiceWithRelations[];

  return (
    <>
      <PageHeader
        title="Billing"
        description="Tuition plans, assignments, and monthly invoices."
        action={<GenerateInvoicesButton />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Tuition plans</CardTitle>
            <PlanFormDialog
              trigger={
                <Button variant="secondary" size="sm">
                  <Plus /> New plan
                </Button>
              }
            />
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No plans yet. Create one to start billing.</p>
            ) : (
              <ul className="space-y-2">
                {plans.map((plan) => (
                  <li key={plan.id} className="flex items-center gap-2 rounded-md border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{plan.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCents(plan.amount_cents)} / {plan.interval === "weekly" ? "week" : "month"}
                        {plan.description ? ` · ${plan.description}` : ""}
                      </p>
                    </div>
                    {!plan.active ? <Badge variant="muted">Inactive</Badge> : null}
                    <PlanFormDialog
                      plan={plan}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Edit ${plan.name}`}>
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Plan assignments</CardTitle>
            <AssignPlanDialog
              plans={activePlans}
              children_options={childrenOptions}
              trigger={
                <Button variant="secondary" size="sm">
                  <Plus /> Assign
                </Button>
              }
            />
          </CardHeader>
          <CardContent>
            {childPlans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No plans assigned. Assign a plan to a child, then generate invoices.
              </p>
            ) : (
              <ul className="space-y-2">
                {childPlans.map((row) => (
                  <li
                    key={`${row.child_id}-${row.plan_id}`}
                    className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                  >
                    <span className="font-semibold">
                      {row.children ? `${row.children.first_name} ${row.children.last_name}` : "Unknown child"}
                    </span>
                    <Badge>{row.billing_plans?.name ?? "Plan"}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Receipt className="size-5 text-primary" /> Invoices
        </h2>
        {invoices.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No invoices yet"
            description="Assign plans to children, then generate this month's invoices with one tap."
          />
        ) : (
          <ul className="space-y-2">
            {invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {invoice.children
                      ? `${invoice.children.first_name} ${invoice.children.last_name}`
                      : "Unknown child"}{" "}
                    · {formatCents(invoice.amount_cents)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(invoice.period_start), "MMM yyyy")} · billed to{" "}
                    {invoice.profiles?.full_name ?? "guardian"}
                  </p>
                </div>
                <Badge variant={INVOICE_VARIANTS[invoice.status]}>{invoice.status}</Badge>
                {invoice.status !== "void" ? <InvoiceStatusButton invoice={invoice} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
