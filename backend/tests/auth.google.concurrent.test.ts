import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { drizzle, type RemoteCallback } from "drizzle-orm/pg-proxy";
import type { Request, Response } from "express";
import { LoginTicket, OAuth2Client } from "google-auth-library";

// Exercise real Drizzle SQL with controlled database responses and interleavings.
let executeQuery: RemoteCallback = async () => { throw new Error("Unexpected query"); };
mock.module(new URL("../src/db/index.ts", import.meta.url).href, {
  exports: { db: drizzle((...args) => executeQuery(...args)) },
});
const generateAccessToken = mock.fn(() => "test-access-token");
mock.module(new URL("../src/utils/jwt.ts", import.meta.url).href, {
  exports: { generateAccessToken },
});
const { googleAuth } = await import("../src/controllers/auth.controller.js");

const googleSub = "test-google-sub";
const email = "person@example.com";
const timestamp = "2026-01-01T00:00:00.000Z";
const userRow = ["google-user-id", "Test", "User", email, null, googleSub, "customer", timestamp, timestamp];
const ignoreConflict = /on conflict\s+do nothing/i;
const serverError = {
  status: 500,
  body: { success: false, message: "Unable to authenticate with Google" },
};

beforeEach((t) => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = "test-client";
  t.after(() => {
    if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousClientId;
  });
  t.mock.method(OAuth2Client.prototype, "verifyIdToken", async () => new LoginTicket("test-header", {
    iss: "https://accounts.google.com",
    aud: "test-client",
    sub: googleSub,
    email: "Person@Example.com",
    email_verified: true,
    given_name: "Test",
    family_name: "User",
    iat: 1,
    exp: 2,
  }));
  executeQuery = async () => { throw new Error("Unexpected query"); };
  generateAccessToken.mock.resetCalls();
});

async function authenticate() {
  let status = 200;
  let body: Record<string, any> = {};
  const response = {
    status(code: number) { status = code; return this; },
    json(value: Record<string, any>) { body = value; return this; },
  };
  await googleAuth({ body: { credential: "test-credential" } } as Request, response as Response);
  return { status, body };
}

function conflictingInsert(sql: string, constraint: string) {
  assert.ok(sql.startsWith("insert"));
  if (ignoreConflict.test(sql)) return { rows: [] };
  throw Object.assign(new Error("duplicate account"), { code: "23505", constraint });
}

test("concurrent first-time Google logins both authenticate the single created account", { timeout: 10000 }, async (t) => {
  const logError = t.mock.method(console, "error", () => {});
  let selects = 0;
  let inserts = 0;
  let createdAccounts = 0;
  let releaseLookups!: () => void;
  const bothLookedUp = new Promise<void>((resolve) => { releaseLookups = resolve; });
  executeQuery = async (sql, params) => {
    if (sql.startsWith("select")) {
      assert.ok(params.includes(googleSub));
      if (++selects <= 2) {
        if (selects === 2) releaseLookups();
        await bothLookedUp;
        return { rows: [] };
      }
      assert.equal(createdAccounts, 1);
      return { rows: [userRow] };
    }
    assert.ok(sql.startsWith("insert"));
    assert.ok(params.includes(email));
    assert.ok(params.includes(googleSub));
    if (++inserts === 1) {
      createdAccounts++;
      return { rows: [userRow] };
    }
    return conflictingInsert(sql, "users_google_sub_unique");
  };

  const results = await Promise.all([authenticate(), authenticate()]);

  assert.deepEqual(results.map((result) => result.status), [200, 200]);
  for (const result of results) {
    assert.equal(result.body.data.user.id, userRow[0]);
    assert.equal(result.body.data.accessToken, "test-access-token");
    assert.equal("passwordHash" in result.body.data.user, false);
  }
  assert.equal(createdAccounts, 1);
  assert.equal(inserts, 2);
  assert.equal(selects, 3);
  assert.deepEqual(generateAccessToken.mock.calls.map((call) => call.arguments), [
    [{ userId: userRow[0], role: "customer" }],
    [{ userId: userRow[0], role: "customer" }],
  ]);
  assert.equal(logError.mock.callCount(), 0);
});

for (const otherSubject of [null, "another-google-sub"]) {
  test(`an email claimed during Google signup returns 409 without linking accounts (subject: ${otherSubject})`, async (t) => {
    t.mock.method(console, "error", () => {});
    let selects = 0;
    const otherRow = [...userRow];
    otherRow[0] = "other-user-id";
    otherRow[5] = otherSubject;
    executeQuery = async (sql) => {
      if (sql.startsWith("select")) return { rows: ++selects === 1 ? [] : [otherRow] };
      return conflictingInsert(sql, "users_email_unique");
    };

    assert.deepEqual(await authenticate(), {
      status: 409,
      body: {
        success: false,
        message: "An account with this email already exists. Sign in with your password first.",
      },
    });
    assert.equal(generateAccessToken.mock.callCount(), 0);
  });
}

test("conflict recovery prioritizes the Google subject over another account's email", async () => {
  let selects = 0;
  const subjectRow = [...userRow];
  subjectRow[3] = "previous@example.com";
  const emailRow = [...userRow];
  emailRow[0] = "email-owner-id";
  emailRow[5] = null;
  executeQuery = async (sql) => {
    if (sql.startsWith("select")) return { rows: ++selects === 1 ? [] : [emailRow, subjectRow] };
    return conflictingInsert(sql, "users_google_sub_unique");
  };

  const result = await authenticate();
  assert.equal(result.status, 200);
  assert.equal(result.body.data.user.id, subjectRow[0]);
  assert.equal(result.body.data.user.email, subjectRow[3]);
  assert.deepEqual(generateAccessToken.mock.calls[0]!.arguments, [
    { userId: subjectRow[0], role: "customer" },
  ]);
});

test("unrelated insert failures remain server errors", async (t) => {
  t.mock.method(console, "error", () => {});
  executeQuery = async (sql) => {
    if (sql.startsWith("select")) return { rows: [] };
    throw new Error("Database unavailable");
  };
  assert.deepEqual(await authenticate(), serverError);
  assert.equal(generateAccessToken.mock.callCount(), 0);
});

test("a conflict without a matching account remains a server error", async (t) => {
  t.mock.method(console, "error", () => {});
  executeQuery = async (sql) => {
    if (sql.startsWith("select")) return { rows: [] };
    return conflictingInsert(sql, "users_pkey");
  };
  assert.deepEqual(await authenticate(), serverError);
  assert.equal(generateAccessToken.mock.callCount(), 0);
});
