import { Users } from "lucide-react";
import type { ClassroomRatio } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Signature "pill meter" showing live child-to-staff ratio and room capacity.
 * Green = comfortable, amber = near limits, red = over ratio / at capacity.
 */
export function RatioCard({ ratio, maxChildrenPerStaff = 5 }: { ratio: ClassroomRatio; maxChildrenPerStaff?: number }) {
  const { children_present, staff_assigned, capacity, enrolled_count } = ratio;
  const perStaff = staff_assigned > 0 ? children_present / staff_assigned : Infinity;
  const overRatio = children_present > 0 && perStaff > maxChildrenPerStaff;
  const nearRatio = !overRatio && children_present > 0 && perStaff > maxChildrenPerStaff * 0.8;
  const fillPct = Math.min(100, Math.round((children_present / capacity) * 100));

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">{ratio.name}</h3>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
            overRatio && "bg-destructive-soft text-destructive",
            nearRatio && "bg-accent-soft text-accent-foreground",
            !overRatio && !nearRatio && "bg-primary-soft text-primary"
          )}
        >
          <Users className="size-3.5" />
          {children_present} : {staff_assigned}
        </span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${children_present} of ${capacity} spots in use`}>
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            fillPct >= 100 ? "bg-destructive" : fillPct >= 80 ? "bg-accent" : "bg-primary"
          )}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {children_present} present now · {enrolled_count} enrolled · capacity {capacity}
        {overRatio ? " · over target ratio" : ""}
      </p>
    </div>
  );
}
