import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isFutureBookingTime,
  restaurantNow,
} from "../src/features/restaurant/utils/booking-time.ts";

const LAGOS = "Africa/Lagos"; // UTC+1, no daylight saving
const today = new Date(2026, 8, 26); // the day picked in the date picker
const afternoon = new Date("2026-09-26T18:45:00Z"); // 19:45 in Lagos

test("today's elapsed slots are unavailable", () => {
  assert.equal(isFutureBookingTime(today, "12:00", afternoon, LAGOS), false);
  assert.equal(isFutureBookingTime(today, "19:30", afternoon, LAGOS), false);
});

test("today's remaining slots are available", () => {
  assert.equal(isFutureBookingTime(today, "20:00", afternoon, LAGOS), true);
  assert.equal(isFutureBookingTime(today, "21:30", afternoon, LAGOS), true);
});

test("a slot expires at its starting minute, including seconds", () => {
  assert.equal(isFutureBookingTime(today, "20:00", new Date("2026-09-26T18:59:59Z"), LAGOS), true);
  assert.equal(isFutureBookingTime(today, "20:00", new Date("2026-09-26T19:00:00Z"), LAGOS), false);
  assert.equal(isFutureBookingTime(today, "20:00", new Date("2026-09-26T19:00:30Z"), LAGOS), false);
});

test("future dates retain earlier time slots", () => {
  assert.equal(isFutureBookingTime(new Date(2026, 8, 27), "12:00", afternoon, LAGOS), true);
});

test("past dates remain invalid even when their time is later", () => {
  assert.equal(isFutureBookingTime(new Date(2026, 8, 25), "21:30", afternoon, LAGOS), false);
});

test("no slots remain once the last service time has started", () => {
  const lastSlot = new Date("2026-09-26T20:30:00Z"); // 21:30 in Lagos
  assert.equal(isFutureBookingTime(today, "21:00", lastSlot, LAGOS), false);
  assert.equal(isFutureBookingTime(today, "21:30", lastSlot, LAGOS), false);
});

test("validation catches a previously valid slot after the clock advances", () => {
  assert.equal(isFutureBookingTime(today, "20:00", afternoon, LAGOS), true);
  assert.equal(isFutureBookingTime(today, "20:00", new Date("2026-09-26T23:00:00Z"), LAGOS), false);
});

test("an empty selection is unavailable", () => {
  assert.equal(isFutureBookingTime(today, "", afternoon, LAGOS), false);
  assert.equal(isFutureBookingTime(new Date(2026, 8, 27), "", afternoon, LAGOS), false);
});

test("slots are judged in the restaurant timezone, not the visitor's", () => {
  // 11:30 UTC is already 12:30 in Lagos, so the 12:00 slot has passed there.
  const instant = new Date("2026-09-26T11:30:00Z");
  assert.equal(isFutureBookingTime(today, "12:00", instant, LAGOS), false);
  assert.equal(isFutureBookingTime(today, "12:00", instant, "UTC"), true);
});

test("the restaurant date and time follow Africa/Lagos, not UTC", () => {
  // 23:30 UTC on Oct 1 is already 00:30 on Oct 2 in Lagos.
  assert.deepEqual(restaurantNow(new Date("2026-10-01T23:30:00Z"), LAGOS), {
    date: "2026-10-02",
    time: "00:30",
  });
  assert.deepEqual(restaurantNow(new Date("2026-10-01T22:59:00Z"), LAGOS), {
    date: "2026-10-01",
    time: "23:59",
  });
});