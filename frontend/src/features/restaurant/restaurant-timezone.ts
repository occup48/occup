const DEFAULT_TIMEZONE = "Africa/Lagos";

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const configured: string | undefined = import.meta.env.VITE_RESTAURANT_TIMEZONE;

if (configured && !isValidTimeZone(configured)) {
  console.error(
    `VITE_RESTAURANT_TIMEZONE "${configured}" is not a valid IANA timezone. Falling back to ${DEFAULT_TIMEZONE}.`,
  );
}

/**
 * IANA timezone the restaurant operates in. Keep in sync with RESTAURANT_TIMEZONE
 * on the backend; both default to Africa/Lagos.
 */
export const RESTAURANT_TIMEZONE: string =
  configured && isValidTimeZone(configured) ? configured : DEFAULT_TIMEZONE;