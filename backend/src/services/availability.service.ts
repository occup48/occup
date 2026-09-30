import { and, eq, gte, lte, ne } from "drizzle-orm";

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
  const startTime = time;
  const endTime = addMinutes(time, durationMinutes);

  const candidateTables = await db
    .select()
    .from(tables)
    .where(and(eq(tables.isActive, true), gte(tables.capacity, partySize)));

  if (candidateTables.length === 0) return [];

  const overlapping = await db
    .select({ tableId: reservations.tableId })
    .from(reservations)
    .where(
      and(
        eq(reservations.reservationDate, date),
        ne(reservations.status, "cancelled"),
        lte(reservations.startTime, endTime),
        gte(reservations.endTime, startTime),
      ),
    );

  const bookedTableIds = new Set(overlapping.map((r) => r.tableId));

  return candidateTables.filter((t) => !bookedTableIds.has(t.id));
}

function addMinutes(time: string, minutes: number): string {
 const [hStr, mStr] = time.split(":");
const h = Number(hStr);
const m = Number(mStr);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}