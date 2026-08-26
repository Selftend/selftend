/**
 * GDPR / data-export flow e2e test.
 *
 * Signs in as alice, navigates to Settings, clicks "Export my data".
 * On web this calls the export_user_data edge function and triggers a JSON download
 * (via a synthetic <a> click). Asserts the success copy "Data exported successfully."
 * appears, and optionally captures the download event.
 *
 * Read-only - no cleanup required.
 */

import { expect, test } from "./fixtures";
import { expectSuccessToast } from "./helpers";

test.describe("GDPR data export", () => {
  test("alice can export her data and sees the success message", async ({ page }) => {
    // Navigate to Settings.
    await page.goto("/(app)/settings");
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // Click "Export my data" button (account.exportButton in settings.json).
    const exportButton = page.getByRole("button", { name: "Export my data", exact: true });
    await expect(exportButton).toBeVisible({ timeout: 10_000 });

    // Listen for the download event (web triggers a synthetic <a download> click).
    // Start listening for the download before the click; tolerate no download event firing
    // (e.g. browser blocks it in headless mode) - success copy is the primary assertion.
    const downloadPromise = page.waitForEvent("download", { timeout: 10_000 }).catch(() => null);
    await exportButton.click();

    // The success copy is TOAST content now (#982) - the permanent `Text` node that
    // used to sit under the button went with the R7 banner pair. `expectSuccessToast`
    // keeps the assertion scoped to the toast, so it cannot pass against a stale
    // permanent node, and fails fast and by name if the global save-failed toast took
    // the slot instead. A success toast is transient - do not assert on it after any
    // step that could outlast it.
    await expectSuccessToast(page, "Data exported successfully.");

    // Optionally confirm the download was triggered.
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toMatch(/selftend-export.*\.json/);
    }
  });
});
