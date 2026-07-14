"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface SignPermissionButtonProps {
  formId: string;
  parentId: string;
  signed: boolean;
}

export function SignPermissionButton({ formId, parentId, signed }: SignPermissionButtonProps) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function signForm() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("permission_signatures")
      .upsert(
        {
          form_id: formId,
          parent_id: parentId,
          approved: true,
          signed_at: new Date().toISOString(),
        },
        { onConflict: "form_id,parent_id" }
      );

    setSaving(false);
    if (error) {
      toast.error("Could not sign form", { description: error.message });
      return;
    }
    toast.success("Permission form signed");
    router.refresh();
  }

  return (
    <Button variant={signed ? "secondary" : "default"} size="sm" disabled={saving || signed} onClick={signForm}>
      {signed ? "Signed" : saving ? "Signing…" : "Sign form"}
    </Button>
  );
}
