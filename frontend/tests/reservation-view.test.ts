import assert from "node:assert/strict";
import { test } from "node:test";
import type { CustomerReservation } from "../src/features/reservations/types/reservations.ts";
import {
  describeTable,
  displayStatus,
  formatLongDate,
  isUpcoming,
  referenceCode,
  splitReservations,
} from "../src/features/reservations/utils/reservation-view.ts";

const LAGOS = "Africa/Lagos"; // UTC+1, no daylight saving
// 12:00 UTC on 2026-10-08 is 13:00 in Lagos.
const NOW = new Date("2026-10-08T12:00:00Z");

function reservation(overrides: Partial<CustomerReservation> = {}): CustomerReservation {
  return {
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    reservationDate: "2026-10-20",
    startTime: "19:00",
    endTime: "20:30",
    partySize: 2,
    status: "confirmed",
    specialRequests: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    table: { id: "t1", tableNumber: "T01", location: "Window", capacity: 4 },
    canCancel: true,
    ...overrides,
  };
}

test("a confirmed reservation is upcoming until its end time passes, on the restaurant clock", () => {
  const today = (start: string, end: string) =>
    reservation({ reservationDate: "2026-10-08", startTime: start, endTime: end });
  assert.equal(isUpcoming(today("14:00", "15:30"), NOW, LAGOS), true); // later today
  assert.equal(isUpcoming(today("12:00", "13:30"), NOW, LAGOS), true); // under way
  assert.equal(isUpcoming(today("11:00", "13:00"), NOW, LAGOS), false); // ended exactly now
  assert.equal(isUpcoming(today("11:00", "12:59"), NOW, LAGOS), false);
  assert.equal(isUpcoming(reservation({ reservationDate: "2026-10-07" }), NOW, LAGOS), false);
  assert.equal(isUpcoming(reservation({ reservationDate: "2026-10-09", startTime: "00:30", endTime: "02:00" }), NOW, LAGOS), true);
});

test("the restaurant timezone, not the visitor's, decides what is past", () => {
  const evening = reservation({ reservationDate: "2026-10-08", startTime: "20:00", endTime: "21:30" });
  assert.equal(isUpcoming(evening, NOW, LAGOS), true); // 13:00 in Lagos
  // 12:00 UTC is already 02:00 on Oct 9 in Kiritimati (UTC+14).
  assert.equal(isUpcoming(evening, NOW, "Pacific/Kiritimati"), false);
});

test("cancelled and completed reservations are never upcoming", () => {
  assert.equal(isUpcoming(reservation({ status: "cancelled" }), NOW, LAGOS), false);
  assert.equal(isUpcoming(reservation({ status: "completed" }), NOW, LAGOS), false);
});

test("split puts upcoming soonest first and past most recent first", () => {
  const later = reservation({ id: "later", reservationDate: "2026-10-30" });
  const sooner = reservation({ id: "sooner", reservationDate: "2026-10-10", startTime: "12:00", endTime: "13:30" });
  const sameDayLate = reservation({ id: "sameDayLate", reservationDate: "2026-10-10", startTime: "18:00", endTime: "19:30" });
  const old = reservation({ id: "old", reservationDate: "2026-09-01" });
  const cancelled = reservation({ id: "cancelled", reservationDate: "2026-10-25", status: "cancelled" });
  const older = reservation({ id: "older", reservationDate: "2026-08-01", status: "completed" });

  const { upcoming, past } = splitReservations([later, old, cancelled, sameDayLate, older, sooner], NOW, LAGOS);

  assert.deepEqual(upcoming.map((r) => r.id), ["sooner", "sameDayLate", "later"]);
  assert.deepEqual(past.map((r) => r.id), ["cancelled", "old", "older"]);
});

test("split does not change the list it is given", () => {
  const list = [reservation({ id: "b", reservationDate: "2026-11-01" }), reservation({ id: "a", reservationDate: "2026-10-12" })];
  splitReservations(list, NOW, LAGOS);
  assert.deepEqual(list.map((r) => r.id), ["b", "a"]);
});

test("labels: confirmed, in progress, completed (including old confirmed ones) and cancelled", () => {
  const today = (start: string, end: string) =>
    reservation({ reservationDate: "2026-10-08", startTime: start, endTime: end });
  assert.deepEqual(displayStatus(reservation(), NOW, LAGOS), { label: "Confirmed", tone: "confirmed" });
  assert.deepEqual(displayStatus(today("12:00", "13:30"), NOW, LAGOS), { label: "In progress", tone: "in-progress" });
  assert.deepEqual(displayStatus(today("13:00", "14:30"), NOW, LAGOS), { label: "In progress", tone: "in-progress" });
  assert.deepEqual(displayStatus(today("13:01", "14:30"), NOW, LAGOS), { label: "Confirmed", tone: "confirmed" });
  assert.deepEqual(displayStatus(reservation({ reservationDate: "2026-09-01" }), NOW, LAGOS), { label: "Completed", tone: "completed" });
  assert.deepEqual(displayStatus(reservation({ status: "completed" }), NOW, LAGOS), { label: "Completed", tone: "completed" });
  assert.deepEqual(displayStatus(reservation({ status: "cancelled" }), NOW, LAGOS), { label: "Cancelled", tone: "cancelled" });
});

test("long dates keep the calendar day and pass odd input through", () => {
  assert.equal(formatLongDate("2026-10-20"), "Tue, Oct 20, 2026");
  assert.equal(formatLongDate("2026-01-01"), "Thu, Jan 1, 2026");
  assert.equal(formatLongDate("tomorrow"), "tomorrow");
});

test("tables read naturally with or without a location, or when missing", () => {
  assert.equal(describeTable(reservation()), "Table T01 · Window");
  assert.equal(
    describeTable(reservation({ table: { id: "t2", tableNumber: "T02", location: null, capacity: 2 } })),
    "Table T02",
  );
  assert.equal(describeTable(reservation({ table: null })), "Table assigned by the restaurant");
});

test("the reference code is the first 8 characters, uppercased", () => {
  assert.equal(referenceCode("0f8fad5b-d9cb-469f-a165-70867728950e"), "0F8FAD5B");
});
