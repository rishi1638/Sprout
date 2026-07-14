import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { Announcement } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { AnnouncementDialog } from "@/components/forms/announcement-dialog";

export const dynamic = "force-dynamic";

interface AnnouncementRow extends Announcement {
  profiles: { id: string; full_name: string } | null;
}

export default async function AdminAnnouncementsPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data } = await supabase
    .from("announcements")
    .select("*, profiles(id, full_name)")
    .order("created_at", { ascending: false });

  const announcements = (data ?? []) as unknown as AnnouncementRow[];

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Share center-wide updates with parents and educators."
        action={
          <AnnouncementDialog
            trigger={
              <Button>
                Post announcement
              </Button>
            }
          />
        }
      />

      {announcements.length === 0 ? (
        <EmptyState
          icon={Pencil}
          title="No announcements yet"
          description="Publish the first message to keep families and staff in the loop."
          action={<AnnouncementDialog trigger={<Button>Post announcement</Button>} />}
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{announcement.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{announcement.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={announcement.active ? "default" : "muted"}>
                    {announcement.active ? "Active" : "Inactive"}
                  </Badge>
                  <AnnouncementDialog
                    announcement={announcement}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Edit announcement">
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Audience: {announcement.audience}</p>
                <p className="text-sm text-muted-foreground">
                  Posted by {announcement.profiles?.full_name ?? "Unknown"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
