export interface Table {
  id: string;
  tableNumber: string;
  capacity: number;
  location: string | null;
  isActive: boolean;
}

export interface Reservation {
  id: string;
  tableId: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  partySize: number;
  specialRequests?: string | null;
  status: "confirmed" | "cancelled" | "completed";
}

export interface AvailabilitySearchParams {
  date: string;
  time: string;
  partySize: number;
}

export interface CreateReservationInput {
  tableId: string;
  reservationDate: string;
  startTime: string;
  partySize: number;
  specialRequests?: string;
}