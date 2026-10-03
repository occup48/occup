import assert from "node:assert/strict";
import { test, after } from "node:test";
import { chromium } from "playwright";

// Browser tests for the booking <-> auth return flow (#14 redirect, #15 sign-up path),
// on the three-step booking wizard. Every HTTP call and the Google script are mocked
// here, so no backend or database is touched.
const baseURL = process.env.AUTH_TEST_URL || "http://localhost:5173";
const browser = await chromium.launch({ headless: true }).catch(() =>
  chromium.launch({ channel: "msedge", headless: true }),
);
after(() => browser.close());

const user = { id: "test-user", firstName: "Ada", lastName: "Okafor", email: "ada@example.com", role: "customer" };
const session = { success: true, data: { user, accessToken: "browser-test-token" } };
const tables = [
  { id: "table-1", tableNumber: "T01", capacity: 2, location: "Window", isActive: true },
  { id: "table-2", tableNumber: "T02", capacity: 4, location: null, isActive: true },
];

// A far-future date keeps the prefill valid no matter when the tests run.
const bookingPath = "/booking?date=2099-01-15&guests=2&time=19:30";
const redirectMessage = "Please sign in to book a table. Taking you to the sign-in page...";

const googleScript = `
  let callback;
  window.google = { accounts: { id: {
    initialize(options) { callback = options.callback; },
    renderButton(host, options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Continue with Google';
      button.style.cssText = 'width:' + options.width + 'px;height:40px';
      button.onclick = () => callback({credential:'browser-test-google-credential'});
      host.appendChild(button);
    }
  } } };
`;

