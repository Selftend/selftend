import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

/**
 * The update popup, end to end in Chromium (#1142 spec §7 layer 6, ticket
 * #1476). The app under test never sees a real deploy: `expo export` never
 * writes `/version.json` (only `web-deploy.yml` does) and the e2e server 404s
 * extension paths, so the popup is inert in every other spec — each test here
 * fulfils the route with a strictly-newer fixture instead.
 *
 * This file is the ONLY automated proof of C1's property (initial focus lands
 * on "Later", never on the platform action): jest runs the native preset, so
 * react-native-web's `ModalFocusTrap` never executes there — the jest suite
 * can pin button ORDER (the mechanism) but only a browser can observe focus.
 *
 * ☠️ The suppression test's blocker is the settings delete-account modal,
 * opened through a real UI path by an awaited click — deliberately NOT the
 * home tour, whose 150/450/900ms measurement delay is a race, and these tests
 * stay off the home route entirely so the tour never arms over them.
 *
 * Accepted gaps (#1155, restated on #1476 — all six stand): C1's property is
 * e2e-only by construction; Android hardware back is device-only (§6's manual
 * checklist); Play Core stays mocked below e2e; `reducedMotion: "reduce"`
 * means the animated fade variant never runs here; the 750px Desktop Chrome
 * viewport leaves phone-width branches unseen; iOS is untested because iOS
 * ships nothing.
 */

// Strictly newer than any version the built bundle can carry, so the fixture
// never rots as package.json moves.
const NEWER_VERSION_DOC = { version: "99.0.0", publishedAt: "2026-01-01T00:00:00.000Z" };

// AsyncStorage on web writes raw localStorage keys; this must match
// DISMISSED_KEY_PREFIX in src/lib/use-update-availability.ts plus the offered
// version above.
const DISMISSAL_KEY = `updateBannerDismissed:${NEWER_VERSION_DOC.version}`;

// A quiet protected route: the popup renders from the shell on any of them,
// and settings has no first-run tour and hosts the suppression blocker.
const SETTINGS_ROUTE = "/(app)/settings";

const isVersionResponse = (url: string) => new URL(url).pathname === "/version.json";

async function serveNewerVersion(page: Page) {
  await page.route("**/version.json", (route) => route.fulfill({ json: NEWER_VERSION_DOC }));
}

const readDismissal = (page: Page) =>
  page.evaluate((key) => window.localStorage.getItem(key), DISMISSAL_KEY);

test.describe("update popup", () => {
  test("offers on shell mount with initial focus on Later, never the action", async ({ page }) => {
    await serveNewerVersion(page);
    await page.goto(SETTINGS_ROUTE);

    await expect(page.getByTestId("update-popup")).toBeVisible({ timeout: 10_000 });
    // C1: react-native-web's ModalFocusTrap focused the first button in tree
    // order, and that button is "Later" - the irreversible action is never
    // the focused default. No jest test can see this (native preset).
    await expect(page.getByTestId("update-popup-later")).toBeFocused();
    await expect(page.getByTestId("update-popup-act")).not.toBeFocused();
  });

  test("Later latches the version: gone now, and no return after reload", async ({ page }) => {
    await serveNewerVersion(page);
    await page.goto(SETTINGS_ROUTE);

    await expect(page.getByTestId("update-popup")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("update-popup-later").click();
    await expect(page.getByTestId("update-popup")).toBeHidden();

    // Positive anchor before trusting any negative below: the per-version
    // dismissal reached storage (C2), so the reload starts latched.
    await expect.poll(() => readDismissal(page)).toBe("1");

    // The reloaded shell re-checks at mount and still sees 99.0.0 on offer;
    // wait for that response so "stays hidden" asserts against a check that
    // actually ran, not a page that never asked.
    const recheck = page.waitForResponse((r) => isVersionResponse(r.url()));
    await page.reload();
    await recheck;
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(500);
    await expect(page.getByTestId("update-popup")).toBeHidden();
  });

  test("Escape closes through onRequestClose and persists the same latch", async ({ page }) => {
    await serveNewerVersion(page);
    await page.goto(SETTINGS_ROUTE);

    await expect(page.getByTestId("update-popup")).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("update-popup")).toBeHidden();

    // C2: Escape is not a softer close - it writes the identical dismissal.
    await expect.poll(() => readDismissal(page)).toBe("1");

    const recheck = page.waitForResponse((r) => isVersionResponse(r.url()));
    await page.reload();
    await recheck;
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(500);
    await expect(page.getByTestId("update-popup")).toBeHidden();
  });

  test("an offer suppressed under an overlay returns on the next trigger, not on close", async ({
    page,
  }) => {
    // Hold the mount check's fetch until the blocker modal is up, so the
    // check completes against a registry holding one overlay and drops the
    // offer (rolling the throttle stamp back with it - the "next trigger"
    // path below only works if that rollback happened).
    let releaseFirstCheck!: () => void;
    const firstCheckHeld = new Promise<void>((resolve) => {
      releaseFirstCheck = resolve;
    });
    let versionRequests = 0;
    await page.route("**/version.json", async (route) => {
      versionRequests += 1;
      if (versionRequests === 1) await firstCheckHeld;
      await route.fulfill({ json: NEWER_VERSION_DOC });
    });

    await page.goto(SETTINGS_ROUTE);
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // The blocker, through a real UI path by an awaited click (never the home
    // tour - its arming delay is a race). The delete-account modal reports
    // into the overlay-count registry like every visible modal (#1473).
    await page.getByRole("button", { name: "Delete my account", exact: true }).click();
    await expect(page.getByText("Delete account permanently?")).toBeVisible({ timeout: 10_000 });

    const firstCheck = page.waitForResponse((r) => isVersionResponse(r.url()));
    releaseFirstCheck();
    await firstCheck;

    // Suppressed: no popup over (or under) the modal, and - suppression is
    // never dismissal - nothing persisted.
    await page.waitForTimeout(500);
    await expect(page.getByTestId("update-popup")).toBeHidden();
    expect(await readDismissal(page)).toBeNull();

    // Closing the overlay must NOT surface the offer - a suppressed offer
    // waits for the next trigger, never the instant the overlay closes.
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByText("Delete account permanently?")).toBeHidden();
    await page.waitForTimeout(500);
    await expect(page.getByTestId("update-popup")).toBeHidden();

    // The next trigger: a window focus event re-runs the check. This second
    // fetch happening AT ALL proves the suppressed check left no throttle
    // stamp behind (a stamped bail would stay silent for 6 hours).
    const secondCheck = page.waitForResponse((r) => isVersionResponse(r.url()));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await secondCheck;
    await expect(page.getByTestId("update-popup")).toBeVisible({ timeout: 10_000 });
  });
});
