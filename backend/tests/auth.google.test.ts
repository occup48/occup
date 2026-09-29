import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { beforeEach, mock, test } from "node:test";
import type { Request, Response } from "express";
import { gaxios, OAuth2Client } from "google-auth-library";

const clientId = "test-google-client";
const user = {
  id: "test-user-id",
  firstName: "Test",
  lastName: "User",
  email: "registered@example.com",
  googleSub: "test-google-sub",
  passwordHash: null,
  role: "customer",
  createdAt: new Date(),
};
let queryError: Error | undefined;
type Account = Omit<typeof user, "googleSub"> & { googleSub: string | null };
let matchingAccounts: Account[] = [user];
const lookup = mock.fn(async (limit: number) => {
  if (queryError) throw queryError;
  return matchingAccounts.slice(0, limit);
});
const generateAccessToken = mock.fn(() => "test-access-token");

mock.module(new URL("../src/db/index.ts", import.meta.url).href, {
  exports: {
    db: {
      select: () => ({ from: () => ({ where: () => ({ limit: lookup }) }) }),
    },
  },
});
mock.module(new URL("../src/utils/jwt.ts", import.meta.url).href, {
  exports: { generateAccessToken },
});
const { googleAuth } = await import("../src/controllers/auth.controller.js");

// Exercise Google's real signature and claim verification using local test keys.
// Only certificate retrieval, the database, and application tokens are mocked.
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

function credential(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: "https://accounts.google.com",
    aud: clientId,
    sub: user.googleSub,
    email: user.email,
    email_verified: true,
    iat: now - 60,
    exp: now + 3600,
    ...overrides,
  })).toString("base64url");
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url")}`;
}

async function authenticate(token = credential()) {
  let status = 200;
  let body: Record<string, any> = {};
  const response = {
    status(code: number) { status = code; return this; },
    json(value: Record<string, any>) { body = value; return this; },
  };
  await googleAuth({ body: { credential: token } } as Request, response as Response);
  return { status, body };
}

beforeEach((t) => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = clientId;
  t.after(() => {
    if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousClientId;
  });
  t.mock.method(OAuth2Client.prototype, "getFederatedSignonCertsAsync", async () => ({
    certs: { "test-key": publicKey },
    format: "PEM",
  }));
  queryError = undefined;
  matchingAccounts = [user];
  lookup.mock.resetCalls();
  generateAccessToken.mock.resetCalls();
});

const invalidCredentials = {
  expired: () => credential({ exp: Math.floor(Date.now() / 1000) - 600 }),
  malformed: () => "not-a-jwt",
  "malformed JSON": () => "e30.bm90LWpzb24.signature",
  "wrong audience": () => credential({ aud: "another-google-client" }),
  "invalid signature": () => `${credential().split(".").slice(0, 2).join(".")}.invalid`,
  "unverified email": () => credential({ email_verified: false }),
};

for (const [name, makeCredential] of Object.entries(invalidCredentials)) {
  test(`${name} Google credentials return 401 without accessing accounts or issuing tokens`, async (t) => {
    const logError = t.mock.method(console, "error", () => {});
    assert.deepEqual(await authenticate(makeCredential()), {
      status: 401,
      body: { success: false, message: "Unable to verify Google account" },
    });
    assert.equal(lookup.mock.callCount(), 0);
    assert.equal(generateAccessToken.mock.callCount(), 0);
    assert.equal(logError.mock.callCount(), 0);
  });
}

test("valid Google credentials still authenticate the existing account", async () => {
  const result = await authenticate();
  assert.equal(result.status, 200);
  assert.equal(result.body.data.user.id, user.id);
  assert.equal(result.body.data.accessToken, "test-access-token");
  assert.equal("passwordHash" in result.body.data.user, false);
  assert.equal(lookup.mock.callCount(), 1);
  assert.equal(generateAccessToken.mock.callCount(), 1);
});

for (const otherGoogleSub of [null, "another-google-sub"]) {
  for (const emailMatchFirst of [true, false]) {
    test(`Google subject takes priority over an email match (other subject: ${otherGoogleSub}, email first: ${emailMatchFirst})`, async () => {
      const emailAccount = {
        ...user,
        id: "other-user-id",
        email: "changed@example.com",
        googleSub: otherGoogleSub,
      };
      matchingAccounts = emailMatchFirst ? [emailAccount, user] : [user, emailAccount];

      const result = await authenticate(credential({ email: emailAccount.email }));

      assert.equal(result.status, 200);
      assert.equal(result.body.data.user.id, user.id);
      assert.equal(result.body.data.user.email, user.email);
      assert.equal(result.body.data.accessToken, "test-access-token");
      assert.deepEqual(generateAccessToken.mock.calls.map((call) => call.arguments), [
        [{ userId: user.id, role: user.role }],
      ]);
    });
  }

  test(`an email-only match remains a conflict (other subject: ${otherGoogleSub})`, async () => {
    matchingAccounts = [{ ...user, id: "other-user-id", googleSub: otherGoogleSub }];

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

test("missing Google configuration remains a server error", async (t) => {
  t.mock.method(console, "error", () => {});
  delete process.env.GOOGLE_CLIENT_ID;
  assert.equal((await authenticate()).status, 500);
  assert.equal(lookup.mock.callCount(), 0);
  assert.equal(generateAccessToken.mock.callCount(), 0);
});

test("Google certificate-fetch failures remain server errors", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(OAuth2Client.prototype, "getFederatedSignonCertsAsync", async () => {
    throw new gaxios.GaxiosError("Certificate service unavailable", {
      url: new URL("https://example.test/certs"),
      headers: new Headers(),
    });
  });
  assert.equal((await authenticate()).status, 500);
  assert.equal(lookup.mock.callCount(), 0);
  assert.equal(generateAccessToken.mock.callCount(), 0);
});

test("database failures after Google verification remain server errors", async (t) => {
  t.mock.method(console, "error", () => {});
  queryError = new Error("Database unavailable");
  assert.equal((await authenticate()).status, 500);
  assert.equal(lookup.mock.callCount(), 1);
  assert.equal(generateAccessToken.mock.callCount(), 0);
});
