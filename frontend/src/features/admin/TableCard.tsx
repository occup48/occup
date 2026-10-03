import { DiningTableIcon } from "./DiningTableIcon";
import { LoaderCircle, MapPin, MoreVertical, Pencil, Power } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { AdminTable } from "./admin-table.types";

export function TableCard({ table, busy, onEdit, onToggle }: { table: AdminTable; busy: boolean; onEdit: (table: AdminTable) => void; onToggle: (table: AdminTable) => void }) {
  return <article className="admin-table-card" aria-label={`Table ${table.tableNumber}`} aria-busy={busy}>
    <div className={`admin-table-icon ${table.isActive ? "" : "admin-table-icon-inactive"}`}><DiningTableIcon strokeWidth={1.6} aria-hidden="true" /></div>
    <div className="admin-table-details">
      <h2>{table.tableNumber}</h2>
      <p className="admin-table-capacity">{table.capacity} {table.capacity === 1 ? "seat" : "seats"}</p>
      <p className="admin-table-location"><MapPin aria-hidden="true" /><span>{table.location?.trim() || "No location"}</span></p>
      <span className={`admin-status-badge ${table.isActive ? "is-active" : "is-inactive"}`}>
        {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <span className="admin-status-dot" />}
        {busy ? "Updating…" : table.isActive ? "Active" : "Inactive"}
      </span>
    </div>
    <DropdownMenu>
      <DropdownMenuTrigger className="admin-icon-button admin-table-actions" aria-label={`Actions for ${table.tableNumber}`} disabled={busy}><MoreVertical aria-hidden="true" /></DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onEdit(table)}><Pencil aria-hidden="true" />Edit table</DropdownMenuItem>
        <DropdownMenuItem className={table.isActive ? "text-red-600" : "text-primary"} onClick={() => onToggle(table)}><Power aria-hidden="true" />{table.isActive ? "Deactivate table" : "Activate table"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </article>;
}
