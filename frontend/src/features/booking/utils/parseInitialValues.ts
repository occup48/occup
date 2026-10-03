export function parseInitialValues(params: URLSearchParams, today: string) {
  const date = params.get("date");
  const time = params.get("time");
  const guests = Number(params.get("guests"));
  return {
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today ? date : undefined,
    time: time && /^\d{2}:\d{2}$/.test(time) ? time : undefined,
    partySize: Number.isInteger(guests) && guests >= 1 && guests <= 20 ? guests : undefined,
  };
}