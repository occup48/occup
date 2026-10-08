import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import express from "express";
import { drizzle } from "drizzle-orm/pglite";

// Real SQL against an in-memory Postgres built from the repo's own migrations,
// so the cancel rules and the overlap constraint are exercised for real.
const pg = new PGlite({ extensions: { btree_gist } });
const db = drizzle(pg);
mock.module(new URL("../src/db/index.ts", import.meta.url).href, { exports: { db } });

process.env.JWT_SECRET = "test-secret";
process.env.RESTAURANT_TIMEZONE = "Africa/Lagos"; // UTC+1, no DST
delete process.env.CANCELLATION_CUTOFF_MINUTES;

const { default: reservationsRouter } = await import("../src/routes/reservations.routes.js");
const { generateAccessToken } = await import("../src/utils/jwt.js");

// 2026-10-08 12:00 UTC is 13:00 in Lagos.
const NOW = new Date("2026-10-08T12:00:00Z");

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";
const TABLE_1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TABLE_2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

let server: Server;
let baseUrl = "";

const tokenFor = (userId: string) => generateAccessToken({ userId, role: "customer" });

async function call(method: string, path: string, userId?: string) {
  const response = await fetch(`${baseUrl}/api/reservations${path}`, {
    method,
    headers: userId ? { Authorization: `Bearer ${tokenFor(userId)}` } : {},
  });
  return { status: response.status, body: (await response.json()) as Record<string, any> };
}

async function seed(
  userId: string,
  date: string,
  start: string,
  end: string,
  extra: { status?: string; tableId?: string; id?: string; requests?: string } = {},
) {
  const rows = await pg.query<{ id: string }>(
    `insert into reservations
       (id, user_id, table_id, reservation_date, start_time, end_time, party_size, status, special_requests)
     values (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, 2, $7::reservation_status, $8)
     returning id`,
    [extra.id ?? null, userId, extra.tableId ?? TABLE_1, date, start, end, extra.status ?? "confirmed", extra.requests ?? null],
  );
  return rows.rows[0]!.id;
}

const statusInDb = async (id: string) =>
  (await pg.query<{ status: string }>("select status from reservations where id = $1", [id])).rows[0]
    ?.status;

