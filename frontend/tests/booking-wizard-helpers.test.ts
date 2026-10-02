import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDaysToDateString,
  formatDisplayDate,
  formatDisplayTime,
  parseDateString,
  toDateString,
} from "../src/features/booking/utils/dates.ts";
import { TIME_SLOTS, groupTimeSlots } from "../src/features/booking/constants/time-slots.ts";

test("a date string round-trips through a local Date without shifting the day", () => {
  assert.equal(toDateString(parseDateString("2026-10-03")), "2026-10-03");
  assert.equal(toDateString(parseDateString("2026-01-01")), "2026-01-01");
  assert.equal(toDateString(parseDateString("2026-12-31")), "2026-12-31");
});

test("adding days crosses month and year boundaries", () => {
  assert.equal(addDaysToDateString("2026-10-01", 1), "2026-10-02");
  assert.equal(addDaysToDateString("2026-10-31", 1), "2026-11-01");
  assert.equal(addDaysToDateString("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysToDateString("2026-03-01", -1), "2026-02-28");
});

test("dates are shown as 'Oct 2, 2026' and non-dates pass through", () => {
  assert.equal(formatDisplayDate("2026-10-02"), "Oct 2, 2026");
  assert.equal(formatDisplayDate("2099-01-15"), "Jan 15, 2099");
  assert.equal(formatDisplayDate("garbage"), "garbage");
  assert.equal(formatDisplayDate(""), "");
});

test("times are shown in 12-hour form and non-times pass through", () => {
  assert.equal(formatDisplayTime("19:30"), "7:30 PM");
  assert.equal(formatDisplayTime("12:00"), "12:00 PM");
  assert.equal(formatDisplayTime("00:15"), "12:15 AM");
  assert.equal(formatDisplayTime("09:05"), "9:05 AM");
  assert.equal(formatDisplayTime("later"), "later");
});

test("slots run every 30 minutes from 12:00 PM to 9:30 PM", () => {
  assert.equal(TIME_SLOTS.length, 20);
  assert.deepEqual(TIME_SLOTS[0], { value: "12:00", label: "12:00 PM" });
  assert.deepEqual(TIME_SLOTS[1], { value: "12:30", label: "12:30 PM" });
  assert.deepEqual(TIME_SLOTS[2], { value: "13:00", label: "1:00 PM" });
  assert.deepEqual(TIME_SLOTS[19], { value: "21:30", label: "9:30 PM" });
});

test("slot values are the HH:mm strings the availability API expects", () => {
  for (const slot of TIME_SLOTS) assert.match(slot.value, /^([01]\d|2[0-3]):[0-5]\d$/);
});

test("slots split into afternoon (before 5 PM) and evening (5 PM on)", () => {
  const { afternoon, evening } = groupTimeSlots();
  assert.equal(afternoon.length + evening.length, TIME_SLOTS.length);
  assert.equal(afternoon[0].label, "12:00 PM");
  assert.equal(afternoon[afternoon.length - 1].label, "4:30 PM");
  assert.equal(evening[0].label, "5:00 PM");
  assert.equal(evening[evening.length - 1].label, "9:30 PM");
});
