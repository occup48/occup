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

export type TableStatusFilter = "all" | "active" | "inactive";
