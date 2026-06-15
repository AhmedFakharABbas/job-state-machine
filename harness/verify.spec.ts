/**
 * Self-assessment harness for the full-stack technical exercise.
 *
 * Run after your application is up via `docker compose up -d`:
 *   cd harness
 *   npm install
 *   npx playwright install --with-deps chromium    # first run only
 *   npx playwright test
 *
 * The harness drives your UI through a browser. Your UI must expose the
 * `data-testid` attributes listed in §5.4 of the spec; without them the
 * harness cannot find your elements and will fail.
 *
 * The harness uses far-future submission times for each scenario so they do
 * not interfere with each other and you do not need to reset state between
 * runs.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// ---------- fixtures ----------
const ALICE_TOKEN = "tok_alice_a1b2c3d4e5f6"; // user-001
const BOB_TOKEN = "tok_bob_b2c3d4e5f6a1"; // user-002

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

// Maximum time we wait for a job to reach a terminal state (COMPLETED or FAILED).
// The spec says transitions are ~1s + ~1s = ~2s; we allow generous slack.
const TERMINAL_TIMEOUT_MS = 12_000;

// ---------- helpers ----------
function isoOffset(minutesAhead: number, durationMinutes = 60): { start: string; end: string } {
  const start = new Date(Date.now() + minutesAhead * 60_000);
  start.setUTCSeconds(0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/\.\d{3}Z$/, ".000Z"); // canonical ".000Z" suffix
  return { start: fmt(start), end: fmt(end) };
}

async function login(page: Page, token: string): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("login-token-input").fill(token);
  await page.getByTestId("login-submit").click();
  // After successful login we should be on /
  await page.waitForURL("**/", { timeout: 8_000 });
  await expect(page.getByTestId("job-list")).toBeVisible();
}

async function fillCreateForm(
  page: Page,
  fields: { asset: string; operation: string; start: string; end: string },
): Promise<void> {
  await page.getByTestId("create-job-asset").fill(fields.asset);
  await page.getByTestId("create-job-operation").fill(fields.operation);
  await page.getByTestId("create-job-start").fill(fields.start);
  await page.getByTestId("create-job-end").fill(fields.end);
}

async function submitJob(
  page: Page,
  fields: { asset: string; operation: string; start: string; end: string },
): Promise<string | null> {
  await fillCreateForm(page, fields);

  // Capture the new job id from the row that appears after submission.
  // We do this by snapshotting existing job_ids first, then diffing.
  const before = await page
    .getByTestId("job-row")
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.jobId ?? ""));
  await page.getByTestId("create-job-submit").click();

  // Wait up to 4s for a new row to appear.
  const newId = await page
    .waitForFunction(
      (prev) => {
        const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="job-row"]'));
        const cur = rows.map((r) => r.dataset.jobId ?? "");
        const added = cur.filter((id) => !prev.includes(id));
        return added.length > 0 ? added[0] : null;
      },
      before,
      { timeout: 4_000 },
    )
    .catch(() => null);

  return newId ? await newId.jsonValue() : null;
}

async function getStateForJob(page: Page, jobId: string): Promise<string | null> {
  return await page
    .locator(`[data-testid="job-row"][data-job-id="${jobId}"] [data-testid="job-state"]`)
    .first()
    .textContent({ timeout: 2_000 })
    .then((s) => (s ? s.trim() : null))
    .catch(() => null);
}

async function waitForTerminalState(page: Page, jobId: string): Promise<string | null> {
  const deadline = Date.now() + TERMINAL_TIMEOUT_MS;
  let last: string | null = null;
  while (Date.now() < deadline) {
    last = await getStateForJob(page, jobId);
    if (last === "COMPLETED" || last === "FAILED") return last;
    await page.waitForTimeout(200);
  }
  return last;
}

async function healthcheck(): Promise<number> {
  const r = await fetch(`${BACKEND_URL}/health`);
  return r.status;
}

