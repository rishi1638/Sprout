"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Baby, Camera, MoonStar, StickyNote, UtensilsCrossed } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToastError } from "@/hooks/use-toast-error";
import {
  diaperLogSchema,
  mealLogSchema,
  napLogSchema,
  noteLogSchema,
  type DiaperLogValues,
  type MealLogValues,
  type NapLogValues,
  type NoteLogValues,
} from "@/lib/validations";
import type { Json } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field } from "@/components/shared/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface LoggerChild {
  id: string;
  first_name: string;
  last_name: string;
  classroom_id: string;
  classroom_name: string;
}

interface ActivityLoggerProps {
  childrenOptions: LoggerChild[];
  staffId: string;
}

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function ActivityLogger({ childrenOptions, staffId }: ActivityLoggerProps) {
  const [childId, setChildId] = useState(childrenOptions[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [photoNote, setPhotoNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toastError = useToastError();

  const selectedChild = childrenOptions.find((child) => child.id === childId);

  const mealForm = useForm<MealLogValues>({
    resolver: zodResolver(mealLogSchema),
    defaultValues: { food: "", amount_eaten: "most", note: "" },
  });

  const napForm = useForm<NapLogValues>({
    resolver: zodResolver(napLogSchema),
    defaultValues: {
      start: toLocalInputValue(new Date(Date.now() - 60 * 60_000)),
      end: toLocalInputValue(new Date()),
      note: "",
    },
  });

  const diaperForm = useForm<DiaperLogValues>({
    resolver: zodResolver(diaperLogSchema),
    defaultValues: { kind: "wet", note: "" },
  });

  const noteForm = useForm<NoteLogValues>({
    resolver: zodResolver(noteLogSchema),
    defaultValues: { note: "" },
  });

  async function insertActivity(
    type: "meal" | "nap" | "diaper" | "bathroom" | "note" | "photo",
    details: Json,
    note: string,
    photoPath?: string
  ): Promise<boolean> {
    if (!selectedChild) {
      toast.error("Pick a child first");
      return false;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("activities").insert({
      child_id: selectedChild.id,
      classroom_id: selectedChild.classroom_id,
      staff_id: staffId,
      type,
      details,
      note: note || null,
      photo_path: photoPath ?? null,
    });
    setSaving(false);
    if (error) {
      toastError("Couldn't save the log", error);
      return false;
    }
    toast.success(`Logged for ${selectedChild.first_name}`);
    router.refresh();
    return true;
  }

  const submitMeal = mealForm.handleSubmit(async (values) => {
    const ok = await insertActivity("meal", { food: values.food, amount_eaten: values.amount_eaten }, values.note);
    if (ok) mealForm.reset({ food: "", amount_eaten: "most", note: "" });
  });

  const submitNap = napForm.handleSubmit(async (values) => {
    const ok = await insertActivity(
      "nap",
      {
        start: new Date(values.start).toISOString(),
        end: new Date(values.end).toISOString(),
      },
      values.note
    );
    if (ok)
      napForm.reset({
        start: toLocalInputValue(new Date(Date.now() - 60 * 60_000)),
        end: toLocalInputValue(new Date()),
        note: "",
      });
  });

  const submitDiaper = diaperForm.handleSubmit(async (values) => {
    const type = values.kind === "bathroom" ? "bathroom" : "diaper";
    const ok = await insertActivity(type, { kind: values.kind }, values.note);
    if (ok) diaperForm.reset({ kind: "wet", note: "" });
  });

  const submitNote = noteForm.handleSubmit(async (values) => {
    const ok = await insertActivity("note", {}, values.note);
    if (ok) noteForm.reset({ note: "" });
  });

  async function submitPhoto(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedChild) {
      toast.error("Pick a child first");
      return;
    }
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a photo first");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo too large", { description: "Choose an image under 10 MB." });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${selectedChild.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("activity-photos").upload(path, file, {
      contentType: file.type || "image/jpeg",
    });
    if (uploadError) {
      setSaving(false);
      toastError("Couldn't upload the photo", uploadError);
      return;
    }
    setSaving(false);
    const ok = await insertActivity("photo", {}, photoNote, path);
    if (ok) {
      setPhotoNote("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (childrenOptions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Child" htmlFor="log_child">
          <Select value={childId} onValueChange={setChildId}>
            <SelectTrigger id="log_child">
              <SelectValue placeholder="Select a child" />
            </SelectTrigger>
            <SelectContent>
              {childrenOptions.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.first_name} {child.last_name} · {child.classroom_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Tabs defaultValue="meal">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="meal" className="flex-1 gap-1">
              <UtensilsCrossed className="size-4" /> Meal
            </TabsTrigger>
            <TabsTrigger value="nap" className="flex-1 gap-1">
              <MoonStar className="size-4" /> Nap
            </TabsTrigger>
            <TabsTrigger value="diaper" className="flex-1 gap-1">
              <Baby className="size-4" /> Change
            </TabsTrigger>
            <TabsTrigger value="note" className="flex-1 gap-1">
              <StickyNote className="size-4" /> Note
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex-1 gap-1">
              <Camera className="size-4" /> Photo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meal">
            <form onSubmit={submitMeal} className="space-y-3" noValidate>
              <Field label="What was served" htmlFor="meal_food" error={mealForm.formState.errors.food?.message}>
                <Input id="meal_food" placeholder="Pasta with veggies" {...mealForm.register("food")} />
              </Field>
              <Field label="Amount eaten" htmlFor="meal_amount" error={mealForm.formState.errors.amount_eaten?.message}>
                <Select
                  value={mealForm.watch("amount_eaten")}
                  onValueChange={(value) =>
                    mealForm.setValue("amount_eaten", value as MealLogValues["amount_eaten"], { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="meal_amount">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Ate everything</SelectItem>
                    <SelectItem value="most">Ate most</SelectItem>
                    <SelectItem value="some">Ate some</SelectItem>
                    <SelectItem value="none">Didn&apos;t eat</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Note (optional)" htmlFor="meal_note" error={mealForm.formState.errors.note?.message}>
                <Input id="meal_note" placeholder="Asked for seconds!" {...mealForm.register("note")} />
              </Field>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving…" : "Log meal"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="nap">
            <form onSubmit={submitNap} className="space-y-3" noValidate>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Fell asleep" htmlFor="nap_start" error={napForm.formState.errors.start?.message}>
                  <Input id="nap_start" type="datetime-local" {...napForm.register("start")} />
                </Field>
                <Field label="Woke up" htmlFor="nap_end" error={napForm.formState.errors.end?.message}>
                  <Input id="nap_end" type="datetime-local" {...napForm.register("end")} />
                </Field>
              </div>
              <Field label="Note (optional)" htmlFor="nap_note" error={napForm.formState.errors.note?.message}>
                <Input id="nap_note" placeholder="Slept soundly" {...napForm.register("note")} />
              </Field>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving…" : "Log nap"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="diaper">
            <form onSubmit={submitDiaper} className="space-y-3" noValidate>
              <Field label="Type" htmlFor="diaper_kind" error={diaperForm.formState.errors.kind?.message}>
                <Select
                  value={diaperForm.watch("kind")}
                  onValueChange={(value) =>
                    diaperForm.setValue("kind", value as DiaperLogValues["kind"], { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="diaper_kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wet">Wet diaper</SelectItem>
                    <SelectItem value="soiled">Soiled diaper</SelectItem>
                    <SelectItem value="dry">Dry check</SelectItem>
                    <SelectItem value="bathroom">Bathroom visit</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Note (optional)" htmlFor="diaper_note" error={diaperForm.formState.errors.note?.message}>
                <Input id="diaper_note" {...diaperForm.register("note")} />
              </Field>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving…" : "Log change"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="note">
            <form onSubmit={submitNote} className="space-y-3" noValidate>
              <Field label="Note for parents" htmlFor="note_note" error={noteForm.formState.errors.note?.message}>
                <Textarea id="note_note" placeholder="Built an amazing block tower today." {...noteForm.register("note")} />
              </Field>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving…" : "Post note"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="photo">
            <form onSubmit={submitPhoto} className="space-y-3">
              <Field label="Photo" htmlFor="photo_file" hint="JPEG or PNG, under 10 MB.">
                <Input id="photo_file" type="file" accept="image/*" capture="environment" ref={fileRef} />
              </Field>
              <Field label="Caption (optional)" htmlFor="photo_note">
                <Input
                  id="photo_note"
                  value={photoNote}
                  onChange={(event) => setPhotoNote(event.target.value)}
                  placeholder="Painting time!"
                />
              </Field>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Uploading…" : "Share photo"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
