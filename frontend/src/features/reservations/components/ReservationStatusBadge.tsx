import { cn } from "@/lib/utils";
import type { DisplayStatus, StatusTone } from "../utils/reservation-view";

const TONES: Record<StatusTone, string> = {
  confirmed: "bg-primary-light text-primary-ink",
  "in-progress": "bg-warning-light text-amber-900",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-50 text-red-700",
};

export function ReservationStatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <span
      data-tone={status.tone}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        TONES[status.tone],
      )}
    >
      {status.label}
    </span>
  );
}
