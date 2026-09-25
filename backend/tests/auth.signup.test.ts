import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { drizzle, type RemoteCallback } from "drizzle-orm/pg-proxy";
import type { Request, Response } from "express";

// Use Drizzle's real SQL generation with a simulated database response, without
// reading environment secrets or connecting to a live database.
let executeQuery: RemoteCallback = async () => { throw new Error("Unexpected query"); };
const db = drizzle((...args) => executeQuery(...args));
mock.module(new URL("../src/db/index.ts", import.meta.url).href, {
  exports: { db },
});
const { signUp } = await import("../src/controllers/auth.controller.js");

const input = {
  firstName: "Test",
  lastName: "User",
  email: "same@example.com",
  password: "Valid-password1!",
};
const userRow = ["new-user-id", "Test", "User", input.email, "customer", "2026-01-01T00:00:00.000Z"];
const emailConflictClause = /on conflict\s*\("email"\) do nothing/i;

async function signup(email = input.email) {
  let status = 200;
  let body: Record<string, any> = {};
  const response = {
    status(code: number) { status = code; return this; },
    json(value: Record<string, any>) { body = value; return this; },
  };
  await signUp({ body: { ...input, email } } as Request, response as Response);
  return { status, body };
}

test("concurrent signup for the same normalized email returns 201 and 409", { timeout: 10000 }, async (t) => {
  const logError = t.mock.method(console, "error", () => {});
  let checks = 0;
  const inserts: string[] = [];
  let releaseChecks!: () => void;
  const bothChecked = new Promise<void>((resolve) => { releaseChecks = resolve; });
  executeQuery = async (sql, params) => {
    if (sql.startsWith("select")) {
      assert.equal(params[0], input.email);
      if (++checks === 2) releaseChecks();
      await bothChecked;
      return { rows: [] };
    }
    assert.ok(sql.startsWith("insert"));
    assert.ok(params.includes(input.email));
    inserts.push(sql);
    if (inserts.length === 1) return { rows: [userRow] };
    if (emailConflictClause.test(sql)) return { rows: [] };
    throw Object.assign(new Error("duplicate email"), {
      code: "23505", constraint: "users_email_unique",
    });
  };

  const results = await Promise.all([signup("Same@Example.com"), signup("same@example.com")]);
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
  assert.equal(checks, 2);
  assert.equal(inserts.length, 2);
  for (const sql of inserts) assert.match(sql, emailConflictClause);
  assert.deepEqual(results.find((result) => result.status === 409)!.body, {
    success: false, message: "Email already in use",
  });
  const created = results.find((result) => result.status === 201)!;
  assert.equal(created.body.data.user.email, input.email);
  assert.equal("passwordHash" in created.body.data.user, false);
  assert.equal(logError.mock.calls.filter((call) => call.arguments[0] === "Signup error:").length, 0);
});

test("an email found during the pre-check still returns 409 without inserting", async () => {
  executeQuery = async (sql) => {
    assert.ok(sql.startsWith("select"));
    return { rows: [["existing-user-id"]] };
  };
  assert.deepEqual(await signup(), {
    status: 409,
    body: { success: false, message: "Email already in use" },
  });
});

test("unrelated database errors are not reported as email conflicts", async (t) => {
  const logError = t.mock.method(console, "error", () => {});
  for (const error of [
    new Error("database unavailable"),
    Object.assign(new Error("duplicate primary key"), { code: "23505", constraint: "users_pkey" }),
  ]) {
    executeQuery = async (sql) => {
      if (sql.startsWith("select")) return { rows: [] };
      throw error;
    };
    assert.deepEqual(await signup(), {
      status: 500,
      body: { success: false, message: "Unable to create account" },
    });
  }
  assert.equal(logError.mock.calls.filter((call) => call.arguments[0] === "Signup error:").length, 2);
});

test("an email longer than the database limit returns 400 without a query", async () => {
  let queries = 0;
  executeQuery = async () => {
    queries++;
    throw new Error("Signup should not reach the database");
  };
  const result = await signup(`${"a".repeat(61)}@${"b".repeat(35)}.com`);
  assert.deepEqual(result, {
    status: 400,
    body: {
      success: false,
      message: "Invalid signup data",
      errors: { email: ["Email must not exceed 100 characters"] },
    },
  });
  assert.equal(queries, 0);
});