before(async () => {
  const dir = new URL("../drizzle/", import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(new URL(file, dir), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await pg.exec(statement);
    }
  }
  await pg.exec(`
    insert into users (id, first_name, last_name, email) values
      ('${ALICE}', 'Alice', 'A', 'alice@example.com'),
      ('${BOB}', 'Bob', 'B', 'bob@example.com');
    insert into tables (id, table_number, capacity, location) values
      ('${TABLE_1}', 'T1', 4, 'Window'),
      ('${TABLE_2}', 'T2', 2, null);
  `);

  const app = express();
  app.use(express.json());
  app.use("/api/reservations", reservationsRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pg.close();
});

beforeEach(() => {
  mock.timers.enable({ apis: ["Date"], now: NOW });
});

afterEach(async () => {
  mock.timers.reset();
  delete process.env.CANCELLATION_CUTOFF_MINUTES;
  process.env.RESTAURANT_TIMEZONE = "Africa/Lagos";
  await pg.exec("delete from reservations");
});

describe("authentication", () => {
  for (const [method, path] of [["GET", ""], ["GET", "/" + ALICE], ["PATCH", `/${ALICE}/cancel`]] as const) {
    test(`${method} /api/reservations${path} needs a token`, async () => {
      const { status, body } = await call(method, path);
      assert.equal(status, 401);
      assert.equal(body.success, false);
    });
  }
});

describe("GET /api/reservations", () => {
  test("returns only the signed-in guest's reservations, newest first, with table and canCancel", async () => {
    const future = await seed(ALICE, "2026-10-20", "19:00", "20:30", { requests: "Window please" });
    const later = await seed(ALICE, "2026-10-20", "12:00", "13:30", { tableId: TABLE_2 });
    const past = await seed(ALICE, "2026-10-01", "19:00", "20:30");
    await seed(BOB, "2026-10-21", "19:00", "20:30");

    const { status, body } = await call("GET", "", ALICE);

    assert.equal(status, 200);
    assert.equal(body.success, true);
    const list = body.data.reservations as Record<string, any>[];
    assert.deepEqual(list.map((r) => r.id), [future, later, past]);

    assert.equal(list[0]!.startTime, "19:00");
    assert.equal(list[0]!.endTime, "20:30");
    assert.equal(list[0]!.specialRequests, "Window please");
    assert.deepEqual(
      { ...list[0]!.table, id: undefined },
      { id: undefined, tableNumber: "T1", location: "Window", capacity: 4 },
    );
    assert.equal(list[1]!.table.location, null);
    assert.deepEqual(list.map((r) => r.canCancel), [true, true, false]);
  });

  test("returns an empty list for a guest with no reservations", async () => {
    await seed(BOB, "2026-10-21", "19:00", "20:30");
    const { status, body } = await call("GET", "", ALICE);
    assert.equal(status, 200);
    assert.deepEqual(body.data.reservations, []);
  });

  test("cancelled and completed reservations are listed but cannot be cancelled", async () => {
    await seed(ALICE, "2026-10-20", "19:00", "20:30", { status: "cancelled" });
    await seed(ALICE, "2026-10-21", "19:00", "20:30", { status: "completed" });
    const { body } = await call("GET", "", ALICE);
    assert.deepEqual(
      body.data.reservations.map((r: any) => [r.status, r.canCancel]).sort(),
      [["cancelled", false], ["completed", false]],
    );
  });
});

describe("GET /api/reservations/:id", () => {
  test("returns the guest's own reservation", async () => {
    const id = await seed(ALICE, "2026-10-20", "19:00", "20:30");
    const { status, body } = await call("GET", `/${id}`, ALICE);
    assert.equal(status, 200);
    assert.equal(body.data.reservation.id, id);
    assert.equal(body.data.reservation.table.tableNumber, "T1");
    assert.equal(body.data.reservation.canCancel, true);
  });

  test("someone else's reservation is 404, the same as one that does not exist", async () => {
    const id = await seed(BOB, "2026-10-20", "19:00", "20:30");
    const theirs = await call("GET", `/${id}`, ALICE);
    const missing = await call("GET", "/cccccccc-cccc-4ccc-8ccc-cccccccccccc", ALICE);
    assert.equal(theirs.status, 404);
    assert.deepEqual(theirs.body, missing.body);
  });

  test("a malformed id is 400", async () => {
    const { status } = await call("GET", "/not-a-uuid", ALICE);
    assert.equal(status, 400);
  });
});

describe("PATCH /api/reservations/:id/cancel", () => {
  test("cancels the guest's own future reservation and keeps the row", async () => {
    const id = await seed(ALICE, "2026-10-20", "19:00", "20:30");
    const before = (await pg.query<{ updated_at: Date }>("select updated_at from reservations where id=$1", [id])).rows[0]!;

    const { status, body } = await call("PATCH", `/${id}/cancel`, ALICE);

    assert.equal(status, 200);
    assert.equal(body.data.reservation.status, "cancelled");
    assert.equal(body.data.reservation.canCancel, false);
    assert.equal(await statusInDb(id), "cancelled");
    const after = (await pg.query<{ updated_at: Date }>("select updated_at from reservations where id=$1", [id])).rows[0]!;
    assert.ok(after.updated_at.getTime() >= before.updated_at.getTime());
    assert.equal(new Date(body.data.reservation.updatedAt).getTime(), NOW.getTime());
  });

  test("cancelling twice is a 409 ALREADY_CANCELLED", async () => {
    const id = await seed(ALICE, "2026-10-20", "19:00", "20:30");
    assert.equal((await call("PATCH", `/${id}/cancel`, ALICE)).status, 200);
    const again = await call("PATCH", `/${id}/cancel`, ALICE);
    assert.equal(again.status, 409);
    assert.equal(again.body.code, "ALREADY_CANCELLED");
  });

  test("two simultaneous cancels: exactly one succeeds", async () => {
    const id = await seed(ALICE, "2026-10-20", "19:00", "20:30");
    const results = await Promise.all([
      call("PATCH", `/${id}/cancel`, ALICE),
      call("PATCH", `/${id}/cancel`, ALICE),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  });

  test("another guest cannot cancel it: 404 and nothing changes", async () => {
    const id = await seed(BOB, "2026-10-20", "19:00", "20:30");
    const { status } = await call("PATCH", `/${id}/cancel`, ALICE);
    assert.equal(status, 404);
    assert.equal(await statusInDb(id), "confirmed");
  });

  test("unknown id is 404 and malformed id is 400", async () => {
    assert.equal((await call("PATCH", "/cccccccc-cccc-4ccc-8ccc-cccccccccccc/cancel", ALICE)).status, 404);
    assert.equal((await call("PATCH", "/nope/cancel", ALICE)).status, 400);
  });

  test("a reservation on a past day cannot be cancelled", async () => {
    const id = await seed(ALICE, "2026-10-07", "19:00", "20:30");
    const { status, body } = await call("PATCH", `/${id}/cancel`, ALICE);
    assert.equal(status, 409);
    assert.equal(body.code, "NOT_CANCELLABLE");
    assert.equal(await statusInDb(id), "confirmed");
  });

  test("completed reservations cannot be cancelled", async () => {
    const id = await seed(ALICE, "2026-10-20", "19:00", "20:30", { status: "completed" });
    const { status, body } = await call("PATCH", `/${id}/cancel`, ALICE);
    assert.equal(status, 409);
    assert.equal(body.code, "NOT_CANCELLABLE");
    assert.equal(await statusInDb(id), "completed");
  });

  describe("today, restaurant clock (now is 13:00 in Lagos)", () => {
    test("already started: refused", async () => {
      const id = await seed(ALICE, "2026-10-08", "12:30", "14:00");
      assert.equal((await call("PATCH", `/${id}/cancel`, ALICE)).status, 409);
    });

    test("starting exactly now: refused", async () => {
      const id = await seed(ALICE, "2026-10-08", "13:00", "14:30");
      assert.equal((await call("PATCH", `/${id}/cancel`, ALICE)).status, 409);
    });

    test("starting one minute from now: allowed", async () => {
      const id = await seed(ALICE, "2026-10-08", "13:01", "14:30");
      assert.equal((await call("PATCH", `/${id}/cancel`, ALICE)).status, 200);
    });

    test("uses the restaurant timezone, not UTC", async () => {
      // 12:30 UTC is still "future" if the clock were read as UTC (12:00), but it is 13:30 vs 13:00 Lagos.
      const id = await seed(ALICE, "2026-10-08", "12:30", "14:00");
      assert.equal((await call("PATCH", `/${id}/cancel`, ALICE)).status, 409);
      process.env.RESTAURANT_TIMEZONE = "America/Los_Angeles"; // 05:00 on the same day
      assert.equal((await call("PATCH", `/${id}/cancel`, ALICE)).status, 200);
    });

    test("a timezone far ahead of UTC rolls the day over", async () => {
      process.env.RESTAURANT_TIMEZONE = "Pacific/Kiritimati"; // UTC+14: 02:00 on Oct 9
      const id = await seed(ALICE, "2026-10-08", "23:00", "23:59");
      assert.equal((await call("PATCH", `/${id}/cancel`, ALICE)).status, 409);
    });
  });

  describe("CANCELLATION_CUTOFF_MINUTES", () => {
    test("inside the cutoff: refused, and canCancel says so", async () => {
      process.env.CANCELLATION_CUTOFF_MINUTES = "60";
      const id = await seed(ALICE, "2026-10-08", "13:30", "15:00");
      assert.equal((await call("GET", `/${id}`, ALICE)).body.data.reservation.canCancel, false);
      assert.equal((await call("PATCH", `/${id}/cancel`, ALICE)).status, 409);
    });

    test("outside the cutoff: allowed", async () => {
      process.env.CANCELLATION_CUTOFF_MINUTES = "60";
      const id = await seed(ALICE, "2026-10-08", "14:30", "16:00");
      assert.equal((await call("GET", `/${id}`, ALICE)).body.data.reservation.canCancel, true);
      assert.equal((await call("PATCH", `/${id}/cancel`, ALICE)).status, 200);
    });

    test("exactly at the cutoff: refused", async () => {
      process.env.CANCELLATION_CUTOFF_MINUTES = "60";
      const id = await seed(ALICE, "2026-10-08", "14:00", "15:30");
      assert.equal((await call("PATCH", `/${id}/cancel`, ALICE)).status, 409);
    });
  });

  test("cancelling frees the table for someone else (overlap constraint)", async () => {
    const id = await seed(ALICE, "2026-10-20", "19:00", "20:30");
    await assert.rejects(seed(BOB, "2026-10-20", "19:30", "21:00"), /reservations_no_overlap/);
    assert.equal((await call("PATCH", `/${id}/cancel`, ALICE)).status, 200);
    await seed(BOB, "2026-10-20", "19:30", "21:00");
  });
});
