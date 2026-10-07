import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { after, test } from "node:test";
import { chromium } from "playwright";

// Contract fixtures live only in tests. The application always uses VITE_API_URL.
const baseURL = process.env.ADMIN_TEST_URL || "http://localhost:5173";
const artifacts = "node_modules/.cache/admin-table-checks";
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ channel: "msedge", headless: true }));
after(() => browser.close());
const admin = { id: "admin-test", firstName: "Admin", lastName: "", email: "admin@example.com", role: "admin" };
const seed = () => [
  ["T-01", 4, "Main Room", true], ["T-02", 2, "Main Room", true],
  ["T-03", 4, "Outdoor", true], ["T-04", 6, "Private", false],
  ["T-05", 2, "Outdoor", true], ["T-06", 6, "Main Room", true],
  ["T-07", 4, "Private", false], ["T-08", 8, "Private", true],
].map(([tableNumber, capacity, location, isActive], index) => ({ id: `table-${index + 1}`, tableNumber, capacity, location, isActive, createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z" }));

async function setup(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  if (options.auth !== false) await context.addInitScript(() => sessionStorage.setItem("occup.accessToken", "admin-browser-test-token"));
  await context.route("https://accounts.google.com/**", (route) => route.abort());
  const state = { tables: options.tables ?? seed(), calls: [], errors: [], failure: null, delay: 0, ...options.state };
  await context.route("**/api/auth/user", async (route) => {
    if (options.authDelay) await new Promise((resolve) => setTimeout(resolve, options.authDelay));
    await route.fulfill({ json: { success: true, data: { user: { ...admin, role: options.role || "admin" } } } });
  });
  await context.route("**/api/admin/tables**", async (route) => {
    const request = route.request();
    const method = request.method();
    const payload = request.postDataJSON();
    state.calls.push({ method, payload, authorization: request.headers().authorization, url: request.url() });
    if (state.delay) await new Promise((resolve) => setTimeout(resolve, state.delay));
    if (state.failure) return route.fulfill({ status: state.failure, json: { success: false, message: "Raw database internals must not appear" } });
    if (method === "GET") return route.fulfill({ json: { success: true, data: state.tables } });
    const id = new URL(request.url()).pathname.split("/").at(-1);
    if (payload.tableNumber && state.tables.some((item) => item.tableNumber === payload.tableNumber && (method === "POST" || item.id !== id))) {
      return route.fulfill({ status: 409, json: { success: false, message: "A table with this number already exists" } });
    }
    if (method === "POST") {
      const created = { ...seed()[0], ...payload, id: `created-${state.tables.length}` };
      state.tables.push(created);
      return route.fulfill({ status: 201, json: { success: true, data: created } });
    }
    const index = state.tables.findIndex((item) => item.id === id);
    assert.notEqual(index, -1);
    state.tables[index] = { ...state.tables[index], ...payload };
    return route.fulfill({ json: { success: true, data: state.tables[index] } });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => state.errors.push(error.message));
  const path = options.path || "/admin/tables";
  await page.goto(baseURL + path);
  if (options.ready !== false && options.auth !== false && options.role !== "customer") {
    await page.getByRole("heading", { name: path === "/admin" ? "Dashboard" : "T-01", exact: true }).waitFor();
  }
  return { page, state, async close() { await context.close(); assert.deepEqual(state.errors, []); } };
}
const visibleSearch = (page) => page.locator('input[type="search"]:visible');
async function count(page, total) {
  await page.waitForFunction((expected) => document.querySelectorAll(".admin-table-card").length === expected, total);
}
async function chooseArea(page, name) {
  await page.getByRole("combobox", { name: "Filter tables by area" }).click();
  await page.getByRole("option", { name, exact: true }).click();
}
async function action(page, table, name) {
  await page.getByRole("button", { name: `Actions for ${table}`, exact: true }).click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}
async function formValues(page, number, capacity, location = "") {
  await page.getByRole("textbox", { name: "Table Number", exact: true }).fill(number);
  await page.getByRole("spinbutton", { name: "Capacity", exact: true }).fill(String(capacity));
  await page.getByRole("textbox", { name: "Location (Optional)", exact: true }).fill(location);
}
async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "page has horizontal overflow");
}

test("route protection waits for auth and rejects guests and non-admins without fetching tables", async () => {
  for (const path of ["/admin", "/admin/tables"]) for (const options of [{ auth: false }, { role: "customer" }]) {
    const app = await setup({ ...options, path, ready: false });
    try {
      await app.page.waitForURL(baseURL + (options.auth === false ? "/signin" : "/"));
      assert.equal(app.state.calls.length, 0);
    } finally { await app.close(); }
  }
  const app = await setup({ ready: false, authDelay: 600 });
  try {
    await app.page.getByText("Checking your session…").waitFor();
    assert.equal(app.state.calls.length, 0);
    await count(app.page, 8);
    assert.ok(app.state.calls.every((call) => call.authorization === "Bearer admin-browser-test-token"));
  } finally { await app.close(); }
});

test("dashboard shows honest unavailable states, working links and responsive layouts", async () => {
  const app = await setup({ path: "/admin" });
  try {
    const { page, state } = app;
    assert.equal(await page.locator(".admin-stat-card").count(), 4);
    assert.equal(await page.locator(".admin-stat-value").allTextContents().then((values) => values.every((value) => value.trim() === "—")), true);
    assert.equal(await page.getByText("Data unavailable", { exact: true }).count(), 4);
    await page.getByText("No reservation data is available yet.").waitFor();
    await page.getByText("No trend data available", { exact: true }).waitFor();
    assert.equal(await page.locator("#admin-main").getByRole("link", { name: /Manage Tables/ }).getAttribute("href"), "/admin/tables");
    assert.equal(await page.locator("#admin-main").getByRole("link", { name: /View Site/ }).getAttribute("href"), "/");
    assert.equal(state.calls.length, 0, "dashboard must not request unavailable reservation data");
    await page.getByRole("combobox", { name: "Trend date range" }).click();
    await page.getByRole("option", { name: "This Month" }).click();
    await page.getByRole("img", { name: "No reservation trend data is available for this month" }).waitFor();

    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow(page);
      assert.equal(await page.locator(".admin-desktop-sidebar").isVisible(), width >= 1024);
      await page.screenshot({ path: `${artifacts}/dashboard-${width}.png`, fullPage: true });
    }
    await page.goto(baseURL + "/admin/dashboard");
    await page.waitForURL(baseURL + "/admin");
    await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  } finally { await app.close(); }
});

test("search, status counts and data-derived area filters combine and reset", async () => {
  const app = await setup();
  try {
    const { page } = app;
    await page.getByRole("button", { name: /^Unavailable/ }).click(); await count(page, 2);
    await page.getByRole("button", { name: /^Available/ }).click(); await count(page, 6);
    await page.getByRole("button", { name: /^Occupied/ }).click(); await count(page, 0);
    await page.getByRole("heading", { name: "No tables found" }).waitFor();
    await page.getByRole("button", { name: /^Reserved/ }).click(); await count(page, 0);
    await page.getByRole("button", { name: /^Available/ }).click(); await count(page, 6);
    await chooseArea(page, "Private"); await count(page, 1);
    await visibleSearch(page).fill("t-08"); await count(page, 1);
    await visibleSearch(page).fill(" MAIN room ");
    await page.getByRole("heading", { name: "No tables found" }).waitFor();
    await page.getByRole("button", { name: "Clear filters" }).click(); await count(page, 8);
    await visibleSearch(page).fill("outDOOR"); await count(page, 2);
    await page.getByRole("button", { name: "Clear search", exact: true }).filter({ visible: true }).click(); await count(page, 8);
    assert.equal(app.state.calls.filter((call) => call.method === "GET").length >= 1, true);
    assert.equal(app.state.calls.filter((call) => call.method !== "GET").length, 0);
  } finally { await app.close(); }
});

test("one shared form validates, handles duplicates, creates and edits persisted table fields", async () => {
  const app = await setup();
  try {
    const { page, state } = app;
    await page.getByRole("button", { name: "Add Table", exact: true }).click();
    await page.getByRole("button", { name: "Create Table", exact: true }).click();
    await page.getByText("Table number is required").waitFor();
    assert.equal(state.calls.filter((call) => call.method === "POST").length, 0);
    await formValues(page, "T-01", "2.5");
    await page.getByRole("button", { name: "Create Table", exact: true }).click();
    await page.getByText("Capacity must be a whole number").waitFor();
    await page.getByRole("spinbutton", { name: "Capacity", exact: true }).fill("4");
    await page.getByRole("button", { name: "Create Table", exact: true }).click();
    await page.getByText("A table with this number already exists. Choose another number.").waitFor();
    await formValues(page, " T-09 ", 3, " Terrace ");
    state.delay = 400;
    await page.getByRole("button", { name: "Create Table", exact: true }).click();
    await page.getByRole("button", { name: "Creating…" }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Cancel", exact: true }).isDisabled(), true);
    await page.keyboard.press("Escape");
    await count(page, 9);
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const created = state.calls.filter((call) => call.method === "POST").at(-1);
    assert.deepEqual(created.payload, { tableNumber: "T-09", capacity: 3, location: "Terrace", isActive: true });
    assert.equal(created.authorization, "Bearer admin-browser-test-token");
    state.delay = 0;
    await chooseArea(page, "Terrace"); await count(page, 1);
    await action(page, "T-09", "Edit table");
    assert.equal(await page.getByRole("textbox", { name: "Table Number", exact: true }).inputValue(), "T-09");
    assert.equal(await page.getByRole("spinbutton", { name: "Capacity", exact: true }).inputValue(), "3");
    await formValues(page, "T-10", 5, "");
    await page.getByRole("switch", { name: "Active", exact: true }).click();
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await count(page, 9);
    const edited = state.calls.filter((call) => call.method === "PATCH").at(-1);
    assert.deepEqual(edited.payload, { tableNumber: "T-10", capacity: 5, location: "", isActive: false });
    const card = page.getByRole("article", { name: "Table T-10", exact: true });
    assert.equal(await card.getByText("No location").isVisible(), true);
    assert.equal(await card.getByText("Unavailable", { exact: true }).isVisible(), true);
  } finally { await app.close(); }
});

test("activation shows pending state and only updates cards after successful PATCH", async () => {
  const app = await setup();
  try {
    const { page, state } = app;
    state.delay = 500;
    await action(page, "T-01", "Mark unavailable");
    const card = page.getByRole("article", { name: "Table T-01", exact: true });
    await card.getByText("Updating…").waitFor();
    assert.equal(await card.getByRole("button").isDisabled(), true);
    await card.getByText("Unavailable", { exact: true }).waitFor();
    assert.deepEqual(state.calls.at(-1).payload, { isActive: false });
    state.failure = 500;
    await action(page, "T-01", "Mark available");
    await page.getByRole("alert").waitFor();
    assert.equal(await card.getByText("Unavailable", { exact: true }).isVisible(), true);
    assert.equal(await page.getByText("Raw database internals must not appear").count(), 0);
    state.failure = null; state.delay = 0;
    await action(page, "T-01", "Mark available");
    await card.getByText("Available", { exact: true }).waitFor();
    await page.getByRole("button", { name: /^Available.*6/ }).waitFor();
  } finally { await app.close(); }
});

test("loading, retry, empty list and failed create preserve a usable UI", async () => {
  const app = await setup({ ready: false, state: { failure: 500, delay: 500 } });
  try {
    const { page, state } = app;
    await page.getByRole("status", { name: "Loading tables" }).waitFor();
    await page.getByRole("heading", { name: "Unable to load tables" }).waitFor();
    state.failure = null; state.delay = 0; state.tables = [];
    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByRole("heading", { name: "No tables yet" }).waitFor();
    await page.getByRole("button", { name: "Add your first table" }).click();
    await formValues(page, "A1", 2);
    state.failure = 500;
    await page.getByRole("button", { name: "Create Table", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByRole("textbox", { name: "Table Number", exact: true }).inputValue(), "A1");
    state.failure = null;
    await page.getByRole("button", { name: "Create Table", exact: true }).click();
    await count(page, 1);
  } finally { await app.close(); }
});

test("expired and forbidden sessions redirect safely for reads and mutations", async () => {
  for (const status of [401, 403]) {
    const app = await setup({ ready: false, state: { failure: status } });
    try {
      await app.page.waitForURL(baseURL + (status === 401 ? "/signin" : "/"));
      if (status === 401) assert.equal(await app.page.evaluate(() => sessionStorage.getItem("occup.accessToken")), null);
    } finally { await app.close(); }
  }
  const app = await setup();
  try {
    app.state.failure = 401;
    await action(app.page, "T-01", "Mark unavailable");
    await app.page.waitForURL(baseURL + "/signin");
    assert.equal(await app.page.evaluate(() => sessionStorage.getItem("occup.accessToken")), null);
  } finally { await app.close(); }
});

test("all five viewport sizes fit cards, menus, forms and mobile navigation without overflow", async () => {
  const app = await setup();
  try {
    const { page } = app;
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow(page);
      assert.equal(await page.locator(".admin-desktop-sidebar").isVisible(), width >= 1024);
      await page.screenshot({ path: `${artifacts}/tables-${width}.png`, fullPage: true });
      await page.getByRole("button", { name: "Add Table", exact: true }).click();
      await page.getByRole("dialog").waitFor();
      await noOverflow(page);
      const fieldBounds = await page.getByRole("textbox", { name: "Table Number", exact: true }).boundingBox();
      assert.ok(fieldBounds.height >= 43, "table form fields need a comfortable touch target");
      const bounds = await page.getByRole("dialog").boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
      await page.screenshot({ path: `${artifacts}/dialog-${width}.png`, fullPage: true });
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      if (width < 1024) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await page.getByRole("dialog").waitFor();
        await noOverflow(page);
        await page.getByRole("button", { name: "Close navigation" }).click();
      }
      await page.getByRole("button", { name: "Actions for T-01", exact: true }).focus();
      await page.keyboard.press("Enter");
      await page.getByRole("menuitem", { name: "Edit table", exact: true }).waitFor();
      await noOverflow(page);
      await page.keyboard.press("Escape");
    }
    await page.getByRole("button", { name: "Open admin account menu" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await page.waitForURL(baseURL + "/signin");
    assert.equal(await page.evaluate(() => sessionStorage.getItem("occup.accessToken")), null);
  } finally { await app.close(); }
});
