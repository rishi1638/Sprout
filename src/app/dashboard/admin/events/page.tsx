import { CalendarDays, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { Classroom, Event } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { EventDialog } from "@/components/forms/event-dialog";

export const dynamic = "force-dynamic";

interface EventRow extends Event {
  classrooms: { id: string; name: string } | null;
}

export default async function AdminEventsPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const [eventsRes, classroomsRes] = await Promise.all([
    supabase.from("events").select("*, classrooms(id, name)").order("start_at", { ascending: false }),
    supabase.from("classrooms").select("id, name").order("name"),
  ]);

  const events = (eventsRes.data ?? []) as unknown as EventRow[];
  const classrooms = (classroomsRes.data ?? []) as Classroom[];

  return (
    <>
      <PageHeader
        title="Events"
        description="Schedule classroom activities, meetings, and center closures."
        action={
          <EventDialog
            classrooms={classrooms}
            trigger={
              <Button>
                Schedule event
              </Button>
            }
          />
        }
      />

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description="Create your first event and notify families and staff." 
          action={<EventDialog classrooms={classrooms} trigger={<Button>Schedule event</Button>} />}
        />
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{event.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{event.classrooms?.name ?? "All classrooms"}</p>
                </div>
                <EventDialog
                  event={event}
                  classrooms={classrooms}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Edit event">
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{event.description ?? "No description"}</p>
                <p className="text-sm text-muted-foreground">Audience: {event.audience}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(event.start_at).toLocaleString()} – {new Date(event.end_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
