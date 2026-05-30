/**
 * GDPR / data-export flow e2e test.
 *
 * Signs in as alice, navigates to Settings, clicks "Export my data".
 * On web this calls the export_user_data edge function and triggers a JSON download
 * (via a synthetic <a> click). Asserts the success copy "Data exported successfully."
 * appears, and optionally captures the download event.
 *
 * Read-only — no cleanup required.
 */

import { expect, test } from "@playwright/test";

import { dismissPostSignInModals, signInAsViaUi } from "./helpers";

test.describe("GDPR data export", () => {
  test("alice can export her data and sees the success message", async ({ page }) => {
    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // Navigate to Settings.
    await page.goto("/(app)/(tabs)/settings");
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // Click "Export my data" button (account.exportButton in settings.json).
    const exportButton = page.getByRole("button", { name: "Export my data", exact: true });
    await expect(exportButton).toBeVisible({ timeout: 10_000 });

    // Listen for the download event (web triggers a synthetic <a download> click).
    // We wrap the click in a Promise.race so test continues even if no download event fires
    // (e.g. browser blocks it in headless mode) — success copy is the primary assertion.
    const downloadPromise = page.waitForEvent("download", { timeout: 10_000 }).catch(() => null);
    await exportButton.click();

    // Assert the success copy "Data exported successfully." appears (account.exported).
    await expect(page.getByText("Data exported successfully.")).toBeVisible({ timeout: 15_000 });

    // Optionally confirm the download was triggered.
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toMatch(/selftend-export.*\.json/);
    }
  });
});
