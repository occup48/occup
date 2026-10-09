import assert from "node:assert/strict";
import { after, test } from "node:test";
import { chromium } from "playwright";

const baseURL = process.env.ADMIN_SETTINGS_TEST_URL || "http://localhost:5173";
const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ channel: "msedge", headless: true }));
after(() => browser.close());

const admin = { id: "settings-admin", firstName: "Admin", lastName: "User", email: "admin@example.com", role: "admin" };
const seedSettings = () => ({
  id: "settings-1",
  key: "default",
  restaurantName: "Occup Restaurant",
  openingTime: "09:00:00",
  closingTime: "22:00:00",
  reservationDuration: 90,
  bookingInterval: 30,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
});

async function setup(options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => sessionStorage.setItem("occup.accessToken", "settings-browser-test-token"));
  const state = {
    settings: seedSettings(),
    getFailures: 0,
    patchFailure: 0,
    calls: [],
    errors: [],
    ...options.state,
  };

  await context.route("**/api/auth/user", (route) => route.fulfill({
    json: { success: true, data: { user: admin } },
  }));
  await context.route("**/api/admin/settings", async (route) => {
    const request = route.request();
    const method = request.method();
    const payload = method === "PATCH" ? request.postDataJSON() : undefined;
    state.calls.push({ method, payload, authorization: request.headers().authorization });

    if (method === "GET" && state.getFailures > 0) {
      state.getFailures -= 1;
      return route.fulfill({ status: 500, json: { success: false, message: "Internal database error" } });
    }
    if (method === "PATCH" && state.patchFailure) {
      return route.fulfill({ status: state.patchFailure, json: { success: false, message: "Internal database error" } });
    }
    if (method === "PATCH") {
      state.settings = { ...state.settings, ...payload };
      for (const key of ["openingTime", "closingTime"]) {
        if (payload[key]) state.settings[key] = `${payload[key]}:00`;
      }
    }
    return route.fulfill({ json: { success: true, data: state.settings } });
  });

  const page = await context.newPage();
  page.on("pageerror", (error) => state.errors.push(error.message));
  await page.goto(`${baseURL}/admin/settings`);
  return {
    page,
    state,
    async ready() {
      await page.getByRole("heading", { name: "Restaurant Settings" }).waitFor();
      await page.getByRole("tab", { name: "General" }).waitFor();
    },
    async close() {
      await context.close();
      assert.deepEqual(state.errors, []);
    },
  };
}

async function noHorizontalOverflow(page, width) {
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    media: window.matchMedia("(max-width: 1023px)").matches,
    pageWidth: document.documentElement.scrollWidth,
    elements: Array.from(document.querySelectorAll("body *"))
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === "string" ? element.className : "",
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
        width: Math.round(element.getBoundingClientRect().width),
      }))
      .filter((element) => element.right > window.innerWidth + 1)
      .slice(0, 8),
    layout: [".admin-shell", ".admin-workspace", ".admin-topbar", ".admin-mobile-brand", ".admin-icon-button", ".admin-topbar-account", ".settings-tabs"]
      .map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return { selector, missing: true };
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { selector, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), css: style.display, marginLeft: style.marginLeft };
      }),
  }));
  assert.ok(overflow.pageWidth <= width, `settings page overflows at ${width}px: ${JSON.stringify(overflow)}`);
}

