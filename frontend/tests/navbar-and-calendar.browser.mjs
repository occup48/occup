import assert from "node:assert/strict";
import { after, test } from "node:test";
import { chromium } from "playwright";

// Browser tests for the navbar highlight and for today dropping out of the booking calendar.
// Every HTTP call is mocked, so no backend or database is touched.
const baseURL = process.env.AUTH_TEST_URL || "http://localhost:5173";
const browser = await chromium.launch({ headless: true }).catch(() =>
  chromium.launch({ channel: "msedge", headless: true }),
);
after(() => browser.close());

const user = { id: "test-user", firstName: "Ada", lastName: "Okafor", email: "ada@example.com", role: "customer" };

async function openApp({ signedIn = true, now } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  if (signedIn) await context.addInitScript(() => localStorage.setItem("occup.accessToken", "navbar-test-token"));
  await context.route("https://accounts.google.com/**", (route) => route.abort());
  await context.route("**/api/auth/user", (route) => route.fulfill({ json: { success: true, data: { user } } }));
  await context.route(/\/api\/reservations$/, (route) =>
    route.fulfill({ json: { success: true, data: { reservations: [] } } }),
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  if (now) await page.clock.install({ time: new Date(now) });
  return {
    page,
    async close() {
      assert.deepEqual(errors, []);
      await context.close();
    },
  };
}

const desktopNav = (page) => page.getByRole("navigation", { name: "Main navigation" });

test("on the homepage, Home is the current page", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + "/");
    const home = desktopNav(app.page).getByRole("link", { name: "Home" });
    assert.equal(await home.getAttribute("aria-current"), "page");
    assert.equal(await desktopNav(app.page).getByRole("link", { name: "About" }).getAttribute("href"), "#about");
  } finally {
    await app.close();
  }
});

test("on My reservations, Home is no longer highlighted, My Reservations is, and section links lead home", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + "/reservations");
    await app.page.getByRole("heading", { name: "My reservations" }).waitFor();
    const nav = desktopNav(app.page);
    assert.equal(await nav.getByRole("link", { name: "Home" }).getAttribute("aria-current"), null);
    assert.equal(
      await app.page.getByRole("link", { name: "Your reservations" }).getAttribute("aria-current"),
      "page",
    );
    for (const [label, href] of [["Home", "/#home"], ["About", "/#about"], ["Menu", "/#menu"], ["Contact", "/#contact"]]) {
      assert.equal(await nav.getByRole("link", { name: label }).getAttribute("href"), href);
    }
    await nav.getByRole("link", { name: "About" }).click();
    await app.page.waitForURL(`${baseURL}/#about`);
  } finally {
    await app.close();
  }
});

async function openCalendar(page) {
  await page.goto(baseURL + "/booking");
  await page.getByRole("heading", { name: "Let's Find Your Table" }).waitFor();
  await page.getByRole("button", { name: /^Date, / }).click();
  await page.locator("[data-day]").first().waitFor();
}

test("today is pickable in the calendar while a slot is still ahead", async () => {
  // 12:00 UTC is 13:00 in Lagos.
  const app = await openApp({ now: "2026-10-08T12:00:00Z" });
  try {
    await openCalendar(app.page);
    const today = app.page.locator('[data-day="2026-10-08"] button, button[data-day="2026-10-08"]').first();
    assert.equal(await today.isDisabled(), false);
  } finally {
    await app.close();
  }
});

test("today is greyed out once the last slot has passed, and tomorrow is still pickable", async () => {
  // 21:30 UTC is 22:30 in Lagos, after the 9:30 PM slot.
  const app = await openApp({ now: "2026-10-08T21:30:00Z" });
  try {
    await openCalendar(app.page);
    const today = app.page.locator('[data-day="2026-10-08"] button, button[data-day="2026-10-08"]').first();
    const tomorrow = app.page.locator('[data-day="2026-10-09"] button, button[data-day="2026-10-09"]').first();
    assert.equal(await today.isDisabled(), true);
    assert.equal(await tomorrow.isDisabled(), false);
  } finally {
    await app.close();
  }
});

test("a link for today is ignored once today has no slots left", async () => {
  const app = await openApp({ now: "2026-10-08T21:30:00Z" });
  try {
    await app.page.goto(baseURL + "/booking?date=2026-10-08&guests=2&time=21:30");
    await app.page.getByRole("heading", { name: "Let's Find Your Table" }).waitFor();
    await app.page.getByRole("button", { name: "Date, Oct 9, 2026" }).waitFor();
  } finally {
    await app.close();
  }
});