async function openApp({ holdAvailability } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const authCalls = [];
  const availabilityCalls = [];
  const reservationCalls = [];
  const errors = [];
  await context.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({ contentType: "application/javascript", body: googleScript }),
  );
  await context.route(/\/api\/availability/, async (route) => {
    availabilityCalls.push(new URL(route.request().url()).searchParams);
    if (holdAvailability) await holdAvailability; // lets a test keep a search pending
    return route.fulfill({ json: { success: true, data: { tables } } });
  });
  // A signed-out guest must never reach this endpoint; any call is recorded and failed.
  await context.route(/\/api\/reservations/, (route) => {
    reservationCalls.push(route.request().method());
    return route.fulfill({ status: 500, json: { success: false } });
  });
  await context.route("**/api/auth/**", (route) => {
    const request = route.request();
    authCalls.push({ url: request.url(), method: request.method() });
    if (request.method() === "POST" && /sign-?up$/.test(new URL(request.url()).pathname)) {
      return route.fulfill({ status: 201, json: { success: true, data: { user } } });
    }
    return route.fulfill({ json: session });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  return {
    page,
    authCalls,
    availabilityCalls,
    reservationCalls,
    async close() {
      assert.deepEqual(errors, []);
      await context.close();
    },
  };
}

async function fillSignIn(page) {
  await page.getByLabel("Email address").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("ValidPass1!");
}

async function fillSignUp(page) {
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Okafor");
  await page.getByLabel("Email address").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("ValidPass1!");
  await page.getByLabel("Confirm password", { exact: true }).fill("ValidPass1!");
}

const next = (page) => page.getByRole("button", { name: "Next", exact: true });

// Walks the wizard from the prefilled link up to the Review screen.
async function walkToReview(page) {
  await page.goto(baseURL + bookingPath);
  await next(page).click(); // Date & Guests -> Time (the linked time is preselected)
  await page.getByRole("heading", { name: "Select a Time" }).waitFor();
  await next(page).click(); // Time -> Table (runs the availability search)
  await page.getByRole("heading", { name: "Choose Your Table" }).waitFor();
  await page.getByRole("button", { name: "T01" }).click();
  await next(page).click(); // Table -> Review
  await page.getByRole("heading", { name: "Review Your Reservation" }).waitFor();
}

// Signed out: confirm, ending on the "taking you to sign-in" message.
async function reachConfirmSignedOut(page) {
  await walkToReview(page);
  await page.getByRole("button", { name: "Confirm Reservation", exact: true }).click();
  await page.getByText(redirectMessage).waitFor();
}

function isPrefilledBookingUrl(url) {
  return (
    url.pathname === "/booking" &&
    url.searchParams.get("date") === "2099-01-15" &&
    url.searchParams.get("guests") === "2" &&
    url.searchParams.get("time") === "19:30"
  );
}

// Back on the wizard with the linked search still in place: the date, the 7:30 PM slot,
// and a table search that carries the original date, time and party size.
async function assertBackOnPrefilledBooking(app) {
  const { page } = app;
  await page.waitForURL(isPrefilledBookingUrl);
  await page.getByRole("heading", { name: "Let's Find Your Table" }).waitFor();
  await page.getByRole("button", { name: "Date, Jan 15, 2099" }).waitFor();
  await next(page).click();
  await page.getByRole("heading", { name: "Select a Time" }).waitFor();
  const slot = page.getByRole("button", { name: "7:30 PM", exact: true });
  assert.equal(await slot.getAttribute("aria-pressed"), "true");
  await next(page).click();
  await page.getByRole("button", { name: "T01" }).waitFor();
  const search = app.availabilityCalls.at(-1);
  assert.equal(search.get("date"), "2099-01-15");
  assert.equal(search.get("time"), "19:30");
  assert.equal(search.get("partySize"), "2");
}

test("an unauthenticated confirm redirects to sign-in and returns to the prefilled booking form", async () => {
  const app = await openApp();
  try {
    await reachConfirmSignedOut(app.page);
    await app.page.waitForURL("**/signin");
    await app.page.getByRole("heading", { name: "Log in to your account" }).waitFor();
    await fillSignIn(app.page);
    await app.page.getByRole("button", { name: "Log in", exact: true }).click();
    await assertBackOnPrefilledBooking(app);
    assert.equal(
      await app.page.evaluate(() => localStorage.getItem("occup.accessToken")),
      "browser-test-token",
    );
    assert.equal(app.reservationCalls.length, 0);
  } finally {
    await app.close();
  }
});

test("going Back during the redirect delay cancels it", async () => {
  const app = await openApp();
  try {
    // Control the page clock so the 2 second redirect timer cannot fire on its own.
    await app.page.clock.install();
    await walkToReview(app.page);
    const confirm = app.page.getByRole("button", { name: "Confirm Reservation", exact: true });
    // Freeze time here: from now on, timers only fire when the test advances the clock.
    await app.page.clock.pauseAt(new Date(Date.now() + 5000));
    await confirm.click();
    await app.page.getByText(redirectMessage).waitFor();
    await app.page.getByRole("button", { name: "Back", exact: true }).click();
    await app.page.getByRole("heading", { name: "Choose Your Table" }).waitFor();
    // Advance well past the 2 second delay. A redirect that was not cancelled would fire now.
    await app.page.clock.runFor(5000);
    assert.equal(new URL(app.page.url()).pathname, "/booking");
    await app.page.getByRole("button", { name: "T01" }).waitFor();
    assert.equal(app.reservationCalls.length, 0);
  } finally {
    await app.close();
  }
});

const switchers = {
  "the bottom link": (page) =>
    page.locator(".auth-switch-prompt").getByRole("link", { name: "Create account" }),
  "the Create account tab": (page) =>
    page
      .getByRole("navigation", { name: "Account access" })
      .getByRole("link", { name: "Create account" }),
};

for (const [label, pickSwitch] of Object.entries(switchers)) {
  test(`creating an account first (via ${label}) still returns to the prefilled booking form`, async () => {
    const app = await openApp();
    try {
      await reachConfirmSignedOut(app.page);
      await app.page.waitForURL("**/signin");
      await app.page.getByRole("heading", { name: "Log in to your account" }).waitFor();
      await pickSwitch(app.page).click();
      await app.page.waitForURL("**/signup");
      await app.page.getByRole("heading", { name: "Create your account" }).waitFor();
      await fillSignUp(app.page);
      await app.page.getByRole("button", { name: "Create Account", exact: true }).click();
      await app.page.waitForURL("**/signin");
      await app.page.getByRole("status").filter({ hasText: "Your account is ready" }).waitFor();
      await app.page.getByLabel("Password", { exact: true }).fill("ValidPass1!");
      await app.page.getByRole("button", { name: "Log in", exact: true }).click();
      await assertBackOnPrefilledBooking(app);
      assert.ok(
        app.authCalls.some(
          (call) => call.method === "POST" && /sign-?up$/.test(new URL(call.url).pathname),
        ),
      );
      assert.equal(app.reservationCalls.length, 0);
    } finally {
      await app.close();
    }
  });
}

test("a search still pending when the guest goes Back does not open the table step", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const app = await openApp({ holdAvailability: gate });
  try {
    await app.page.goto(baseURL + bookingPath);
    await next(app.page).click();
    await app.page.getByRole("heading", { name: "Select a Time" }).waitFor();
    await next(app.page).click(); // starts the availability search, which the test holds back
    await app.page.getByRole("button", { name: "Checking...", exact: true }).waitFor();
    await app.page.getByRole("button", { name: "Back", exact: true }).click();
    await app.page.getByRole("heading", { name: "Let's Find Your Table" }).waitFor();
    const answered = app.page.waitForResponse(/\/api\/availability/);
    release();
    await answered;
    // Give the page a moment to handle the late response, then check that nothing moved.
    await app.page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
    assert.equal(await app.page.getByRole("heading", { name: "Choose Your Table" }).count(), 0);
    await app.page.getByRole("heading", { name: "Let's Find Your Table" }).waitFor();
  } finally {
    release();
    await app.close();
  }
});

