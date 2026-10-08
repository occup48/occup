export type ReservationStatus = "confirmed" | "cancelled" | "completed";

export interface ReservationTable {
  id: string;
  tableNumber: string;
  location: string | null;
  capacity: number;
}

/** A reservation as returned by GET /api/reservations (times are "HH:mm"). */
export interface CustomerReservation {
  id: string;
  reservationDate: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  partySize: number;
  status: ReservationStatus;
  specialRequests: string | null;
  createdAt: string;
  updatedAt: string;
  table: ReservationTable | null;
  /** Decided by the server; the cancel endpoint re-checks it. */
  canCancel: boolean;
}
