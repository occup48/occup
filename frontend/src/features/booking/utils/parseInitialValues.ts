const RESTAURANT_TIMEZONE = "Africa/Lagos";

export function todayInRestaurantTimezone(now: Date = new Date()): string {
  // The en-CA locale formats dates as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: RESTAURANT_TIMEZONE }).format(now);
}

export function parseInitialValues(
  params: URLSearchParams,
  today: string = todayInRestaurantTimezone(),
) {
  const date = params.get("date");
  const time = params.get("time");
  const guests = Number(params.get("guests"));
  return {
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today ? date : undefined,
    time: time && /^\d{2}:\d{2}$/.test(time) ? time : undefined,
    partySize: Number.isInteger(guests) && guests >= 1 && guests <= 20 ? guests : undefined,
  };
}