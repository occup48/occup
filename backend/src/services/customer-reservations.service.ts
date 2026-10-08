import { and, desc, eq, gt, or } from "drizzle-orm";

import { db } from "../db/index.js";
import { reservations } from "../db/schema/reservations.js";
import { tables } from "../db/schema/tables.js";
import { canCancelReservation, cancellationBoundary } from "../utils/restaurant-time.js";

export interface CustomerReservation {
  id: string;
  reservationDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  partySize: number;
  status: "confirmed" | "cancelled" | "completed";
  specialRequests: string | null;
  createdAt: Date;
  updatedAt: Date;
  table: { id: string; tableNumber: string; location: string | null; capacity: number } | null;
  canCancel: boolean;
}

const selection = {
  id: reservations.id,
  reservationDate: reservations.reservationDate,
  startTime: reservations.startTime,
  endTime: reservations.endTime,
  partySize: reservations.partySize,
  status: reservations.status,
  specialRequests: reservations.specialRequests,
  createdAt: reservations.createdAt,
  updatedAt: reservations.updatedAt,
  tableId: tables.id,
  tableNumber: tables.tableNumber,
  tableLocation: tables.location,
  tableCapacity: tables.capacity,
};

type Row = {
  id: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  partySize: number;
  status: "confirmed" | "cancelled" | "completed";
  specialRequests: string | null;
  createdAt: Date;
  updatedAt: Date;
  tableId: string | null;
  tableNumber: string | null;
  tableLocation: string | null;
  tableCapacity: number | null;
};

function toCustomerReservation(row: Row, now: Date): CustomerReservation {
  return {
    id: row.id,
    reservationDate: row.reservationDate,
    startTime: row.startTime.slice(0, 5),
    endTime: row.endTime.slice(0, 5),
    partySize: row.partySize,
    status: row.status,
    specialRequests: row.specialRequests,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    table:
      row.tableId !== null && row.tableNumber !== null && row.tableCapacity !== null
        ? {
            id: row.tableId,
            tableNumber: row.tableNumber,
            location: row.tableLocation,
            capacity: row.tableCapacity,
          }
        : null,
    canCancel: canCancelReservation(row, now),
  };
}

/** Every reservation the guest has made, soonest-in-the-future and most recent first. */
export async function listUserReservations(userId: string): Promise<CustomerReservation[]> {
  const rows = await db
    .select(selection)
    .from(reservations)
    .leftJoin(tables, eq(reservations.tableId, tables.id))
    .where(eq(reservations.userId, userId))
    .orderBy(desc(reservations.reservationDate), desc(reservations.startTime));

  const now = new Date();
  return rows.map((row) => toCustomerReservation(row, now));
}

/** One reservation, only if it belongs to this guest. */
export async function getUserReservation(
  userId: string,
  reservationId: string,
): Promise<CustomerReservation | null> {
  const [row] = await db
    .select(selection)
    .from(reservations)
    .leftJoin(tables, eq(reservations.tableId, tables.id))
    .where(and(eq(reservations.id, reservationId), eq(reservations.userId, userId)))
    .limit(1);

  return row ? toCustomerReservation(row, new Date()) : null;
}

export type CancelResult =
  | { ok: true; reservation: CustomerReservation }
  | { ok: false; reason: "NOT_FOUND" | "ALREADY_CANCELLED" | "NOT_CANCELLABLE" };

/**
 * Soft-cancels a reservation (status -> cancelled; the row is kept).
 *
 * The ownership, status and "has not started" rules all sit in the single UPDATE
 * so two concurrent requests cannot both succeed and nothing is decided from a
 * stale read. The follow-up read only explains a refusal.
 */
export async function cancelUserReservation(
  userId: string,
  reservationId: string,
): Promise<CancelResult> {
  const boundary = cancellationBoundary();

  const updated = await db
    .update(reservations)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.userId, userId),
        eq(reservations.status, "confirmed"),
        or(
          gt(reservations.reservationDate, boundary.date),
          and(
            eq(reservations.reservationDate, boundary.date),
            gt(reservations.startTime, boundary.time),
          ),
        ),
      ),
    )
    .returning({ id: reservations.id });

  if (updated.length > 0) {
    const reservation = await getUserReservation(userId, reservationId);
    if (reservation) return { ok: true, reservation };
  }

  const existing = await getUserReservation(userId, reservationId);
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  if (existing.status === "cancelled") return { ok: false, reason: "ALREADY_CANCELLED" };
  return { ok: false, reason: "NOT_CANCELLABLE" };
}
