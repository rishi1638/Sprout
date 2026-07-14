"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useToastError } from "@/hooks/use-toast-error";
import { eventSchema, type EventValues } from "@/lib/validations";
import type { Classroom, Event } from "@/types";
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
import { Field } from "@/components/shared/form-field";

interface EventDialogProps {
  event?: Event;
  classrooms: Classroom[];
  trigger: React.ReactNode;
}

export function EventDialog({ event, classrooms, trigger }: EventDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title ?? "",
      description: event?.description ?? "",
      start_at: event?.start_at ? event.start_at.slice(0, 16) : new Date().toISOString().slice(0, 16),
      end_at: event?.end_at ? event.end_at.slice(0, 16) : new Date(new Date().getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
      classroom_id: event?.classroom_id ?? "",
      audience: (event?.audience ?? "all") as EventValues["audience"],
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    const supabase = createClient();
    const payload = {
      title: values.title,
      description: values.description || null,
      start_at: new Date(values.start_at).toISOString(),
      end_at: new Date(values.end_at).toISOString(),
      classroom_id: values.classroom_id || null,
      audience: values.audience,
    };

    const { error } = event
      ? await supabase.from("events").update(payload).eq("id", event.id)
      : await supabase.from("events").insert(payload);

    setSaving(false);

    if (error) {
      toastError(event ? "Couldn't update event" : "Couldn't create event", error);
      return;
    }

    toast.success(event ? "Event updated" : "Event created");
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Schedule event"}</DialogTitle>
          <DialogDescription>Publish an upcoming activity, closure, or parent event.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Title" htmlFor="event_title" error={form.formState.errors.title?.message}>
            <Input id="event_title" {...form.register("title")} />
          </Field>
          <Field label="Description" htmlFor="event_description" error={form.formState.errors.description?.message}>
            <Textarea id="event_description" rows={4} {...form.register("description")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Starts" htmlFor="event_start" error={form.formState.errors.start_at?.message}>
              <Input id="event_start" type="datetime-local" {...form.register("start_at")} />
            </Field>
            <Field label="Ends" htmlFor="event_end" error={form.formState.errors.end_at?.message}>
              <Input id="event_end" type="datetime-local" {...form.register("end_at")} />
            </Field>
          </div>
          <Field label="Classroom" htmlFor="event_classroom" error={form.formState.errors.classroom_id?.message}>
            <Select
              value={form.watch("classroom_id")}
              onValueChange={(value) => form.setValue("classroom_id", value as EventValues["classroom_id"], { shouldValidate: true })}
            >
              <SelectTrigger id="event_classroom">
                <SelectValue placeholder="All classrooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All classrooms</SelectItem>
                {classrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Visibility" htmlFor="event_audience" error={form.formState.errors.audience?.message}>
            <Select
              value={form.watch("audience")}
              onValueChange={(value) => form.setValue("audience", value as EventValues["audience"], { shouldValidate: true })}
            >
              <SelectTrigger id="event_audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="parents">Parents only</SelectItem>
                <SelectItem value="staff">Staff only</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : event ? "Save event" : "Publish event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