test("settings loads backend values, persists only supported changed fields, and remains responsive", async () => {
  const app = await setup();
  try {
    const { page, state } = app;
    await app.ready();

    assert.equal(await page.getByRole("tab").count(), 3);
    assert.equal(await page.getByRole("tab", { name: "Notifications" }).count(), 0);
    assert.equal(await page.getByLabel("Description").count(), 0);
    assert.equal(await page.getByLabel("Restaurant Name").inputValue(), "Occup Restaurant");
    assert.equal(await page.getByRole("tab", { name: "Operating Hours" }).isVisible(), true);
    assert.equal(state.calls[0].method, "GET");
    assert.equal(state.calls[0].authorization, "Bearer settings-browser-test-token");

    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await noHorizontalOverflow(page, width);
      assert.equal(await page.getByRole("heading", { name: "Restaurant Settings" }).isVisible(), true);
      assert.equal(await page.getByRole("button", { name: "Open navigation" }).isVisible(), width < 1024);
      assert.equal(await page.getByRole("button", { name: "Notifications are not available yet" }).isVisible(), true);

      await page.getByRole("tab", { name: "Operating Hours" }).click();
      const opening = await page.getByLabel("Opening Time").boundingBox();
      const closing = await page.getByLabel("Closing Time").boundingBox();
      assert.ok(opening && closing);
      if (width >= 768) assert.ok(closing.x > opening.x, `time inputs should be side by side at ${width}px`);
      else assert.ok(closing.y > opening.y, `time inputs should stack at ${width}px`);

      await page.getByRole("tab", { name: "Booking Rules" }).click();
      await page.getByLabel("Reservation Duration").waitFor();
      if (width <= 639) {
        const save = await page.getByRole("button", { name: "Save Changes" }).boundingBox();
        const footer = await page.locator(".settings-tab-panel:not([hidden]) .settings-form-footer").boundingBox();
        assert.ok(save && footer && Math.abs(save.width - (footer.width - 30)) < 2, "mobile save button should fill the available footer width");
      }
      await noHorizontalOverflow(page, width);
    }

    await page.getByRole("tab", { name: "General" }).click();
    const nameInput = page.getByLabel("Restaurant Name");
    await nameInput.fill("Occup Bistro");
    await page.getByRole("tab", { name: "Operating Hours" }).click();
    await page.getByRole("tab", { name: "General" }).click();
    assert.equal(await nameInput.inputValue(), "Occup Bistro", "switching tabs should preserve unsaved input");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.getByRole("status").getByText("Restaurant name saved.").waitFor();
    assert.deepEqual(state.calls.at(-1).payload, { restaurantName: "Occup Bistro" });

    await page.getByRole("tab", { name: "Operating Hours" }).click();
    const openingTime = page.getByLabel("Opening Time");
    const closingTime = page.getByLabel("Closing Time");
    await openingTime.fill("22:30");
    await closingTime.fill("08:00");
    const patchCountBeforeInvalidHours = state.calls.filter((call) => call.method === "PATCH").length;
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.getByText("Closing time must be later than opening time.").waitFor();
    assert.equal(state.calls.filter((call) => call.method === "PATCH").length, patchCountBeforeInvalidHours, "invalid times must not reach the API");
    await closingTime.fill("23:00");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.getByRole("status").getByText("Operating hours saved.").waitFor();
    assert.deepEqual(state.calls.at(-1).payload, { openingTime: "22:30", closingTime: "23:00" });

    await page.getByRole("tab", { name: "Booking Rules" }).click();
    const duration = page.getByLabel("Reservation Duration");
    await duration.fill("300");
    const patchCountBeforeInvalidRules = state.calls.filter((call) => call.method === "PATCH").length;
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.getByText("Use 240 minutes or fewer.").waitFor();
    assert.equal(state.calls.filter((call) => call.method === "PATCH").length, patchCountBeforeInvalidRules, "invalid booking rules must not reach the API");
    await duration.fill("120");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.getByRole("status").getByText("Booking rules saved.").waitFor();
    assert.deepEqual(state.calls.at(-1).payload, { reservationDuration: 120 });

    await page.reload();
    await app.ready();
    assert.equal(await page.getByLabel("Restaurant Name").inputValue(), "Occup Bistro");
    await page.getByRole("tab", { name: "Operating Hours" }).click();
    assert.equal(await page.getByLabel("Opening Time").inputValue(), "22:30");
    assert.equal(await page.getByLabel("Closing Time").inputValue(), "23:00");
    await page.getByRole("tab", { name: "Booking Rules" }).click();
    assert.equal(await page.getByLabel("Reservation Duration").inputValue(), "120");
    assert.equal(await page.getByLabel("Booking Interval").inputValue(), "30");
  } finally {
    await app.close();
  }
});

test("load and save failures are recoverable and never show a false success", async () => {
  const loadApp = await setup({ state: { getFailures: 2 } });
  try {
    const { page, state } = loadApp;
    await page.getByRole("alert").waitFor();
    assert.match(await page.getByRole("alert").innerText(), /load restaurant settings/i);
    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByRole("tab", { name: "General" }).waitFor();
    assert.equal(state.calls.filter((call) => call.method === "GET").length, 3);
  } finally {
    await loadApp.close();
  }

  const saveApp = await setup({ state: { patchFailure: 500 } });
  try {
    const { page, state } = saveApp;
    await saveApp.ready();
    const nameInput = page.getByLabel("Restaurant Name");
    await nameInput.fill("Unsaved Name");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.getByRole("alert").getByText("We couldn’t save your changes. Please try again.").waitFor();
    assert.equal(await nameInput.inputValue(), "Unsaved Name");
    assert.equal(state.settings.restaurantName, "Occup Restaurant");
  } finally {
    await saveApp.close();
  }
});
