// Read at call time, not import time: index.ts loads .env.local after its imports run.
export const restaurantTimezone = (): string =>
  process.env.RESTAURANT_TIMEZONE ?? "Africa/Lagos";

/** Minutes before a reservation starts after which it can no longer be cancelled. 0 = until it starts. */
export const cancellationCutoffMinutes = (): number => {
  const raw = Number(process.env.CANCELLATION_CUTOFF_MINUTES);
  return Number.isInteger(raw) && raw > 0 ? raw : 0;
};

export interface WallClock {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

/** The given instant as a date and time on the restaurant's wall clock. */
export function restaurantWallClock(at: Date = new Date()): WallClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: restaurantTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);

  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

/**
 * The wall-clock moment a reservation must start AFTER to still be cancellable:
 * now, plus the cancellation cutoff, on the restaurant's clock.
 */
export function cancellationBoundary(now: Date = new Date()): WallClock {
  return restaurantWallClock(new Date(now.getTime() + cancellationCutoffMinutes() * 60_000));
}

export function canCancelReservation(
  reservation: { status: string; reservationDate: string; startTime: string },
  now: Date = new Date(),
): boolean {
  if (reservation.status !== "confirmed") return false;
  const boundary = cancellationBoundary(now);
  return (
    `${reservation.reservationDate} ${reservation.startTime.slice(0, 5)}` >
    `${boundary.date} ${boundary.time}`
  );
}
