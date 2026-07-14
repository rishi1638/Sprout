"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToastError } from "@/hooks/use-toast-error";
import {
  billingPlanSchema,
  childPlanSchema,
  type BillingPlanValues,
  type ChildPlanValues,
} from "@/lib/validations";
import type { BillingPlan, Child, Invoice } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/shared/form-field";

export function PlanFormDialog({ plan, trigger }: { plan?: BillingPlan; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  const form = useForm<z.input<typeof billingPlanSchema>, unknown, BillingPlanValues>({
    resolver: zodResolver(billingPlanSchema),
    defaultValues: {
      name: plan?.name ?? "",
      amount_dollars: plan ? plan.amount_cents / 100 : 0,
      interval: plan?.interval ?? "monthly",
      description: plan?.description ?? "",
      active: plan?.active ?? true,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: values.name,
      amount_cents: Math.round(values.amount_dollars * 100),
      interval: values.interval,
      description: values.description || null,
      active: values.active,
    };
    const { error } = plan
      ? await supabase.from("billing_plans").update(payload).eq("id", plan.id)
      : await supabase.from("billing_plans").insert(payload);
    setSaving(false);
    if (error) {
      toastError(plan ? "Couldn't save plan" : "Couldn't create plan", error);
      return;
    }
    toast.success(plan ? "Plan updated" : "Plan created");
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? "Edit plan" : "Create tuition plan"}</DialogTitle>
          <DialogDescription>Weekly plans are billed as four weeks per monthly invoice.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Plan name" htmlFor="p_name" error={form.formState.errors.name?.message}>
            <Input id="p_name" placeholder="Weekly Full-Time" {...form.register("name")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount ($)" htmlFor="p_amount" error={form.formState.errors.amount_dollars?.message}>
              <Input id="p_amount" type="number" min={0} step="0.01" inputMode="decimal" {...form.register("amount_dollars")} />
            </Field>
            <Field label="Billing interval" htmlFor="p_interval" error={form.formState.errors.interval?.message}>
              <Select
                value={form.watch("interval")}
                onValueChange={(value) =>
                  form.setValue("interval", value as BillingPlanValues["interval"], { shouldValidate: true })
                }
              >
                <SelectTrigger id="p_interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Description" htmlFor="p_description" error={form.formState.errors.description?.message}>
            <Textarea id="p_description" placeholder="Five full days per week" {...form.register("description")} />
          </Field>
          <div className="flex items-center justify-between">
            <label htmlFor="p_active" className="text-sm font-semibold">
              Active (available for new assignments)
            </label>
            <Switch
              id="p_active"
              checked={form.watch("active")}
              onCheckedChange={(checked) => form.setValue("active", checked)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : plan ? "Save changes" : "Create plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface AssignPlanDialogProps {
  plans: BillingPlan[];
  children_options: Pick<Child, "id" | "first_name" | "last_name">[];
  trigger: React.ReactNode;
}

export function AssignPlanDialog({ plans, children_options, trigger }: AssignPlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  const form = useForm<ChildPlanValues>({
    resolver: zodResolver(childPlanSchema),
    defaultValues: { child_id: "", plan_id: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("child_plans").insert(values);
    setSaving(false);
    if (error) {
      toastError("Couldn't assign plan", error);
      return;
    }
    toast.success("Plan assigned");
    form.reset({ child_id: "", plan_id: "" });
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign a tuition plan</DialogTitle>
          <DialogDescription>
            Monthly invoices are generated for enrolled children with a plan and a primary guardian.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Child" htmlFor="cp_child" error={form.formState.errors.child_id?.message}>
            <Select
              value={form.watch("child_id")}
              onValueChange={(value) => form.setValue("child_id", value, { shouldValidate: true })}
            >
              <SelectTrigger id="cp_child">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children_options.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.first_name} {child.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Plan" htmlFor="cp_plan" error={form.formState.errors.plan_id?.message}>
            <Select
              value={form.watch("plan_id")}
              onValueChange={(value) => form.setValue("plan_id", value, { shouldValidate: true })}
            >
              <SelectTrigger id="cp_plan">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || plans.length === 0 || children_options.length === 0}>
              {saving ? "Assigning…" : "Assign plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GenerateInvoicesButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  async function generate() {
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("generate_monthly_invoices");
    setBusy(false);
    if (error) {
      toastError("Couldn't generate invoices", error);
      return;
    }
    toast.success(
      data === 0
        ? "No new invoices — this month is already billed."
        : `Generated ${data} invoice${data === 1 ? "" : "s"} for this month.`
    );
    router.refresh();
  }

  return (
    <Button onClick={generate} disabled={busy}>
      <FileText />
      {busy ? "Generating…" : "Generate this month's invoices"}
    </Button>
  );
}

export function InvoiceStatusButton({ invoice }: { invoice: Invoice }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    const markPaid = invoice.status !== "paid";
    const { error } = await supabase
      .from("invoices")
      .update({
        status: markPaid ? "paid" : "unpaid",
        paid_at: markPaid ? new Date().toISOString() : null,
      })
      .eq("id", invoice.id);
    setBusy(false);
    if (error) {
      toastError("Couldn't update invoice", error);
      return;
    }
    toast.success(markPaid ? "Invoice marked paid" : "Invoice marked unpaid");
    router.refresh();
  }

  return (
    <Button variant={invoice.status === "paid" ? "outline" : "secondary"} size="sm" onClick={toggle} disabled={busy}>
      {invoice.status === "paid" ? "Mark unpaid" : "Mark paid"}
    </Button>
  );
}
