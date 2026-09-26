import assert from "node:assert/strict";
import { test } from "node:test";
import { isFutureBookingTime } from "../src/features/restaurant/utils/booking-time.ts";

const today = new Date(2026, 8, 26);
const afternoon = new Date(2026, 8, 26, 19, 45);

test("today's elapsed slots are unavailable", () => {
  assert.equal(isFutureBookingTime(today, "12:00", afternoon), false);
  assert.equal(isFutureBookingTime(today, "19:30", afternoon), false);
});

test("today's remaining slots are available", () => {
  assert.equal(isFutureBookingTime(today, "20:00", afternoon), true);
  assert.equal(isFutureBookingTime(today, "21:30", afternoon), true);
});

test("a slot expires at its starting minute, including seconds", () => {
  assert.equal(isFutureBookingTime(today, "20:00", new Date(2026, 8, 26, 19, 59, 59)), true);
  assert.equal(isFutureBookingTime(today, "20:00", new Date(2026, 8, 26, 20, 0)), false);
  assert.equal(isFutureBookingTime(today, "20:00", new Date(2026, 8, 26, 20, 0, 30)), false);
});

test("future dates retain earlier time slots", () => {
  assert.equal(isFutureBookingTime(new Date(2026, 8, 27), "12:00", afternoon), true);
});

test("past dates remain invalid even when their time is later", () => {
  assert.equal(isFutureBookingTime(new Date(2026, 8, 25), "21:30", afternoon), false);
});

test("no slots remain once the last service time has started", () => {
  const lastSlot = new Date(2026, 8, 26, 21, 30);
  assert.equal(isFutureBookingTime(today, "21:00", lastSlot), false);
  assert.equal(isFutureBookingTime(today, "21:30", lastSlot), false);
});

test("validation catches a previously valid slot after the clock advances", () => {
  assert.equal(isFutureBookingTime(today, "20:00", afternoon), true);
  assert.equal(isFutureBookingTime(today, "20:00", new Date(2026, 8, 27)), false);
});

test("an empty selection is unavailable", () => {
  assert.equal(isFutureBookingTime(today, "", afternoon), false);
});
