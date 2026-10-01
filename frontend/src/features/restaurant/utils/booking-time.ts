/**
 * Booking slots are wall-clock times in the restaurant's timezone, so "has this
 * slot passed?" is answered there, not in the visitor's browser timezone.
 */
export function restaurantNow(now: Date, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/**
 * `date` is the day chosen in the picker (a local Date) and `time` is "HH:mm"
 * restaurant time. A slot expires at its starting minute.
 */
export function isFutureBookingTime(
  date: Date,
  time: string,
  now: Date,
  timeZone: string,
): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const current = restaurantNow(now, timeZone);
  if (day !== current.date) return day > current.date;
  return time > current.time;
}