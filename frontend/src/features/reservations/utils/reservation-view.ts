import { restaurantNow } from "../../restaurant/utils/booking-time.ts";
import { parseDateString } from "../../booking/utils/dates.ts";
import type { CustomerReservation } from "../types/reservations.ts";

export type StatusTone = "confirmed" | "in-progress" | "completed" | "cancelled";

export interface DisplayStatus {
  label: string;
  tone: StatusTone;
}

const stamp = (date: string, time: string) => `${date} ${time.slice(0, 5)}`;

/** A confirmed reservation whose end time has not passed yet. */
export function isUpcoming(r: CustomerReservation, now: Date, timeZone: string): boolean {
  if (r.status !== "confirmed") return false;
  const current = restaurantNow(now, timeZone);
  return stamp(r.reservationDate, r.endTime) > stamp(current.date, current.time);
}

/** Upcoming reservations soonest first; everything else most recent first. */
export function splitReservations(
  reservations: CustomerReservation[],
  now: Date,
  timeZone: string,
): { upcoming: CustomerReservation[]; past: CustomerReservation[] } {
  const start = (r: CustomerReservation) => stamp(r.reservationDate, r.startTime);
  const upcoming = reservations
    .filter((r) => isUpcoming(r, now, timeZone))
    .sort((a, b) => start(a).localeCompare(start(b)));
  const past = reservations
    .filter((r) => !isUpcoming(r, now, timeZone))
    .sort((a, b) => start(b).localeCompare(start(a)));
  return { upcoming, past };
}

/** What to call a reservation. The server never flips old bookings to "completed", so we do it here. */
export function displayStatus(r: CustomerReservation, now: Date, timeZone: string): DisplayStatus {
  if (r.status === "cancelled") return { label: "Cancelled", tone: "cancelled" };
  if (r.status === "completed") return { label: "Completed", tone: "completed" };
  if (!isUpcoming(r, now, timeZone)) return { label: "Completed", tone: "completed" };
  const current = restaurantNow(now, timeZone);
  if (stamp(r.reservationDate, r.startTime) <= stamp(current.date, current.time)) {
    return { label: "In progress", tone: "in-progress" };
  }
  return { label: "Confirmed", tone: "confirmed" };
}

/** "2026-10-20" becomes "Tue, Oct 20, 2026". Anything else comes back unchanged. */
export function formatLongDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseDateString(value));
}

/** "Table T01 · Window", or just "Table T01" when it has no location. */
export function describeTable(r: CustomerReservation): string {
  if (!r.table) return "Table assigned by the restaurant";
  return r.table.location ? `Table ${r.table.tableNumber} · ${r.table.location}` : `Table ${r.table.tableNumber}`;
}

/** Short reference a guest can quote to the restaurant. */
export function referenceCode(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
