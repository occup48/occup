import { and, eq, gt, gte, lt, ne } from "drizzle-orm";

import { db } from "../db/index.js";
import { tables } from "../db/schema/tables.js";
import { reservations } from "../db/schema/reservations.js";
import { restaurantSettings } from "../db/schema/restaurant-settings.js";

interface AvailabilityParams {
  date: string;
  time: string;
  partySize: number;
}

export async function getAvailableTables({ date, time, partySize }: AvailabilityParams) {
  const [settings] = await db
    .select()
    .from(restaurantSettings)
    .where(eq(restaurantSettings.key, "default"))
    .limit(1);

  const durationMinutes = settings?.reservationDuration ?? 90;
  const openingTime = (settings?.openingTime ?? "00:00:00").slice(0, 5);
const closingTime = (settings?.closingTime ?? "23:59:59").slice(0, 5);

  const startTime = time;
  const endTime = addMinutes(time, durationMinutes);

  if (endTime === null) {
    const err: any = new Error("Reservation would extend past midnight, which isn't supported");
    err.code = "INVALID_TIME_RANGE";
    throw err;
  }

  if (startTime < openingTime || endTime > closingTime) {
    const err: any = new Error("Requested time is outside operating hours");
    err.code = "OUTSIDE_OPERATING_HOURS";
    throw err;
  }

  const candidateTables = await db
    .select()
    .from(tables)
    .where(and(eq(tables.isActive, true), gte(tables.capacity, partySize)));

  if (candidateTables.length === 0) return [];

  // Strict overlap: existing.startTime < newEndTime AND existing.endTime > newStartTime
  // (adjacent bookings that only touch at the boundary are NOT overlapping)
  const overlapping = await db
    .select({ tableId: reservations.tableId })
    .from(reservations)
    .where(
      and(
        eq(reservations.reservationDate, date),
        ne(reservations.status, "cancelled"),
        lt(reservations.startTime, endTime),
        gt(reservations.endTime, startTime),
      ),
    );

  const bookedTableIds = new Set(overlapping.map((r) => r.tableId));

  return candidateTables.filter((t) => !bookedTableIds.has(t.id));
}

/** Returns null if the result would cross midnight (unsupported). */
function addMinutes(time: string, minutes: number): string | null {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const total = h * 60 + m + minutes;
  if (total >= 24 * 60) return null;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}