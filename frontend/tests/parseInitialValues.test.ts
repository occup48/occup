import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInitialValues } from "../src/features/booking/utils/parseInitialValues.ts";

const today = "2026-10-01";
const parse = (query: string) => parseInitialValues(new URLSearchParams(query), today);

test("valid params fill all three fields", () => {
  assert.deepEqual(parse("date=2026-10-05&time=19:30&guests=4"), {
    date: "2026-10-05",
    time: "19:30",
    partySize: 4,
  });
});

test("missing params give no values", () => {
  assert.deepEqual(parse(""), { date: undefined, time: undefined, partySize: undefined });
});

test("garbage params are ignored", () => {
  assert.deepEqual(parse("date=garbage&time=7pm&guests=abc"), {
    date: undefined,
    time: undefined,
    partySize: undefined,
  });
});

test("a past date is ignored while the other fields are kept", () => {
  const result = parse("date=2020-01-01&time=19:30&guests=4");
  assert.equal(result.date, undefined);
  assert.equal(result.time, "19:30");
  assert.equal(result.partySize, 4);
});

test("today's date is kept and yesterday's is not", () => {
  assert.equal(parse("date=2026-10-01").date, "2026-10-01");
  assert.equal(parse("date=2026-09-30").date, undefined);
});

test("party size must be a whole number from 1 to 20", () => {
  assert.equal(parse("guests=0").partySize, undefined);
  assert.equal(parse("guests=1").partySize, 1);
  assert.equal(parse("guests=20").partySize, 20);
  assert.equal(parse("guests=21").partySize, undefined);
  assert.equal(parse("guests=2.5").partySize, undefined);
});