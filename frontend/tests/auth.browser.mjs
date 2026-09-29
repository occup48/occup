import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { test, after } from "node:test";
import { chromium } from "playwright";

// HTTP and Google fixtures are confined to this browser test, never the app.
const baseURL = process.env.AUTH_TEST_URL || "http://localhost:5173";
const browser = await chromium.launch({ headless: true }).catch(() =>
  chromium.launch({ channel: "msedge", headless: true }),
);
after(() => browser.close());
const artifacts = "node_modules/.cache/auth-checks";
await mkdir(artifacts, { recursive: true });
const user = { id: "test-user", firstName: "Ada", lastName: "Okafor", email: "ada@example.com", role: "customer" };
const session = { success: true, data: { user, accessToken: "browser-test-token" } };
const googleScript = `
  let callback;
  window.google = { accounts: { id: {
    initialize(options) { callback = options.callback; },
    renderButton(host, options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Continue with Google';
      button.style.cssText = 'width:' + options.width + 'px;height:40px;border:1px solid #dadce0;border-radius:4px;background:white;color:#202124;font:500 14px Arial;cursor:pointer';
      button.onclick = () => callback({credential:'browser-test-google-credential'});
      host.appendChild(button);
    }
  } } };
`;

async function openPage(path = "/signin", options = {}) {
  const context = await browser.newContext({ viewport: { width: options.width || 1440, height: 1000 } });
  const calls = [];
  const errors = [];
  await context.route("https://accounts.google.com/gsi/client", (route) => route.fulfill({ contentType: "application/javascript", body: googleScript }));
  await context.route("**/api/auth/**", async (route) => {
    const request = route.request();
    calls.push({ url: request.url(), method: request.method(), body: request.postDataJSON(), authorization: request.headers().authorization });
    if (options.handleRequest) return options.handleRequest(route, calls);
    return route.fulfill({ json: session });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseURL + path);
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.locator(".auth-google-provider button").waitFor();
  return { page, context, calls, async close() { assert.deepEqual(errors, []); await context.close(); } };
}

async function fillSignIn(page) {
  await page.getByLabel("Email address").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("ValidPass1!");
}

async function fillSignUp(page) {
  await page.getByLabel("First name").fill(" Ada ");
  await page.getByLabel("Last name").fill(" Okafor ");
  await page.getByLabel("Email address").fill("Ada@EXAMPLE.com");
  await page.getByLabel("Password", { exact: true }).fill("ValidPass1!");
  await page.getByLabel("Confirm password", { exact: true }).fill("ValidPass1!");
}

test("both auth routes fit all five required widths and share the same responsive layout", async () => {
  const app = await openPage();
  try {
    for (const width of [320, 375, 768, 1024, 1440]) {
      await app.page.setViewportSize({ width, height: 1000 });
      for (const path of ["/signin", "/signup"]) {
        await app.page.goto(baseURL + path);
        await app.page.getByRole("heading", { level: 1 }).waitFor();
        await app.page.locator(".auth-google-provider button").waitFor();
        assert.equal(await app.page.locator("form").count(), 1);
        assert.equal(await app.page.locator(".auth-visual").isVisible(), width >= 1024);
        assert.equal(await app.page.locator(".auth-mobile-logo").isVisible(), width < 1024);
        assert.equal(await app.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${path} overflows at ${width}px`);
        assert.equal(await app.page.getByLabel("First name").count(), path === "/signup" ? 1 : 0);
        assert.equal(await app.page.getByLabel("Confirm password", { exact: true }).count(), path === "/signup" ? 1 : 0);
        assert.equal(await app.page.getByRole("checkbox", { name: "Remember me" }).count(), path === "/signin" ? 1 : 0);
        const submit = app.page.getByRole("button", { name: path === "/signin" ? "Log in" : "Create Account", exact: true });
        const bounds = await submit.boundingBox();
        assert.ok(bounds.width >= 250 && bounds.height >= 48); const inputBounds = await app.page.getByLabel("Email address").boundingBox(); assert.ok(inputBounds.height >= 48);
        await app.page.screenshot({ path: `${artifacts}/${path.slice(1)}-${width}.png`, fullPage: true });
      }
    }
  } finally { await app.close(); }
});

test("route-driven navigation resets fields, and both password visibility controls work", async () => {
  const app = await openPage();
  try {
    await fillSignIn(app.page);
    await app.page.getByRole("button", { name: "Show password", exact: true }).click();
    assert.equal(await app.page.getByLabel("Password", { exact: true }).getAttribute("type"), "text");
    await app.page.getByRole("button", { name: "Hide password", exact: true }).click();
    assert.equal(await app.page.getByLabel("Password", { exact: true }).getAttribute("type"), "password");
    await app.page.getByRole("navigation", { name: "Account access" }).getByRole("link", { name: "Create account" }).click();
    await app.page.waitForURL("**/signup"); await app.page.getByRole("heading", { name: "Create your account" }).waitFor();
    assert.equal(await app.page.getByLabel("Password", { exact: true }).inputValue(), "");
    await app.page.getByRole("button", { name: "Show confirm password", exact: true }).click();
    assert.equal(await app.page.getByLabel("Confirm password", { exact: true }).getAttribute("type"), "text");
    await app.page.goBack();
    await app.page.waitForURL("**/signin");
    assert.equal(await app.page.getByLabel("First name").count(), 0);
    await app.page.getByText("Forgot your password?", { exact: true }).click();
    await app.page.getByText("Password resets aren’t available yet.", { exact: false }).waitFor();
  } finally { await app.close(); }
});

test("Zod rejects empty credentials, mismatched passwords, and passwords over 72 UTF-8 bytes", async () => {
  const app = await openPage();
  try {
    await app.page.getByRole("button", { name: "Log in", exact: true }).click();
    await app.page.getByText("Enter a valid email address.", { exact: true }).waitFor();
    await app.page.getByText("Enter your password.", { exact: true }).waitFor();
    assert.equal(app.calls.length, 0);
    await app.page.goto(baseURL + "/signup");
    await fillSignUp(app.page);
    await app.page.getByLabel("Confirm password", { exact: true }).fill("WrongPass1!");
    await app.page.getByRole("button", { name: "Create Account", exact: true }).click();
    await app.page.getByText("Passwords do not match.", { exact: true }).waitFor();
    assert.equal(await app.page.getByLabel("Confirm password", { exact: true }).getAttribute("aria-invalid"), "true");
    await app.page.getByLabel("Password", { exact: true }).fill("Aa1!" + "é".repeat(35));
    await app.page.getByLabel("Confirm password", { exact: true }).fill("Aa1!" + "é".repeat(35));
    await app.page.getByRole("button", { name: "Create Account", exact: true }).click();
    await app.page.getByText("Your password must be 72 UTF-8 bytes or fewer.", { exact: false }).waitFor();
    assert.equal(app.calls.length, 0);
  } finally { await app.close(); }
});

test("signup sends only backend fields and handles a user-only response without inventing a session", async () => {
  const app = await openPage("/signup", { handleRequest: (route) => route.fulfill({ status: 201, json: { success: true, data: { user } } }) });
  try {
    await fillSignUp(app.page);
    await app.page.getByRole("button", { name: "Create Account", exact: true }).click();
    await app.page.waitForURL("**/signin");
    await app.page.getByRole("status").filter({ hasText: "Your account is ready" }).waitFor();
    assert.deepEqual(app.calls[0].body, { firstName: "Ada", lastName: "Okafor", email: "ada@example.com", password: "ValidPass1!" });
    assert.match(app.calls[0].url, /\/api\/auth\/(signup|sign-up)$/);
    assert.equal(await app.page.getByLabel("Email address").inputValue(), "ada@example.com");
    assert.equal(await app.page.getByLabel("Password", { exact: true }).inputValue(), "");
    assert.equal(await app.page.evaluate(() => localStorage.getItem("occup.accessToken") || sessionStorage.getItem("occup.accessToken")), null);
  } finally { await app.close(); }
});

test("login prevents duplicate requests, persists remember-me sessions, and restores with GET /user", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const app = await openPage("/signin", { handleRequest: async (route) => {
    if (route.request().method() === "POST") await gate;
    return route.fulfill({ json: session });
  } });
  try {
    await fillSignIn(app.page);
    await app.page.getByRole("button", { name: "Log in", exact: true }).click();
    const loading = app.page.getByRole("button", { name: "Logging in...", exact: true });
    await loading.waitFor();
    assert.equal(await loading.isDisabled(), true);
    await app.page.locator("form").evaluate((form) => { form.requestSubmit(); form.requestSubmit(); });
    assert.equal(app.calls.length, 1);
    assert.deepEqual(app.calls[0].body, { email: "ada@example.com", password: "ValidPass1!" });
    release();
    await app.page.waitForURL(baseURL + "/");
    assert.equal(await app.page.evaluate(() => localStorage.getItem("occup.accessToken")), "browser-test-token");
    assert.equal(await app.page.evaluate(() => sessionStorage.getItem("occup.accessToken")), null);
    await app.page.reload();
    await app.page.getByText("My Reservations", { exact: true }).waitFor();
    const restore = app.calls.find((call) => call.method === "GET");
    assert.match(restore.url, /\/api\/auth\/user$/);
    assert.equal(restore.authorization, "Bearer browser-test-token");
  } finally { release(); await app.close(); }
});

test("unchecked remember me uses session storage", async () => {
  const app = await openPage();
  try {
    await fillSignIn(app.page);
    await app.page.getByRole("checkbox", { name: "Remember me" }).uncheck();
    await app.page.getByRole("button", { name: "Log in", exact: true }).click();
    await app.page.waitForURL(baseURL + "/");
    assert.equal(await app.page.evaluate(() => localStorage.getItem("occup.accessToken")), null);
    assert.equal(await app.page.evaluate(() => sessionStorage.getItem("occup.accessToken")), "browser-test-token");
  } finally { await app.close(); }
});

test("API failures remain safe and readable, including invalid JSON and network errors", async () => {
  for (const failure of [401, 409, 429, 500, "invalid-json", "network"]) {
    const app = await openPage("/signin", { handleRequest: (route) => failure === "network" ? route.abort("failed") : route.fulfill({
      status: typeof failure === "number" ? failure : 200,
      contentType: "application/json",
      body: failure === "invalid-json" ? "not JSON" : JSON.stringify({ message: "SECRET_BACKEND_STACK", passwordHash: "SECRET_HASH" }),
    }) });
    try {
      await fillSignIn(app.page);
      await app.page.getByRole("button", { name: "Log in", exact: true }).click();
      await app.page.getByRole("alert").waitFor();
      const text = await app.page.locator("body").innerText();
      assert.equal(text.includes("SECRET_"), false);
      assert.equal(await app.page.getByRole("button", { name: "Log in", exact: true }).isEnabled(), true);
      assert.equal(await app.page.evaluate(() => localStorage.getItem("occup.accessToken")), null);
    } finally { await app.close(); }
  }
});

test("Google Identity credential is exchanged through the real auth service contract", async () => {
  const app = await openPage();
  try {
    await app.page.locator(".auth-google-provider button").click();
    await app.page.waitForURL(baseURL + "/");
    assert.match(app.calls[0].url, /\/api\/auth\/google$/);
    assert.deepEqual(app.calls[0].body, { credential: "browser-test-google-credential" });
    assert.equal(await app.page.evaluate(() => localStorage.getItem("occup.accessToken")), "browser-test-token");
  } finally { await app.close(); }
});
