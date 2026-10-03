import type { ReactNode } from "react";

/** Back and Next, kept at the bottom of the screen with a divider above, as in the design. */
export function StepFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-3 rounded-b-3xl border-t bg-card px-5 py-4">
      {children}
    </div>
  );
}
