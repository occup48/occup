import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { beforeEach, mock, test } from "node:test";
import bcrypt from "bcryptjs";
import express from "express";

const password = "Valid-password1!";
const user = {
  id: "test-user-id",
  firstName: "Test",
  lastName: "User",
  email: "registered@example.com",
  passwordHash: await bcrypt.hash(password, 12),
  role: "customer",
  createdAt: new Date(),
};
let rows: (typeof user)[] = [];
const lookup = mock.fn(async () => rows);
const generateAccessToken = mock.fn(() => "test-access-token");

// Isolate database and token dependencies; password comparisons and HTTP routing
// use their real implementations without accessing a database or reading secrets.
mock.module(new URL("../src/db/index.ts", import.meta.url).href, {
  exports: {
    db: {
      select: () => ({ from: () => ({ where: () => ({ limit: lookup }) }) }),
    },
  },
});
mock.module(new URL("../src/utils/jwt.ts", import.meta.url).href, {
  exports: {
    generateAccessToken,
    verifyAccessToken: () => { throw new Error("Unexpected token verification"); },
  },
});
const { signInUser } = await import("../src/services/auth.service.js");
const { default: authRouter } = await import("../src/routes/auth.routes.js");

beforeEach(() => {
  rows = [];
  lookup.mock.resetCalls();
  generateAccessToken.mock.resetCalls();
});

test("unknown email and wrong password both perform one cost-12 comparison", async (t) => {
  const compare = mock.method(bcrypt, "compare");
  t.after(() => compare.mock.restore());
  for (const existing of [false, true]) {
    rows = existing ? [user] : [];
    compare.mock.resetCalls();
    await assert.rejects(
      signInUser({ email: existing ? user.email : "missing@example.com", password: "wrong" }),
      { message: "Invalid email or password" },
    );
    assert.equal(compare.mock.callCount(), 1);
    const [submittedPassword, hash] = compare.mock.calls[0]!.arguments;
    assert.equal(submittedPassword, "wrong");
    assert.equal(bcrypt.getRounds(hash as string), 12);
    assert.equal(await compare.mock.calls[0]!.result, false);
  }
  assert.equal(generateAccessToken.mock.callCount(), 0);
});

test("a matching dummy comparison can never authenticate a missing account", async (t) => {
  const compare = mock.method(bcrypt, "compare", async () => true);
  t.after(() => compare.mock.restore());
  await assert.rejects(signInUser({ email: "missing@example.com", password }), {
    message: "Invalid email or password",
  });
  assert.equal(compare.mock.callCount(), 1);
  assert.equal(generateAccessToken.mock.callCount(), 0);
});

test("valid credentials still return a token and omit the password hash", async () => {
  rows = [user];
  const result = await signInUser({ email: user.email, password });
  assert.equal(result.accessToken, "test-access-token");
  assert.equal(result.user.id, user.id);
  assert.equal("passwordHash" in result.user, false);
  assert.deepEqual(generateAccessToken.mock.calls[0]!.arguments, [
    { userId: user.id, role: user.role },
  ]);
});

test("signin limits attempts across emails before database and bcrypt work", async (t) => {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth`;
  const compare = mock.method(bcrypt, "compare");
  t.after(() => compare.mock.restore());

  for (let attempt = 0; attempt < 10; attempt++) {
    rows = attempt % 2 === 0 ? [] : [user];
    const response = await fetch(`${baseUrl}/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: rows.length ? user.email : `missing${attempt}@example.com`, password: "wrong" }),
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { success: false, message: "Invalid email or password" });
  }
  assert.equal(lookup.mock.callCount(), 10);
  assert.equal(compare.mock.callCount(), 10);

  rows = [user];
  const blocked = await fetch(`${baseUrl}/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password }),
  });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("Retry-After")) > 0);
  assert.ok(blocked.headers.has("RateLimit"));
  assert.deepEqual(await blocked.json(), {
    success: false,
    message: "Too many signin attempts. Please try again later.",
  });
  assert.equal(lookup.mock.callCount(), 10);
  assert.equal(compare.mock.callCount(), 10);
  assert.equal(generateAccessToken.mock.callCount(), 0);

  // Signup still reaches validation without a token; account details remain protected.
  const signup = await fetch(`${baseUrl}/sign-up`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(signup.status, 400);
  assert.equal((await signup.json()).message, "Invalid signup data");
  const account = await fetch(`${baseUrl}/user`);
  assert.equal(account.status, 401);
  assert.equal((await account.json()).message, "Authentication required");
});
