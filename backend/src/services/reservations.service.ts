import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { reservations } from "../db/schema/reservations.js";
import { restaurantSettings } from "../db/schema/restaurant-settings.js";
import { getAvailableTables } from "./availability.service.js";

interface CreateReservationParams {
  tableId: string;
  reservationDate: string;
  startTime: string;
  partySize: number;
  specialRequests?: string;
  userId: string;
}

export async function createReservation(params: CreateReservationParams) {
  const [settings] = await db
    .select()
    .from(restaurantSettings)
    .where(eq(restaurantSettings.key, "default"))
    .limit(1);

  const durationMinutes = settings?.reservationDuration ?? 90;
  const endTime = addMinutes(params.startTime, durationMinutes);

  const stillAvailable = await getAvailableTables({
    date: params.reservationDate,
    time: params.startTime,
    partySize: params.partySize,
  });

  if (!stillAvailable.some((t) => t.id === params.tableId)) {
    const err: any = new Error("Table unavailable");
    err.code = "TABLE_UNAVAILABLE";
    throw err;
  }

  try {
    const [created] = await db
      .insert(reservations)
      .values({
        tableId: params.tableId,
        userId: params.userId,
        reservationDate: params.reservationDate,
        startTime: params.startTime,
        endTime,
        partySize: params.partySize,
        specialRequests: params.specialRequests ?? null,
        status: "confirmed",
      })
      .returning();

    return created;
  } catch (error: any) {
    if (error?.code === "23P01") {
      const conflictErr: any = new Error("Table booked in the meantime");
      conflictErr.code = "TABLE_UNAVAILABLE";
      throw conflictErr;
    }
    throw error;
  }
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