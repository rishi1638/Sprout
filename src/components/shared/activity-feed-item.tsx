"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Baby, Camera, MoonStar, StickyNote, Toilet, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityType } from "@/lib/database.types";
import { ACTIVITY_LABELS, readActivityDetails, type ActivityWithChild } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  meal: UtensilsCrossed,
  nap: MoonStar,
  diaper: Baby,
  bathroom: Toilet,
  note: StickyNote,
  photo: Camera,
};

const AMOUNT_LABELS: Record<string, string> = {
  all: "ate everything",
  most: "ate most of it",
  some: "ate some",
  none: "didn't eat",
};

function summarize(activity: ActivityWithChild): string {
  const details = readActivityDetails(activity.details);
  switch (activity.type) {
    case "meal":
      return [details.food, details.amount_eaten ? AMOUNT_LABELS[details.amount_eaten] : null]
        .filter(Boolean)
        .join(" — ");
    case "nap":
      if (details.start && details.end) {
        return `Slept ${format(new Date(details.start), "h:mm a")} – ${format(new Date(details.end), "h:mm a")}`;
      }
      return "Nap logged";
    case "diaper":
    case "bathroom":
      return details.kind ? `Change: ${details.kind}` : "Change logged";
    default:
      return "";
  }
}

function ActivityPhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.storage
      .from("activity-photos")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) return <div className="mt-2 h-40 w-full animate-pulse rounded-md bg-muted" />;
  // eslint-disable-next-line @next/next/no-img-element -- signed URLs are short-lived and unsuited to the image optimizer
  return <img src={url} alt="Activity photo" className="mt-2 max-h-72 w-full rounded-md object-cover" />;
}

export function ActivityFeedItem({ activity, showChildName = true }: { activity: ActivityWithChild; showChildName?: boolean }) {
  const Icon = ACTIVITY_ICONS[activity.type];
  const summary = summarize(activity);
  const childName = activity.children ? `${activity.children.first_name} ${activity.children.last_name}` : "Child";

  return (
    <article className="flex gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {showChildName ? <span className="font-bold">{childName}</span> : null}
          <Badge variant="muted">{ACTIVITY_LABELS[activity.type]}</Badge>
          <time className="ml-auto text-xs text-muted-foreground" dateTime={activity.occurred_at}>
            {format(new Date(activity.occurred_at), "MMM d, h:mm a")}
          </time>
        </div>
        {summary ? <p className="mt-1 text-sm">{summary}</p> : null}
        {activity.note ? <p className="mt-1 text-sm text-muted-foreground">{activity.note}</p> : null}
        {activity.photo_path ? <ActivityPhoto path={activity.photo_path} /> : null}
        {activity.profiles ? (
          <p className="mt-2 text-xs text-muted-foreground">Logged by {activity.profiles.full_name}</p>
        ) : null}
      </div>
    </article>
  );
}