// ---------- scenarios ----------
test.describe.serial("Full-Stack Exercise Verification", () => {
  test("1. backend /health responds 200", async () => {
    expect(await healthcheck()).toBe(200);
  });

  test("2. /login with empty token shows login-error and stays on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toBeVisible();
    expect(page.url()).toContain("/login");
  });

  test("3. /login with valid token routes to / and shows job-list", async ({ page }) => {
    await login(page, ALICE_TOKEN);
    await expect(page.getByTestId("job-list")).toBeVisible();
    await expect(page.getByTestId("create-job-submit")).toBeVisible();
  });

  test("4. submit a valid job → row appears in job-list", async ({ page }) => {
    await login(page, ALICE_TOKEN);
    const w = isoOffset(60 * 24 * 2); // 2 days ahead
    const jobId = await submitJob(page, {
      asset: "asset-001",
      operation: "charge",
      start: w.start,
      end: w.end,
    });
    expect(jobId).not.toBeNull();
  });

  test("5. submitted job transitions to COMPLETED via live updates (no reload)", async ({ page }) => {
    await login(page, ALICE_TOKEN);
    const w = isoOffset(60 * 24 * 3);
    const jobId = await submitJob(page, {
      asset: "asset-002",
      operation: "discharge",
      start: w.start,
      end: w.end,
    });
    expect(jobId).not.toBeNull();
    const final = await waitForTerminalState(page, jobId!);
    expect(final).toBe("COMPLETED");
  });

  test("6. asset-fault submission transitions to FAILED via live updates", async ({ page }) => {
    await login(page, ALICE_TOKEN);
    const w = isoOffset(60 * 24 * 4);
    const jobId = await submitJob(page, {
      asset: "asset-fault",
      operation: "calibration",
      start: w.start,
      end: w.end,
    });
    expect(jobId).not.toBeNull();
    const final = await waitForTerminalState(page, jobId!);
    expect(final).toBe("FAILED");
  });

  test("7. FAILED job row shows non-empty job-error element", async ({ page }) => {
    await login(page, ALICE_TOKEN);
    const w = isoOffset(60 * 24 * 5);
    const jobId = await submitJob(page, {
      asset: "asset-fault",
      operation: "calibration",
      start: w.start,
      end: w.end,
    });
    expect(jobId).not.toBeNull();
    await waitForTerminalState(page, jobId!);
    const errText = await page
      .locator(`[data-testid="job-row"][data-job-id="${jobId}"] [data-testid="job-error"]`)
      .first()
      .textContent({ timeout: 4_000 });
    expect(errText?.trim().length ?? 0).toBeGreaterThan(0);
  });

  test("8. unknown asset_id → server validation error shown in create-job-error", async ({ page }) => {
    await login(page, ALICE_TOKEN);
    const w = isoOffset(60 * 24 * 6);
    await fillCreateForm(page, {
      asset: "asset-does-not-exist",
      operation: "charge",
      start: w.start,
      end: w.end,
    });
    await page.getByTestId("create-job-submit").click();
    await expect(page.getByTestId("create-job-error")).toHaveText(/.+/, { timeout: 6_000 });
  });

  test("9. start_time in the past → server validation error shown", async ({ page }) => {
    await login(page, ALICE_TOKEN);
    const past = new Date(Date.now() - 2 * 3600_000).toISOString().replace(/\.\d{3}Z$/, ".000Z");
    const slightlyLessPast = new Date(Date.now() - 1 * 3600_000)
      .toISOString()
      .replace(/\.\d{3}Z$/, ".000Z");
    await fillCreateForm(page, {
      asset: "asset-001",
      operation: "charge",
      start: past,
      end: slightlyLessPast,
    });
    await page.getByTestId("create-job-submit").click();
    await expect(page.getByTestId("create-job-error")).toHaveText(/.+/, { timeout: 6_000 });
  });

  test("10. duration < 15 min → server validation error shown", async ({ page }) => {
    await login(page, ALICE_TOKEN);
    const w = isoOffset(60 * 24 * 7, 5); // 5-minute duration
    await fillCreateForm(page, {
      asset: "asset-003",
      operation: "charge",
      start: w.start,
      end: w.end,
    });
    await page.getByTestId("create-job-submit").click();
    await expect(page.getByTestId("create-job-error")).toHaveText(/.+/, { timeout: 6_000 });
  });

  test("11. malformed timestamp → server validation error shown", async ({ page }) => {
    await login(page, ALICE_TOKEN);
    await fillCreateForm(page, {
      asset: "asset-001",
      operation: "charge",
      start: "not-a-timestamp",
      end: "also-not",
    });
    await page.getByTestId("create-job-submit").click();
    await expect(page.getByTestId("create-job-error")).toHaveText(/.+/, { timeout: 6_000 });
  });

  test("12. logout clears stored token and routes back to /login", async ({ page }) => {
    await login(page, ALICE_TOKEN);
    await page.getByTestId("logout-button").click();
    await page.waitForURL("**/login", { timeout: 6_000 });
    await page.goto("/"); // visiting / without a token should redirect back
    await page.waitForURL("**/login", { timeout: 6_000 });
  });

  test("13. token persists across page reload", async ({ page }) => {
    await login(page, ALICE_TOKEN);
    await page.reload();
    await expect(page.getByTestId("job-list")).toBeVisible({ timeout: 8_000 });
    expect(page.url()).not.toContain("/login");
  });

  test("14. Bob's job list does not include Alice's jobs (HTTP scoping)", async ({ browser }) => {
    const aliceCtx = await browser.newContext();
    const bobCtx = await browser.newContext();
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();
    try {
      await login(alice, ALICE_TOKEN);
      const w = isoOffset(60 * 24 * 8);
      const jobId = await submitJob(alice, {
        asset: "asset-004",
        operation: "charge",
        start: w.start,
        end: w.end,
      });
      expect(jobId).not.toBeNull();
      // Bob logs in and his list must not include Alice's job
      await login(bob, BOB_TOKEN);
      const bobJobIds = await bob
        .getByTestId("job-row")
        .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.jobId ?? ""));
      expect(bobJobIds).not.toContain(jobId);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });

  test("15. Bob's UI does not receive Alice's Socket.IO updates", async ({ browser }) => {
    const aliceCtx = await browser.newContext();
    const bobCtx = await browser.newContext();
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();
    try {
      await login(bob, BOB_TOKEN); // Bob on / first, listening
      await login(alice, ALICE_TOKEN);
      const w = isoOffset(60 * 24 * 9);
      const jobId = await submitJob(alice, {
        asset: "asset-005",
        operation: "charge",
        start: w.start,
        end: w.end,
      });
      expect(jobId).not.toBeNull();
      // wait for Alice's job to terminate
      await waitForTerminalState(alice, jobId!);
      // Bob's DOM must not contain a row with that job id, and his state for it
      // must therefore be unobservable.
      const bobHasJob = await bob
        .locator(`[data-testid="job-row"][data-job-id="${jobId}"]`)
        .count();
      expect(bobHasJob).toBe(0);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });

  test("16. newest-first ordering: most recent submission appears at the top", async ({ page }) => {
    await login(page, ALICE_TOKEN);
    const w = isoOffset(60 * 24 * 10);
    const jobId = await submitJob(page, {
      asset: "asset-006",
      operation: "charge",
      start: w.start,
      end: w.end,
    });
    expect(jobId).not.toBeNull();
    // The very first row should be the one we just submitted.
    const firstRowId = await page
      .getByTestId("job-row")
      .first()
      .evaluate((el) => (el as HTMLElement).dataset.jobId ?? "");
    expect(firstRowId).toBe(jobId);
  });

  test("17. backend rejects /api/jobs without bearer (401)", async () => {
    const r = await fetch(`${BACKEND_URL}/api/jobs`);
    expect(r.status).toBe(401);
  });

  test("18. backend rejects /api/jobs with invalid bearer (401)", async () => {
    const r = await fetch(`${BACKEND_URL}/api/jobs`, {
      headers: { Authorization: "Bearer bogus-token" },
    });
    expect(r.status).toBe(401);
  });

  test("19. backend returns 200 and an array on /api/jobs with valid bearer", async () => {
    const r = await fetch(`${BACKEND_URL}/api/jobs`, {
      headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
