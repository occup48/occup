import assert from "node:assert/strict";
import { test } from "node:test";
import { firstBookableDate } from "../src/features/booking/utils/bookable-dates.ts";
import { TIME_SLOTS } from "../src/features/booking/constants/time-slots.ts";

const LAGOS = "Africa/Lagos"; // UTC+1, no daylight saving
const at = (utc: string) => new Date(utc);

test("today stays bookable while a slot is still ahead", () => {
  // 12:00 UTC is 13:00 in Lagos; the last slot is 21:30.
  assert.equal(firstBookableDate(at("2026-10-08T12:00:00Z"), LAGOS, TIME_SLOTS), "2026-10-08");
});

test("today stays bookable until the last slot starts, and not a minute after", () => {
  // 20:29 UTC is 21:29 Lagos (one minute before the 21:30 slot); 20:30 UTC is 21:30.
  assert.equal(firstBookableDate(at("2026-10-08T20:29:00Z"), LAGOS, TIME_SLOTS), "2026-10-08");
  assert.equal(firstBookableDate(at("2026-10-08T20:30:00Z"), LAGOS, TIME_SLOTS), "2026-10-09");
});

test("late in the evening the first bookable day is tomorrow", () => {
  assert.equal(firstBookableDate(at("2026-10-08T21:30:00Z"), LAGOS, TIME_SLOTS), "2026-10-09");
});

test("early morning, before opening, today is still bookable", () => {
  assert.equal(firstBookableDate(at("2026-10-08T05:00:00Z"), LAGOS, TIME_SLOTS), "2026-10-08");
});

test("the restaurant's day decides, not the visitor's", () => {
  // 20:00 UTC on Oct 8 is already 10:00 on Oct 9 in Kiritimati (UTC+14), so Oct 9 still has slots.
  assert.equal(firstBookableDate(at("2026-10-08T20:00:00Z"), "Pacific/Kiritimati", TIME_SLOTS), "2026-10-09");
});

test("month ends roll over correctly", () => {
  assert.equal(firstBookableDate(at("2026-10-31T22:00:00Z"), LAGOS, TIME_SLOTS), "2026-11-01");
});

test("no slots at all means tomorrow", () => {
  assert.equal(firstBookableDate(at("2026-10-08T12:00:00Z"), LAGOS, []), "2026-10-09");
});
