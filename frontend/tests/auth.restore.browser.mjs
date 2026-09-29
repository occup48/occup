import assert from "node:assert/strict";
import { test, after } from "node:test";
import { chromium } from "playwright";

const baseURL = process.env.AUTH_TEST_URL || "http://localhost:5173";
const browser = await chromium.launch({ headless: true }).catch(() =>
  chromium.launch({ channel: "msedge", headless: true }),
);
after(() => browser.close());
const user = { id: "stored-user", firstName: "Ada", lastName: "Okafor", email: "ada@example.com", role: "customer" };

async function openProvider(handleRequest, token = "stored-token") {
  const context = await browser.newContext();
  const calls = [];
  const errors = [];
  await context.addInitScript((token) => {
    if (token) localStorage.setItem("occup.accessToken", token);
  }, token);
  await context.route("**/api/auth/user", (route) => {
    calls.push(route.request().headers().authorization);
    return handleRequest(route, calls.length);
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/tests/fixtures/auth-provider.html`);
  await page.locator("#state").waitFor();
  return {
    page,
    calls,
    state: async () => JSON.parse(await page.locator("#state").innerText()),
    token: () => page.evaluate(() => localStorage.getItem("occup.accessToken")),
    async close() {
      await context.close();
      assert.deepEqual(errors, []);
    },
  };
}

async function waitForState(page, expected) {
  await page.waitForFunction((expected) => {
    const state = JSON.parse(document.querySelector("#state").textContent);
    return Object.entries(expected).every(([key, value]) => state[key] === value);
  }, expected);
}

test("no stored token finishes without a restoration request", async () => {
  const app = await openProvider((route) => route.fulfill({ json: { success: true, data: { user } } }), null);
  try {
    assert.deepEqual(await app.state(), { user: null, accessToken: null, isLoading: false });
    assert.deepEqual(app.calls, []);
  } finally { await app.close(); }
});

for (const failure of ["network", "timeout", 503, 429]) {
  test(`restoration retries ${failure} and recovers without reloading`, async () => {
    let recover = false;
    const app = await openProvider((route) => {
      if (recover) return route.fulfill({ json: { success: true, data: { user } } });
      return typeof failure === "string"
        ? route.abort(failure === "timeout" ? "timedout" : "failed")
        : route.fulfill({ status: failure, json: { success: false } });
    });
    try {
      await app.page.waitForTimeout(200);
      assert.ok(app.calls.length >= 1);
      assert.deepEqual(await app.state(), { user: null, accessToken: null, isLoading: true });
      assert.equal(await app.token(), "stored-token");
      recover = true;
      await waitForState(app.page, { isLoading: false, accessToken: "stored-token" });
      assert.deepEqual((await app.state()).user, user);
      assert.ok(app.calls.length >= 2);
      assert.ok(app.calls.every((authorization) => authorization === "Bearer stored-token"));
    } finally { await app.close(); }
  });
}

for (const status of [401, 403, 404]) {
  test(`restoration clears a token rejected with ${status} and stops retrying`, async () => {
    const app = await openProvider((route) => route.fulfill({ status, json: { success: false } }));
    try {
      await waitForState(app.page, { isLoading: false });
      assert.equal(await app.token(), null);
      assert.equal((await app.state()).user, null);
      const attempts = app.calls.length;
      await app.page.waitForTimeout(1200);
      assert.equal(app.calls.length, attempts);
    } finally { await app.close(); }
  });
}

for (const action of ["Sign in", "Sign out", "Unmount"]) {
  test(`${action} cancels pending restoration retries`, async () => {
    const app = await openProvider((route) => route.fulfill({ status: 503, json: { success: false } }));
    try {
      await app.page.waitForTimeout(200);
      assert.ok(app.calls.length >= 1);
      await app.page.getByRole("button", { name: action, exact: true }).click();
      const attempts = app.calls.length;
      await app.page.waitForTimeout(1200);
      assert.equal(app.calls.length, attempts);
      assert.equal(await app.token(), action === "Sign in" ? "new-token" : action === "Sign out" ? null : "stored-token");
      if (action !== "Unmount") {
        assert.equal((await app.state()).isLoading, false);
        assert.equal((await app.state()).accessToken, action === "Sign in" ? "new-token" : null);
      }
    } finally { await app.close(); }
  });
}

for (const action of ["Sign in", "Sign out"]) {
  test(`${action} prevents an in-flight restoration from replacing the current session`, async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const app = await openProvider(async (route) => {
      await gate;
      await route.fulfill({ json: { success: true, data: { user } } });
    });
    try {
      await app.page.waitForTimeout(100);
      assert.ok(app.calls.length >= 1);
      await app.page.getByRole("button", { name: action, exact: true }).click();
      release();
      await app.page.waitForTimeout(200);
      const state = await app.state();
      assert.equal(state.isLoading, false);
      assert.equal(state.accessToken, action === "Sign in" ? "new-token" : null);
      assert.equal(state.user?.id ?? null, action === "Sign in" ? "new-user" : null);
      assert.equal(await app.token(), action === "Sign in" ? "new-token" : null);
    } finally { release(); await app.close(); }
  });
}
