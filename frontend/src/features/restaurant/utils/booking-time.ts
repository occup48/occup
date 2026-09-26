/** Interpret booking slots in the same local timezone as the date picker. */
export function isFutureBookingTime(date: Date, time: string, now: Date): boolean {
  const [hours, minutes] = time.split(":").map(Number);
  const slot = new Date(date);
  slot.setHours(hours, minutes, 0, 0);
  return slot.getTime() > now.getTime();
}
