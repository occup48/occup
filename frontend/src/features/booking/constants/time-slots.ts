export interface TimeSlot {
  /** HH:mm in 24-hour form, as the availability API expects. */
  value: string;
  /** What the guest sees, for example "7:30 PM". */
  label: string;
}

// The same slots the homepage widget offers: every 30 minutes, 12:00 PM to 9:30 PM.
export const TIME_SLOTS: TimeSlot[] = Array.from({ length: 20 }, (_, index) => {
  const hour = 12 + Math.floor(index / 2);
  const minutes = index % 2 === 0 ? "00" : "30";
  return { value: `${hour}:${minutes}`, label: `${hour % 12 || 12}:${minutes} PM` };
});

const EVENING_STARTS_AT = "17:00";

export function groupTimeSlots(slots: TimeSlot[] = TIME_SLOTS): {
  afternoon: TimeSlot[];
  evening: TimeSlot[];
} {
  return {
    afternoon: slots.filter((slot) => slot.value < EVENING_STARTS_AT),
    evening: slots.filter((slot) => slot.value >= EVENING_STARTS_AT),
  };
}
