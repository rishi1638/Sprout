"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AttendanceScanPage({ params }: { params: Promise<{ childId: string }> }) {
  const [childId, setChildId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void params.then(({ childId }) => setChildId(childId));
  }, [params]);

  async function handleAction() {
    if (!childId) return;
    setBusy(true);
    const supabase = createClient();
    const user = (await supabase.auth.getUser()).data.user;
    if (!user?.id) {
      setBusy(false);
      toast.error("You need to sign in before using this action.");
      return;
    }

    const { data: child } = await supabase.from("children").select("id, first_name, last_name").eq("id", childId).single();
    const { data: openAttendance } = await supabase.from("attendance").select("id").eq("child_id", childId).is("check_out_at", null).maybeSingle();

    if (openAttendance) {
      await supabase
        .from("attendance")
        .update({ check_out_at: new Date().toISOString(), check_out_by: user.id })
        .eq("id", openAttendance.id);
      toast.success(`${child?.first_name ?? "Child"} checked out`);
    } else {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("classroom_id")
        .eq("child_id", childId)
        .is("end_date", null)
        .maybeSingle();

      if (!enrollment?.classroom_id) {
        setBusy(false);
        toast.error("This child is not enrolled in a classroom yet.");
        return;
      }

      await supabase.from("attendance").insert({
        child_id: childId,
        classroom_id: enrollment.classroom_id,
        check_in_by: user.id,
      });
      toast.success(`${child?.first_name ?? "Child"} checked in`);
    }

    setBusy(false);
    router.replace("/dashboard/ece/attendance");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Quick attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Use this action to toggle the child&apos;s current attendance state.</p>
          <Button className="w-full" onClick={handleAction} disabled={busy || !childId}>
            {busy ? "Working…" : "Check in / out"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
