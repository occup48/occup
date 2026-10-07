export type AdminTable = {
  id: string;
  tableNumber: string;
  capacity: number;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TablePayload = {
  tableNumber: string;
  capacity: number;
  location?: string;
  isActive: boolean;
};

export type TableAvailabilityStatus = "available" | "reserved" | "occupied" | "unavailable";
export type TableStatusFilter = "all" | TableAvailabilityStatus;

// Reservation-derived states remain part of the vocabulary, but the current
// table API only exposes isActive. Never infer a booking from that flag.
export function getTableAvailabilityStatus(table: Pick<AdminTable, "isActive">): TableAvailabilityStatus {
  return table.isActive ? "available" : "unavailable";
}
