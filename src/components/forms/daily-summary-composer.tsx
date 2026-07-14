"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToastError } from "@/hooks/use-toast-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const summarySchema = z.object({
  scope: z.enum(["selected", "all"]),
  child_id: z.string().optional(),
  food: z.string().trim(),
  activities: z.string().trim(),
  nap: z.string().trim(),
  note: z.string().trim(),
});

type SummaryValues = z.infer<typeof summarySchema>;

export interface SummaryChild {
  id: string;
  first_name: string;
  last_name: string;
  classroom_id: string;
}

interface DailySummaryComposerProps {
  childrenOptions: SummaryChild[];
  staffId: string;
}

export function DailySummaryComposer({ childrenOptions, staffId }: DailySummaryComposerProps) {
  const [saving, setSaving] = useState(false);
  const [postToAll, setPostToAll] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  const form = useForm<SummaryValues>({
    resolver: zodResolver(summarySchema),
    defaultValues: {
      scope: "selected",
      child_id: childrenOptions[0]?.id ?? "",
      food: "",
      activities: "",
      nap: "",
      note: "",
    },
  });

  const selectedChildId = form.watch("child_id");
  const selectedChild = childrenOptions.find((child) => child.id === selectedChildId);

  async function onSubmit(values: SummaryValues) {
    if (childrenOptions.length === 0) return;

    const targetChildren = values.scope === "all" || postToAll ? childrenOptions : selectedChild ? [selectedChild] : [];
    if (targetChildren.length === 0) {
      toast.error("Pick a child or share with all children in your room.");
      return;
    }

    const noteText = [
      values.food ? `Meals: ${values.food}` : null,
      values.activities ? `Activities: ${values.activities}` : null,
      values.nap ? `Nap: ${values.nap}` : null,
      values.note ? `Note: ${values.note}` : null,
    ]
      .filter(Boolean)
      .join(" • ");

    if (!noteText.trim()) {
      toast.error("Add at least one detail before posting the summary.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const inserts = targetChildren.map((child) =>
      supabase.from("activities").insert({
        child_id: child.id,
        classroom_id: child.classroom_id,
        staff_id: staffId,
        type: "note",
        details: { summary: true, food: values.food, activities: values.activities, nap: values.nap },
        note: noteText,
      })
    );

    const results = await Promise.all(inserts);
    setSaving(false);

    const failure = results.find((result) => result.error);
    if (failure?.error) {
      toastError("Couldn't post the day summary", failure.error);
      return;
    }

    toast.success(postToAll || values.scope === "all" ? "Summary posted to your room" : `Summary posted for ${selectedChild?.first_name ?? "child"}`);
    form.reset({
      scope: "selected",
      child_id: childrenOptions[0]?.id ?? "",
      food: "",
      activities: "",
      nap: "",
      note: "",
    });
    setPostToAll(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="size-4" /> Day summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <label htmlFor="summary_all" className="text-sm font-semibold">
              Share with all children in my room
            </label>
            <Switch id="summary_all" checked={postToAll} onCheckedChange={setPostToAll} />
          </div>

          {!postToAll ? (
            <Field label="Child" htmlFor="summary_child" error={form.formState.errors.child_id?.message}>
              <Select
                value={form.watch("child_id")}
                onValueChange={(value) => form.setValue("child_id", value, { shouldValidate: true })}
              >
                <SelectTrigger id="summary_child">
                  <SelectValue placeholder="Select a child" />
                </SelectTrigger>
                <SelectContent>
                  {childrenOptions.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.first_name} {child.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <Field label="What did they eat?" htmlFor="summary_food">
            <Input id="summary_food" placeholder="Pasta, fruit, yogurt" {...form.register("food")} />
          </Field>
          <Field label="Activities they performed" htmlFor="summary_activities">
            <Textarea
              id="summary_activities"
              placeholder="Block play, outdoor time, art, sensory bin"
              {...form.register("activities")}
            />
          </Field>
          <Field label="Nap time" htmlFor="summary_nap">
            <Input id="summary_nap" placeholder="1:00–2:00 pm" {...form.register("nap")} />
          </Field>
          <Field label="Additional note" htmlFor="summary_note">
            <Textarea id="summary_note" placeholder="Had a great morning and was very curious." {...form.register("note")} />
          </Field>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Posting…" : postToAll ? "Post room summary" : "Post child summary"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
