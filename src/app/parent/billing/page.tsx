import { format } from "date-fns";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { formatCents } from "@/lib/utils";
import type { InvoiceWithRelations } from "@/types";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const dynamic = "force-dynamic";

const INVOICE_VARIANTS = {
  paid: "default",
  unpaid: "accent",
  void: "muted",
} as const;

export default async function ParentBillingPage() {
  const profile = await requireRole("parent");
  const supabase = await createClient();

  const { data } = await supabase
    .from("invoices")
    .select("*, children(id, first_name, last_name), profiles(id, full_name)")
    .eq("parent_id", profile.id)
    .order("issued_at", { ascending: false });

  const invoices = (data ?? []) as unknown as InvoiceWithRelations[];
  const outstanding = invoices
    .filter((invoice) => invoice.status === "unpaid")
    .reduce((sum, invoice) => sum + invoice.amount_cents, 0);

  return (
    <>
      <PageHeader
        title="Billing"
        description={
          outstanding > 0
            ? `You have ${formatCents(outstanding)} outstanding. Payment is handled directly with your daycare.`
            : "You're all paid up."
        }
      />
      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Your monthly tuition invoices will appear here once issued."
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
                  {format(new Date(invoice.period_start), "MMMM yyyy")} ·{" "}
                  {invoice.children
                    ? `${invoice.children.first_name} ${invoice.children.last_name}`
                    : "Tuition"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Issued {format(new Date(invoice.issued_at), "MMM d, yyyy")}
                  {invoice.paid_at ? ` · Paid ${format(new Date(invoice.paid_at), "MMM d, yyyy")}` : ""}
                </p>
              </div>
              <p className="font-bold">{formatCents(invoice.amount_cents)}</p>
              <Badge variant={INVOICE_VARIANTS[invoice.status]}>{invoice.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
