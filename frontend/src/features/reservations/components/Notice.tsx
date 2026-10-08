import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NoticeMessage {
  tone: "success" | "info";
  text: string;
}

export function Notice({ notice, onDismiss }: { notice: NoticeMessage; onDismiss: () => void }) {
  const Icon = notice.tone === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-sm",
        notice.tone === "success"
          ? "border-primary/30 bg-primary-light text-primary-ink"
          : "border-amber-300 bg-amber-50 text-amber-900",
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1">{notice.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="-m-2 flex min-h-11 min-w-11 items-center justify-center text-xs font-medium underline"
      >
        Dismiss
      </button>
    </div>
  );
}
