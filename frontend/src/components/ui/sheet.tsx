import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetTitle = SheetPrimitive.Title;
const SheetDescription = SheetPrimitive.Description;

function SheetContent({ className, children, ...props }: SheetPrimitive.Popup.Props) {
  return <SheetPrimitive.Portal>
    <SheetPrimitive.Backdrop className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[2px]" />
    <SheetPrimitive.Popup data-slot="sheet-content" className={cn("fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100%-2rem)] flex-col bg-white shadow-xl outline-none duration-200 data-open:animate-in data-open:slide-in-from-left", className)} {...props}>
      {children}
      <SheetPrimitive.Close aria-label="Close navigation" className="absolute top-4 right-3 flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><X className="size-5" /></SheetPrimitive.Close>
    </SheetPrimitive.Popup>
  </SheetPrimitive.Portal>;
}

export { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription };
