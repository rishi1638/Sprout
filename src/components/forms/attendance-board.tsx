"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { LogIn, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToastError } from "@/hooks/use-toast-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface AttendanceChild {
  child_id: string;
  first_name: string;
  last_name: string;
  classroom_id: string;
  classroom_name: string;
  open_attendance_id: string | null;
  check_in_at: string | null;
}

export function AttendanceBoard({ childrenRows, staffId }: { childrenRows: AttendanceChild[]; staffId: string }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();
  const toastError = useToastError();

  async function checkIn(row: AttendanceChild) {
    setBusyId(row.child_id);
    const supabase = createClient();
    const { error } = await supabase.from("attendance").insert({
      child_id: row.child_id,
      classroom_id: row.classroom_id,
      check_in_by: staffId,
    });
    setBusyId(null);
    if (error) {
      toastError("Couldn't check in", error);
      return;
    }
    toast.success(`${row.first_name} checked in`);
    router.refresh();
  }

  async function checkOut(row: AttendanceChild) {
    if (!row.open_attendance_id) return;
    setBusyId(row.child_id);
    const supabase = createClient();
    const { error } = await supabase
      .from("attendance")
      .update({ check_out_at: new Date().toISOString(), check_out_by: staffId })
      .eq("id", row.open_attendance_id);
    setBusyId(null);
    if (error) {
      toastError("Couldn't check out", error);
      return;
    }
    toast.success(`${row.first_name} checked out`);
    router.refresh();
  }

  const grouped = new Map<string, AttendanceChild[]>();
  for (const row of childrenRows) {
    const group = grouped.get(row.classroom_name) ?? [];
    group.push(row);
    grouped.set(row.classroom_name, group);
  }

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([roomName, rows]) => (
        <section key={roomName} className="space-y-2">
          <h2 className="text-lg font-bold">{roomName}</h2>
          <ul className="space-y-2">
            {rows.map((row) => {
              const present = row.open_attendance_id !== null;
              return (
                <li
                  key={row.child_id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {row.first_name} {row.last_name}
                    </p>
                    {present && row.check_in_at ? (
                      <p className="text-xs text-muted-foreground">
                        In since {format(new Date(row.check_in_at), "h:mm a")}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={present ? "default" : "muted"}>{present ? "Present" : "Out"}</Badge>
                  {present ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => checkOut(row)}
                      disabled={busyId === row.child_id}
                    >
                      <LogOut /> Check out
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => checkIn(row)} disabled={busyId === row.child_id}>
                      <LogIn /> Check in
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
