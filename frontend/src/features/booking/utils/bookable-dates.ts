import { isFutureBookingTime, restaurantNow } from "../../restaurant/utils/booking-time.ts";
import { addDaysToDateString, parseDateString } from "./dates.ts";

/**
 * The first day a guest can still book, in restaurant time: today while at least one
 * slot is still ahead, otherwise tomorrow.
 */
export function firstBookableDate(
  now: Date,
  timeZone: string,
  slots: readonly { value: string }[],
): string {
  const today = restaurantNow(now, timeZone).date;
  const slotLeftToday = slots.some((slot) =>
    isFutureBookingTime(parseDateString(today), slot.value, now, timeZone),
  );
  return slotLeftToday ? today : addDaysToDateString(today, 1);
}
