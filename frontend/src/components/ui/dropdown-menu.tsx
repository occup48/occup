import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

const DropdownMenu = MenuPrimitive.Root;
const DropdownMenuTrigger = MenuPrimitive.Trigger;

function DropdownMenuContent({ className, align = "end", ...props }: MenuPrimitive.Popup.Props & { align?: "start" | "center" | "end" }) {
  return <MenuPrimitive.Portal>
    <MenuPrimitive.Positioner sideOffset={6} align={align} className="z-50 outline-none">
      <MenuPrimitive.Popup data-slot="dropdown-menu-content" className={cn("min-w-48 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95", className)} {...props} />
    </MenuPrimitive.Positioner>
  </MenuPrimitive.Portal>;
}
function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return <MenuPrimitive.Item data-slot="dropdown-menu-item" className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none data-highlighted:bg-muted data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:size-4", className)} {...props} />;
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem };
