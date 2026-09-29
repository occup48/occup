import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { drizzle, type RemoteCallback } from "drizzle-orm/pg-proxy";
import type { Request, Response } from "express";
import { LoginTicket, OAuth2Client, type TokenPayload } from "google-auth-library";

let executeQuery: RemoteCallback = async () => { throw new Error("Unexpected query"); };
mock.module(new URL("../src/db/index.ts", import.meta.url).href, {
  exports: { db: drizzle((...args) => executeQuery(...args)) },
});
const generateAccessToken = mock.fn(() => "test-access-token");
mock.module(new URL("../src/utils/jwt.ts", import.meta.url).href, {
  exports: { generateAccessToken },
});
const { googleAuth } = await import("../src/controllers/auth.controller.js");

let payload: TokenPayload;
let insertedProfiles: unknown[][];
const timestamp = "2026-01-01T00:00:00.000Z";

beforeEach((t) => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = "test-client";
  t.after(() => {
    if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousClientId;
  });
  payload = {
    iss: "https://accounts.google.com",
    aud: "test-client",
    sub: "test-google-sub",
    email: "person@example.com",
    email_verified: true,
    given_name: "Test",
    family_name: "User",
    iat: 1,
    exp: 2,
  };
  t.mock.method(OAuth2Client.prototype, "verifyIdToken", async () => new LoginTicket("test-header", payload));
  generateAccessToken.mock.resetCalls();
  insertedProfiles = [];
  // Use real Drizzle SQL and model the existing varchar(100) insertion limits.
  executeQuery = async (sql, params) => {
    if (sql.startsWith("select")) return { rows: [] };
    assert.ok(sql.startsWith("insert"));
    insertedProfiles.push(params);
    const [firstName, lastName, email, googleSub] = params;
    if ([firstName, lastName, email].some((value) => [...value].length > 100)) {
      throw Object.assign(new Error("value too long for type character varying(100)"), { code: "22001" });
    }
    return { rows: [["new-user-id", firstName, lastName, email, null, googleSub, "customer", timestamp, timestamp]] };
  };
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

const longName = "a".repeat(101);
const longEmail = `${"a".repeat(61)}@${"b".repeat(35)}.com`;
const oversizedProfiles = [
  { name: "given name", claims: { given_name: longName }, field: "firstName", message: "First name must not exceed 100 characters" },
  { name: "family name", claims: { family_name: longName }, field: "lastName", message: "Last name must not exceed 100 characters" },
  { name: "email", claims: { email: longEmail }, field: "email", message: "Email must not exceed 100 characters" },
  { name: "fallback first name", claims: { given_name: "", name: `${longName} User` }, field: "firstName", message: "First name must not exceed 100 characters" },
  { name: "fallback last name", claims: { family_name: "", name: `Test ${longName}` }, field: "lastName", message: "Last name must not exceed 100 characters" },
];

for (const { name, claims, field, message } of oversizedProfiles) {
  test(`an oversized Google ${name} returns 400 before inserting`, async (t) => {
    const logError = t.mock.method(console, "error", () => {});
    Object.assign(payload, claims);

    const result = await authenticate();

    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
    assert.equal(result.body.message, "Invalid Google profile");
    assert.deepEqual(result.body.errors.properties[field].errors, [message]);
    assert.equal(insertedProfiles.length, 0);
    assert.equal(generateAccessToken.mock.callCount(), 0);
    assert.equal(logError.mock.callCount(), 0);
  });
}

test("Google profile fields at the 100-character limit are preserved", async () => {
  const firstName = "\u00e9".repeat(100);
  const lastName = "b".repeat(100);
  const email = `${"A".repeat(60)}@${"b".repeat(35)}.com`;
  payload.given_name = ` ${firstName} `;
  payload.family_name = ` ${lastName} `;
  payload.email = email;

  const result = await authenticate();

  assert.equal(result.status, 200);
  assert.deepEqual(insertedProfiles, [[firstName, lastName, email.toLowerCase(), payload.sub]]);
  assert.equal(result.body.data.user.firstName, firstName);
  assert.equal(result.body.data.user.lastName, lastName);
  assert.equal(result.body.data.user.email, email.toLowerCase());
  assert.equal(generateAccessToken.mock.callCount(), 1);
});

test("single-character Google names remain supported", async () => {
  payload.given_name = "A";
  payload.family_name = "B";
  const result = await authenticate();
  assert.equal(result.status, 200);
  assert.equal(result.body.data.user.firstName, "A");
  assert.equal(result.body.data.user.lastName, "B");
});

test("an existing Google subject still authenticates with an oversized current profile", async () => {
  payload.given_name = longName;
  payload.family_name = longName;
  payload.email = longEmail;
  executeQuery = async (sql) => {
    assert.ok(sql.startsWith("select"));
    return { rows: [["existing-user-id", "Stored", "Name", "stored@example.com", null, payload.sub, "customer", timestamp, timestamp]] };
  };

  const result = await authenticate();

  assert.equal(result.status, 200);
  assert.equal(result.body.data.user.id, "existing-user-id");
  assert.equal(result.body.data.user.email, "stored@example.com");
  assert.equal(insertedProfiles.length, 0);
  assert.equal(generateAccessToken.mock.callCount(), 1);
});
