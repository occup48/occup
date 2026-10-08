import assert from "node:assert/strict";
import { after, test } from "node:test";
import { chromium } from "playwright";

// Browser tests for the customer reservations screens (list, detail, cancel).
// Every HTTP call is mocked here, so no backend or database is touched.
const baseURL = process.env.AUTH_TEST_URL || "http://localhost:5173";
const browser = await chromium.launch({ headless: true }).catch(() =>
  chromium.launch({ channel: "msedge", headless: true }),
);
after(() => browser.close());

const user = { id: "test-user", firstName: "Ada", lastName: "Okafor", email: "ada@example.com", role: "customer" };
const TOKEN = "reservations-test-token";
const table1 = { id: "table-1", tableNumber: "T01", location: "Window", capacity: 4 };
const table2 = { id: "table-2", tableNumber: "T02", location: null, capacity: 2 };

// Far-future dates are always upcoming and 2020 is always past, whenever the tests run.
const make = (id, overrides = {}) => ({
  id,
  reservationDate: "2099-01-15",
  startTime: "19:00",
  endTime: "20:30",
  partySize: 2,
  status: "confirmed",
  specialRequests: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  table: table1,
  canCancel: true,
  ...overrides,
});

const seed = () => [
  make("11111111-1111-4111-8111-111111111111", { specialRequests: "Birthday dinner, window please" }),
  make("22222222-2222-4222-8222-222222222222", { reservationDate: "2099-01-10", startTime: "12:00", endTime: "13:30", partySize: 1, table: table2 }),
  make("33333333-3333-4333-8333-333333333333", { reservationDate: "2099-02-01", status: "cancelled", canCancel: false }),
  make("44444444-4444-4444-8444-444444444444", { reservationDate: "2020-05-05", status: "completed", canCancel: false }),
  make("55555555-5555-4555-8555-555555555555", { reservationDate: "2020-05-06", canCancel: false }), // confirmed, long over
];
const [A, B, CANCELLED, COMPLETED, OLD] = seed().map((r) => r.id);
const LOCKED = make("66666666-6666-4666-8666-666666666666", { reservationDate: "2099-03-01", canCancel: false });

async function openApp({ signedIn = true, reservations = seed(), width = 1280 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  if (signedIn) await context.addInitScript((token) => localStorage.setItem("occup.accessToken", token), TOKEN);
  const state = {
    reservations,
    listCalls: 0,
    detailCalls: [],
    cancelCalls: [],
    listStatus: 200,
    cancelResponse: null, // { status, json } for the next cancel, else a real cancel
    holdCancel: null, // a promise the next cancel waits on
    errors: [],
  };
  await context.route("https://accounts.google.com/**", (route) => route.abort());
  await context.route("**/api/auth/user", (route) =>
    route.fulfill({ json: { success: true, data: { user } } }),
  );
  await context.route(/\/api\/auth\/sign-?in$/, (route) =>
    route.fulfill({ json: { success: true, data: { user, accessToken: TOKEN } } }),
  );
  await context.route(/\/api\/reservations(\/.*)?$/, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/reservations", "");
    const authorization = request.headers().authorization;
    if (request.method() === "GET" && path === "") {
      state.listCalls += 1;
      if (state.listStatus !== 200) return route.fulfill({ status: state.listStatus, json: { success: false } });
      return route.fulfill({ json: { success: true, data: { reservations: state.reservations } } });
    }
    const id = path.split("/")[1];
    const found = state.reservations.find((r) => r.id === id);
    if (request.method() === "GET") {
      state.detailCalls.push({ id, authorization });
      return found
        ? route.fulfill({ json: { success: true, data: { reservation: found } } })
        : route.fulfill({ status: 404, json: { success: false, message: "Reservation not found" } });
    }
    if (request.method() === "PATCH" && path.endsWith("/cancel")) {
      state.cancelCalls.push({ id, authorization });
      if (state.holdCancel) await state.holdCancel;
      if (state.cancelResponse) {
        const response = state.cancelResponse;
        state.cancelResponse = null;
        return route.fulfill(response);
      }
      Object.assign(found, { status: "cancelled", canCancel: false });
      return route.fulfill({ json: { success: true, data: { reservation: found } } });
    }
    return route.fulfill({ status: 500, json: { success: false } });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => state.errors.push(error.message));
  return {
    page,
    state,
    async close() {
      assert.deepEqual(state.errors, []);
      await context.close();
    },
  };
}

const cards = (page) => page.getByTestId("reservation-card");
const tab = (page, name) => page.getByRole("tab", { name });

test("a signed-out guest is sent to sign in and brought back to their reservations", async () => {
  const app = await openApp({ signedIn: false });
  try {
    await app.page.goto(baseURL + "/reservations");
    await app.page.waitForURL("**/signin");
    await app.page.getByLabel("Email address").fill("ada@example.com");
    await app.page.getByLabel("Password", { exact: true }).fill("ValidPass1!");
    await app.page.getByRole("button", { name: "Log in", exact: true }).click();
    await app.page.waitForURL("**/reservations");
    await app.page.getByRole("heading", { name: "My reservations" }).waitFor();
    assert.equal(await cards(app.page).count(), 2);
  } finally {
    await app.close();
  }
});

test("a signed-out guest opening one reservation returns to it after signing in", async () => {
  const app = await openApp({ signedIn: false });
  try {
    await app.page.goto(baseURL + `/reservations/${A}`);
    await app.page.waitForURL("**/signin");
    await app.page.getByLabel("Email address").fill("ada@example.com");
    await app.page.getByLabel("Password", { exact: true }).fill("ValidPass1!");
    await app.page.getByRole("button", { name: "Log in", exact: true }).click();
    await app.page.waitForURL(`**/reservations/${A}`);
    await app.page.getByRole("heading", { name: "Reservation details" }).waitFor();
  } finally {
    await app.close();
  }
});

test("upcoming reservations come soonest first, with cancel only where the server allows it", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + "/reservations");
    await app.page.getByRole("heading", { name: "My reservations" }).waitFor();
    await cards(app.page).first().waitFor();

    assert.equal(await tab(app.page, /Upcoming/).getAttribute("aria-selected"), "true");
    assert.match(await tab(app.page, /Upcoming/).innerText(), /\(2\)/);
    assert.match(await tab(app.page, /Past/).innerText(), /\(3\)/);

    const upcoming = cards(app.page);
    assert.equal(await upcoming.count(), 2);
    assert.match(await upcoming.nth(0).innerText(), /Jan 10, 2099[\s\S]*Confirmed[\s\S]*12:00 PM – 1:30 PM[\s\S]*1 guest\b[\s\S]*Table T02/);
    assert.match(await upcoming.nth(1).innerText(), /Jan 15, 2099[\s\S]*7:00 PM – 8:30 PM[\s\S]*2 guests[\s\S]*Table T01 · Window/);
    assert.equal(await upcoming.getByRole("button", { name: "Cancel reservation" }).count(), 2);
    assert.equal(await upcoming.getByRole("link", { name: "View details" }).count(), 2);
  } finally {
    await app.close();
  }
});

test("the Past tab lists cancelled, completed and long-over bookings, none cancellable", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + "/reservations");
    await cards(app.page).first().waitFor();
    await tab(app.page, /Past/).click();
    const past = cards(app.page);
    assert.equal(await past.count(), 3);
    const texts = await past.allInnerTexts();
    assert.match(texts[0], /Feb 1, 2099[\s\S]*Cancelled/);
    assert.match(texts[1], /May 6, 2020[\s\S]*Completed/); // confirmed in the database, over in real life
    assert.match(texts[2], /May 5, 2020[\s\S]*Completed/);
    assert.equal(await app.page.getByRole("button", { name: "Cancel reservation" }).count(), 0);
  } finally {
    await app.close();
  }
});

test("a guest with no bookings sees an empty state that points to booking", async () => {
  const app = await openApp({ reservations: [] });
  try {
    await app.page.goto(baseURL + "/reservations");
    await app.page.getByText("No upcoming reservations").waitFor();
    await app.page.getByRole("main").getByRole("link", { name: "Book a table" }).last().click();
    await app.page.waitForURL("**/booking");
  } finally {
    await app.close();
  }
});

test("a failed load shows an error with Try again, which recovers", async () => {
  const app = await openApp();
  app.state.listStatus = 500;
  try {
    await app.page.goto(baseURL + "/reservations");
    const alert = app.page.getByRole("alert");
    await alert.getByText("We couldn't load your reservations. Please try again.").waitFor();
    app.state.listStatus = 200;
    await alert.getByRole("button", { name: "Try again" }).click();
    await cards(app.page).first().waitFor();
    assert.equal(await cards(app.page).count(), 2);
    assert.equal(await app.page.getByRole("alert").count(), 0);
  } finally {
    await app.close();
  }
});

test("an expired session on load signs the guest out and returns them after sign-in", async () => {
  const app = await openApp();
  app.state.listStatus = 401;
  try {
    await app.page.goto(baseURL + "/reservations");
    await app.page.waitForURL("**/signin");
    assert.equal(await app.page.evaluate(() => localStorage.getItem("occup.accessToken")), null);
  } finally {
    await app.close();
  }
});

test("keeping a reservation closes the dialog and sends nothing", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + "/reservations");
    await cards(app.page).first().waitFor();
    await cards(app.page).nth(1).getByRole("button", { name: "Cancel reservation" }).click();
    const dialog = app.page.getByRole("dialog");
    await dialog.getByRole("heading", { name: "Cancel this reservation?" }).waitFor();
    assert.match(await dialog.innerText(), /Jan 15, 2099 at 7:00 PM, Table T01 · Window, 2 guests/);
    await dialog.getByRole("button", { name: "Keep reservation" }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(app.state.cancelCalls.length, 0);
    assert.equal(await cards(app.page).count(), 2);
  } finally {
    await app.close();
  }
});

test("Escape also closes the dialog without cancelling", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + "/reservations");
    await cards(app.page).first().waitFor();
    await cards(app.page).first().getByRole("button", { name: "Cancel reservation" }).click();
    await app.page.getByRole("dialog").waitFor();
    await app.page.keyboard.press("Escape");
    await app.page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(app.state.cancelCalls.length, 0);
  } finally {
    await app.close();
  }
});

test("confirming cancels with the guest's token and moves the booking to Past as Cancelled", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + "/reservations");
    await cards(app.page).first().waitFor();
    await cards(app.page).nth(1).getByRole("button", { name: "Cancel reservation" }).click();
    await app.page.getByRole("dialog").getByRole("button", { name: "Yes, cancel reservation" }).click();
    await app.page.getByRole("status").getByText("Your reservation has been cancelled.").waitFor();

    assert.deepEqual(app.state.cancelCalls, [{ id: A, authorization: `Bearer ${TOKEN}` }]);
    assert.equal(await cards(app.page).count(), 1);
    assert.match(await tab(app.page, /Upcoming/).innerText(), /\(1\)/);
    assert.match(await tab(app.page, /Past/).innerText(), /\(4\)/);
    await tab(app.page, /Past/).click();
    assert.match(await cards(app.page).first().innerText(), /Feb 1, 2099|Jan 15, 2099/);
    const labels = await cards(app.page).allInnerTexts();
    assert.equal(labels.filter((t) => /Jan 15, 2099[\s\S]*Cancelled/.test(t)).length, 1);
  } finally {
    await app.close();
  }
});

test("pressing confirm twice sends one request", async () => {
  const app = await openApp();
  let release;
  app.state.holdCancel = new Promise((resolve) => (release = resolve));
  try {
    await app.page.goto(baseURL + "/reservations");
    await cards(app.page).first().waitFor();
    await cards(app.page).first().getByRole("button", { name: "Cancel reservation" }).click();
    const confirm = app.page.getByRole("dialog").getByRole("button", { name: /^(Yes, cancel reservation|Cancelling\.\.\.)$/ });
    await confirm.click();
    await app.page.getByRole("button", { name: "Cancelling..." }).waitFor();
    assert.equal(await app.page.getByRole("button", { name: "Cancelling..." }).isDisabled(), true);
    await confirm.click({ force: true, noWaitAfter: true }).catch(() => {});
    release();
    await app.page.getByText("Your reservation has been cancelled.").waitFor();
    assert.equal(app.state.cancelCalls.length, 1);
  } finally {
    await app.close();
  }
});

test("a server error keeps the dialog open with a message, and retrying works", async () => {
  const app = await openApp();
  app.state.cancelResponse = { status: 500, json: { success: false } };
  try {
    await app.page.goto(baseURL + "/reservations");
    await cards(app.page).first().waitFor();
    await cards(app.page).first().getByRole("button", { name: "Cancel reservation" }).click();
    const dialog = app.page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Yes, cancel reservation" }).click();
    await dialog.getByRole("alert").getByText("We couldn't cancel your reservation. Please try again.").waitFor();
    assert.equal(await cards(app.page).count(), 2);
    await dialog.getByRole("button", { name: "Yes, cancel reservation" }).click();
    await app.page.getByText("Your reservation has been cancelled.").waitFor();
    assert.equal(app.state.cancelCalls.length, 2);
  } finally {
    await app.close();
  }
});

test("a booking already cancelled elsewhere closes the dialog, explains, and refreshes the list", async () => {
  const app = await openApp();
  app.state.cancelResponse = {
    status: 409,
    json: { success: false, code: "ALREADY_CANCELLED", message: "This reservation has already been cancelled." },
  };
  try {
    await app.page.goto(baseURL + "/reservations");
    await cards(app.page).first().waitFor();
    const loadsBefore = app.state.listCalls;
    await cards(app.page).first().getByRole("button", { name: "Cancel reservation" }).click();
    await app.page.getByRole("dialog").getByRole("button", { name: "Yes, cancel reservation" }).click();
    await app.page.getByRole("status").getByText("This reservation has already been cancelled.").waitFor();
    await app.page.getByRole("dialog").waitFor({ state: "hidden" });
    await app.page.waitForFunction(() => document.querySelectorAll('[data-testid="reservation-card"]').length > 0);
    assert.equal(app.state.listCalls, loadsBefore + 1);
  } finally {
    await app.close();
  }
});

test("a session that expires during cancel signs the guest out and sends them to sign in", async () => {
  const app = await openApp();
  app.state.cancelResponse = { status: 401, json: { success: false, message: "Invalid or expired token" } };
  try {
    await app.page.goto(baseURL + "/reservations");
    await cards(app.page).first().waitFor();
    await cards(app.page).first().getByRole("button", { name: "Cancel reservation" }).click();
    await app.page.getByRole("dialog").getByRole("button", { name: "Yes, cancel reservation" }).click();
    await app.page.waitForURL("**/signin");
    assert.equal(await app.page.evaluate(() => localStorage.getItem("occup.accessToken")), null);
    assert.equal(app.state.cancelCalls.length, 1);
  } finally {
    await app.close();
  }
});

test("a booking that can no longer be cancelled is explained, not retried", async () => {
  const app = await openApp();
  app.state.cancelResponse = {
    status: 409,
    json: { success: false, code: "NOT_CANCELLABLE", message: "This reservation can no longer be cancelled." },
  };
  try {
    await app.page.goto(baseURL + "/reservations");
    await cards(app.page).first().waitFor();
    await cards(app.page).first().getByRole("button", { name: "Cancel reservation" }).click();
    await app.page.getByRole("dialog").getByRole("button", { name: "Yes, cancel reservation" }).click();
    await app.page.getByRole("status").getByText("This reservation can no longer be cancelled.").waitFor();
    assert.equal(app.state.cancelCalls.length, 1);
  } finally {
    await app.close();
  }
});

test("the detail page shows everything about the booking", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + `/reservations/${A}`);
    await app.page.getByRole("heading", { name: "Reservation details" }).waitFor();
    const main = app.page.getByRole("main");
    const text = await main.innerText();
    assert.match(text, /Reference\s+11111111/);
    assert.match(text, /Confirmed/);
    assert.match(text, /Jan 15, 2099/);
    assert.match(text, /7:00 PM – 8:30 PM/);
    assert.match(text, /Table T01 · Window/);
    assert.match(text, /Birthday dinner, window please/);
    assert.equal(app.state.detailCalls[0].authorization, `Bearer ${TOKEN}`);
    await main.getByRole("link", { name: "All reservations" }).click();
    await app.page.waitForURL("**/reservations");
  } finally {
    await app.close();
  }
});

test("opening a card's View details leads to that booking", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + "/reservations");
    await cards(app.page).first().waitFor();
    await cards(app.page).first().getByRole("link", { name: "View details" }).click();
    await app.page.waitForURL(`**/reservations/${B}`);
    await app.page.getByText("Table T02").waitFor();
  } finally {
    await app.close();
  }
});

test("cancelling from the detail page updates it in place", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + `/reservations/${A}`);
    await app.page.getByRole("button", { name: "Cancel reservation" }).click();
    await app.page.getByRole("dialog").getByRole("button", { name: "Yes, cancel reservation" }).click();
    await app.page.getByRole("status").getByText("Your reservation has been cancelled.").waitFor();
    const main = app.page.getByRole("main");
    await main.getByText("Cancelled", { exact: true }).waitFor();
    assert.equal(await main.getByRole("button", { name: "Cancel reservation" }).count(), 0);
    assert.deepEqual(app.state.cancelCalls.map((c) => c.id), [A]);
  } finally {
    await app.close();
  }
});

test("an upcoming booking the server won't let go explains why instead of offering cancel", async () => {
  const app = await openApp({ reservations: [...seed(), LOCKED] });
  try {
    await app.page.goto(baseURL + `/reservations/${LOCKED.id}`);
    await app.page.getByText("This reservation can no longer be cancelled online.").waitFor();
    assert.equal(await app.page.getByRole("button", { name: "Cancel reservation" }).count(), 0);
  } finally {
    await app.close();
  }
});

test("a past booking shows no cancel button and no warning", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + `/reservations/${COMPLETED}`);
    await app.page.getByRole("heading", { name: "Reservation details" }).waitFor();
    await app.page.getByRole("main").getByText("Completed", { exact: true }).waitFor();
    assert.equal(await app.page.getByRole("button", { name: "Cancel reservation" }).count(), 0);
    assert.equal(await app.page.getByText("can no longer be cancelled").count(), 0);
  } finally {
    await app.close();
  }
});

test("an unknown or someone else's reservation shows not-found", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + "/reservations/99999999-9999-4999-8999-999999999999");
    await app.page.getByRole("heading", { name: "We couldn't find that reservation" }).waitFor();
    await app.page.getByRole("link", { name: "Back to my reservations" }).click();
    await app.page.waitForURL("**/reservations");
  } finally {
    await app.close();
  }
});

test("the navbar's My Reservations link reaches the list", async () => {
  const app = await openApp();
  try {
    await app.page.goto(baseURL + "/");
    await app.page.getByRole("link", { name: "Your reservations" }).click();
    await app.page.waitForURL("**/reservations");
    await cards(app.page).first().waitFor();
  } finally {
    await app.close();
  }
});

for (const [name, path] of [
  ["the list", "/reservations"],
  ["the detail page", `/reservations/${A}`],
]) {
  test(`${name} fits a 390px phone with no sideways scroll, including the dialog`, async () => {
    const app = await openApp({ width: 390 });
    try {
      await app.page.goto(baseURL + path);
      await app.page.getByRole("button", { name: "Cancel reservation" }).first().waitFor();
      const overflow = () =>
        app.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok((await overflow()) <= 0, "page scrolls sideways");
      await app.page.getByRole("button", { name: "Cancel reservation" }).first().click();
      const dialog = app.page.getByRole("dialog");
      await dialog.waitFor();
      const box = await dialog.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= 390, "dialog spills off screen");
      assert.ok((await overflow()) <= 0, "dialog makes the page scroll sideways");
      for (const button of await dialog.getByRole("button").all()) {
        const size = await button.boundingBox();
        assert.ok(size.height >= 40, "dialog button is too short to tap");
      }
    } finally {
      await app.close();
    }
  });
}

test("the booking success page links to My reservations", async () => {
  const app = await openApp();
  try {
    await app.page.route(/\/api\/availability/, (route) =>
      route.fulfill({
        json: { success: true, data: { tables: [{ id: "table-1", tableNumber: "T01", capacity: 2, location: "Window", isActive: true }] } },
      }),
    );
    const created = { id: "77777777-7777-4777-8777-777777777777", tableId: "table-1", reservationDate: "2099-01-15", startTime: "19:30", endTime: "21:00", partySize: 2, specialRequests: null, status: "confirmed" };
    await app.page.route(/\/api\/reservations$/, (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 201, json: { success: true, data: { reservation: created } } })
        : route.fallback(),
    );
    await app.page.goto(baseURL + "/booking?date=2099-01-15&guests=2&time=19:30");
    const next = app.page.getByRole("button", { name: "Next", exact: true });
    await next.click();
    await app.page.getByRole("heading", { name: "Select a Time" }).waitFor();
    await next.click();
    await app.page.getByRole("button", { name: "T01" }).click();
    await next.click();
    await app.page.getByRole("button", { name: "Confirm Reservation", exact: true }).click();
    await app.page.getByRole("heading", { name: "Reservation Confirmed!" }).waitFor();
    await app.page.getByRole("link", { name: "View my reservations" }).click();
    await app.page.waitForURL("**/reservations");
  } finally {
    await app.close();
  }
});