test("choosing a party size changes the availability request", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + bookingPath);
    await app.page.getByRole("combobox", { name: "Party size" }).click();
    await app.page.getByRole("option", { name: "4 Guests", exact: true }).click();
    await next(app.page).click();
    await app.page.getByRole("heading", { name: "Select a Time" }).waitFor();
    await next(app.page).click();
    await app.page.getByRole("button", { name: "T01" }).waitFor();
    const search = app.availabilityCalls.at(-1);
    assert.equal(search.get("partySize"), "4");
    assert.equal(search.get("date"), "2099-01-15");
    assert.equal(search.get("time"), "19:30");
  } finally {
    await app.close();
  }
});

test("choosing a day in the calendar changes the availability request", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + bookingPath);
    await app.page.getByRole("button", { name: /^Date,/ }).click();
    // The calendar opens on the linked month (January 2099); pick the 20th.
    await app.page.getByRole("button", { name: /January 20(?!\d)/ }).click();
    await app.page.getByRole("button", { name: "Date, Jan 20, 2099" }).waitFor();
    await next(app.page).click();
    await app.page.getByRole("heading", { name: "Select a Time" }).waitFor();
    await next(app.page).click();
    await app.page.getByRole("button", { name: "T01" }).waitFor();
    const search = app.availabilityCalls.at(-1);
    assert.equal(search.get("date"), "2099-01-20");
    assert.equal(search.get("partySize"), "2");
    assert.equal(search.get("time"), "19:30");
  } finally {
    await app.close();
  }
});

test("a slot that starts while the page is open becomes unavailable", async () => {
  const app = await openApp();
  try {
    // 11:59:30 in Lagos (UTC+1) on the linked day: every slot from 12:00 PM on is still bookable.
    await app.page.clock.install({ time: new Date("2099-01-15T10:59:30Z") });
    await app.page.goto(baseURL + bookingPath);
    await next(app.page).click();
    await app.page.getByRole("heading", { name: "Select a Time" }).waitFor();
    const noon = app.page.getByRole("button", { name: "12:00 PM", exact: true });
    assert.equal(await noon.isDisabled(), false);
    await app.page.clock.runFor(31_000);
    assert.equal(await noon.isDisabled(), true);
  } finally {
    await app.close();
  }
});
