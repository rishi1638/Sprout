"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToastError } from "@/hooks/use-toast-error";
import {
  emergencyContactSchema,
  guardianLinkSchema,
  type EmergencyContactValues,
  type GuardianLinkValues,
} from "@/lib/validations";
import type { ChildWithRelations, Profile } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field } from "@/components/shared/form-field";
import { Badge } from "@/components/ui/badge";

interface ChildLinksDialogProps {
  child: ChildWithRelations;
  parents: Pick<Profile, "id" | "full_name">[];
  trigger: React.ReactNode;
}

export function ChildLinksDialog({ child, parents, trigger }: ChildLinksDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toastError = useToastError();

  const guardianForm = useForm<GuardianLinkValues>({
    resolver: zodResolver(guardianLinkSchema),
    defaultValues: { parent_id: "", relationship: "guardian", is_primary: false },
  });

  const contactForm = useForm<z.input<typeof emergencyContactSchema>, unknown, EmergencyContactValues>({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: { name: "", relationship: "", phone: "", priority: 1 },
  });

  const linkedParentIds = new Set(child.guardianships.map((g) => g.parent_id));
  const availableParents = parents.filter((parent) => !linkedParentIds.has(parent.id));

  const addGuardian = guardianForm.handleSubmit(async (values) => {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("guardianships").insert({
      child_id: child.id,
      parent_id: values.parent_id,
      relationship: values.relationship,
      is_primary: values.is_primary,
    });
    setBusy(false);
    if (error) {
      toastError("Couldn't link guardian", error);
      return;
    }
    toast.success("Guardian linked");
    guardianForm.reset({ parent_id: "", relationship: "guardian", is_primary: false });
    router.refresh();
  });

  async function removeGuardian(parentId: string) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("guardianships")
      .delete()
      .eq("child_id", child.id)
      .eq("parent_id", parentId);
    setBusy(false);
    if (error) {
      toastError("Couldn't remove guardian", error);
      return;
    }
    toast.success("Guardian removed");
    router.refresh();
  }

  const addContact = contactForm.handleSubmit(async (values) => {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("emergency_contacts").insert({
      child_id: child.id,
      name: values.name,
      relationship: values.relationship,
      phone: values.phone,
      priority: values.priority,
    });
    setBusy(false);
    if (error) {
      toastError("Couldn't add contact", error);
      return;
    }
    toast.success("Emergency contact added");
    contactForm.reset({ name: "", relationship: "", phone: "", priority: 1 });
    router.refresh();
  });

  async function removeContact(contactId: string) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("emergency_contacts").delete().eq("id", contactId);
    setBusy(false);
    if (error) {
      toastError("Couldn't remove contact", error);
      return;
    }
    toast.success("Emergency contact removed");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {child.first_name} {child.last_name}
          </DialogTitle>
          <DialogDescription>Manage guardians and emergency contacts.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="guardians">
          <TabsList className="w-full">
            <TabsTrigger value="guardians" className="flex-1">
              Guardians
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex-1">
              Emergency contacts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guardians" className="space-y-4">
            {child.guardianships.length === 0 ? (
              <p className="text-sm text-muted-foreground">No guardians linked yet.</p>
            ) : (
              <ul className="space-y-2">
                {child.guardianships.map((guardianship) => (
                  <li
                    key={guardianship.parent_id}
                    className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {guardianship.profiles?.full_name ?? "Unknown parent"}
                    </span>
                    <Badge variant="muted">{guardianship.relationship}</Badge>
                    {guardianship.is_primary ? <Badge variant="accent">Primary</Badge> : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeGuardian(guardianship.parent_id)}
                      disabled={busy}
                      aria-label="Remove guardian"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={addGuardian} className="space-y-3 rounded-md border border-border p-3" noValidate>
              <Field label="Parent account" htmlFor="parent_id" error={guardianForm.formState.errors.parent_id?.message}>
                <Select
                  value={guardianForm.watch("parent_id")}
                  onValueChange={(value) => guardianForm.setValue("parent_id", value, { shouldValidate: true })}
                >
                  <SelectTrigger id="parent_id">
                    <SelectValue placeholder={availableParents.length ? "Select a parent" : "No unlinked parents"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableParents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.full_name || "Unnamed parent"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Relationship" htmlFor="g_relationship" error={guardianForm.formState.errors.relationship?.message}>
                <Input id="g_relationship" placeholder="mother, father, guardian…" {...guardianForm.register("relationship")} />
              </Field>
              <div className="flex items-center justify-between">
                <label htmlFor="is_primary" className="text-sm font-semibold">
                  Primary guardian (receives invoices)
                </label>
                <Switch
                  id="is_primary"
                  checked={guardianForm.watch("is_primary")}
                  onCheckedChange={(checked) => guardianForm.setValue("is_primary", checked)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy || availableParents.length === 0}>
                Link guardian
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            {child.emergency_contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emergency contacts yet.</p>
            ) : (
              <ul className="space-y-2">
                {[...child.emergency_contacts]
                  .sort((a, b) => a.priority - b.priority)
                  .map((contact) => (
                    <li key={contact.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-semibold">{contact.name}</span>{" "}
                        <span className="text-muted-foreground">
                          · {contact.relationship} · {contact.phone}
                        </span>
                      </span>
                      <Badge variant="muted">#{contact.priority}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeContact(contact.id)}
                        disabled={busy}
                        aria-label="Remove contact"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
              </ul>
            )}
            <form onSubmit={addContact} className="space-y-3 rounded-md border border-border p-3" noValidate>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Name" htmlFor="c_name" error={contactForm.formState.errors.name?.message}>
                  <Input id="c_name" {...contactForm.register("name")} />
                </Field>
                <Field label="Relationship" htmlFor="c_relationship" error={contactForm.formState.errors.relationship?.message}>
                  <Input id="c_relationship" placeholder="grandmother, neighbor…" {...contactForm.register("relationship")} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Phone" htmlFor="c_phone" error={contactForm.formState.errors.phone?.message}>
                  <Input id="c_phone" type="tel" inputMode="tel" {...contactForm.register("phone")} />
                </Field>
                <Field label="Priority" htmlFor="c_priority" error={contactForm.formState.errors.priority?.message}>
                  <Input id="c_priority" type="number" min={1} {...contactForm.register("priority")} />
                </Field>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Add contact
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
