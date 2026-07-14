"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useToastError } from "@/hooks/use-toast-error";
import { announcementSchema, type AnnouncementValues } from "@/lib/validations";
import type { Announcement } from "@/types";
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

interface AnnouncementDialogProps {
  announcement?: Announcement;
  trigger: React.ReactNode;
}

export function AnnouncementDialog({ announcement, trigger }: AnnouncementDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  const form = useForm<AnnouncementValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: announcement?.title ?? "",
      message: announcement?.message ?? "",
      audience: (announcement?.audience ?? "all") as AnnouncementValues["audience"],
      active: announcement?.active ?? true,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    const payload = announcement
      ? {
          title: values.title,
          message: values.message,
          audience: values.audience,
          active: values.active,
        }
      : {
          title: values.title,
          message: values.message,
          audience: values.audience,
          active: values.active,
          author_id: user?.id,
        };

    if (!announcement && !user) {
      setSaving(false);
      toastError("You must be signed in to post an announcement", { message: "Not authenticated" });
      return;
    }

    const { error } = announcement
      ? await supabase.from("announcements").update(payload).eq("id", announcement.id)
      : await supabase.from("announcements").insert(payload as any);

    setSaving(false);

    if (error) {
      toastError(announcement ? "Couldn't update announcement" : "Couldn't create announcement", error);
      return;
    }

    toast.success(announcement ? "Announcement updated" : "Announcement posted");
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{announcement ? "Edit announcement" : "New announcement"}</DialogTitle>
          <DialogDescription>Share a center update with families and staff.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Title" htmlFor="announcement_title" error={form.formState.errors.title?.message}>
            <Input id="announcement_title" {...form.register("title")} />
          </Field>
          <Field label="Message" htmlFor="announcement_message" error={form.formState.errors.message?.message}>
            <Textarea id="announcement_message" rows={5} {...form.register("message")} />
          </Field>
          <Field label="Audience" htmlFor="announcement_audience" error={form.formState.errors.audience?.message}>
            <Select
              value={form.watch("audience")}
              onValueChange={(value) => form.setValue("audience", value as AnnouncementValues["audience"], { shouldValidate: true })}
            >
              <SelectTrigger id="announcement_audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="parents">Parents</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="announcement_active" className="text-sm font-semibold">
              Active
            </label>
            <Input
              id="announcement_active"
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus-visible:ring-primary"
              checked={form.watch("active")}
              onChange={(event) => form.setValue("active", event.target.checked)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : announcement ? "Save changes" : "Post announcement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
