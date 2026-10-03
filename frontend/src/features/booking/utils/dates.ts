const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-10-02" becomes a Date at local midnight of that calendar day. */
export function parseDateString(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** A local Date becomes "YYYY-MM-DD" for its local calendar day. */
export function toDateString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Moves a "YYYY-MM-DD" string forward (or back, with a negative count) by whole days. */
export function addDaysToDateString(value: string, days: number): string {
  const date = parseDateString(value);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/** "2026-10-02" becomes "Oct 2, 2026". Anything that is not a date string comes back unchanged. */
export function formatDisplayDate(value: string): string {
  if (!DATE_PATTERN.test(value)) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseDateString(value));
}

/** "19:30" becomes "7:30 PM". Anything that is not HH:mm comes back unchanged. */
export function formatDisplayTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? "PM" : "AM"}`;
}
