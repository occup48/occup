import type { ComponentProps } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// shadcn/ui composition on the Base UI primitives already used by this app.
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({ className, children, showCloseButton = true, ...props }: DialogPrimitive.Popup.Props & { showCloseButton?: boolean }) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0" />
    <DialogPrimitive.Popup data-slot="dialog-content" className={cn("fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto rounded-2xl border bg-background p-6 text-foreground shadow-xl outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95", className)} {...props}>
      {children}
      {showCloseButton && <DialogPrimitive.Close aria-label="Close dialog" className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><X className="size-5" /></DialogPrimitive.Close>}
    </DialogPrimitive.Popup>
  </DialogPrimitive.Portal>;
}

function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2 pr-8", className)} {...props} />;
}
function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title className={cn("text-xl font-semibold tracking-tight", className)} {...props} />;
}
function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription };
