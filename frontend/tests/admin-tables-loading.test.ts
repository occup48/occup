import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

test("a confirmed create survives an older pending table-list response", { timeout: 60000 }, async (t) => {
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    define: { "import.meta.env.VITE_API_URL": "window.location.origin" },
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  });
  t.after(() => server.close());
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(address && typeof address === "object");

  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);

  const timestamp = "2026-01-01T00:00:00.000Z";
  const existingTable = {
    id: "existing-table", tableNumber: "T-10", capacity: 6, location: "Main Room",
    isActive: true, createdAt: timestamp, updatedAt: timestamp,
  };
  const createdTable = { ...existingTable, id: "created-table", tableNumber: "T-2", capacity: 4 };
  let releaseLoad!: () => void;
  const pendingLoad = new Promise<void>((resolve) => { releaseLoad = resolve; });
  t.after(() => releaseLoad());
  let recordLoad!: () => void;
  const loadRequested = new Promise<void>((resolve) => { recordLoad = resolve; });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/user") {
      await route.fulfill({ json: { success: true, data: { user: {
        id: "admin", firstName: "Test", lastName: "Admin", email: "admin@example.com", role: "admin",
      } } } });
    } else if (path === "/api/admin/tables" && request.method() === "GET") {
      // Gate every GET, including those restarted by React StrictMode.
      recordLoad();
      await pendingLoad;
      await route.fulfill({ json: { success: true, data: [existingTable] } });
    } else if (path === "/api/admin/tables" && request.method() === "POST") {
      assert.equal(request.postDataJSON().tableNumber, createdTable.tableNumber);
      await route.fulfill({ status: 201, json: { success: true, data: createdTable } });
    } else {
      await route.abort();
    }
  });
  await page.addInitScript(() => sessionStorage.setItem("occup.accessToken", "test-admin-token"));
  await page.goto(`http://127.0.0.1:${address.port}/admin/tables`);
  await loadRequested;
  assert.equal(await page.getByRole("status", { name: "Loading tables" }).isVisible(), true);

  await page.getByRole("button", { name: "Add Table", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Table Number").fill(createdTable.tableNumber);
  await dialog.getByLabel("Capacity").fill(String(createdTable.capacity));
  await dialog.getByRole("button", { name: "Create Table", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(await page.getByText("Table T-2 created successfully.", { exact: true }).isVisible(), true);

  releaseLoad();
  await page.getByRole("status", { name: "Loading tables" }).waitFor({ state: "hidden" });
  await page.getByRole("article", { name: "Table T-2", exact: true }).waitFor({ state: "visible" });
  assert.equal(await page.getByRole("article", { name: "Table T-10", exact: true }).isVisible(), true);
  assert.deepEqual(await page.locator(".admin-table-card h2").allTextContents(), ["T-2", "T-10"]);
  assert.match(await page.locator(".admin-results-count").innerText(), /Showing 2 of 2 tables[\s\S]*10 seats/);
});
