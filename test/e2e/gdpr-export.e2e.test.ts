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
    // used to sit under the button went with the R7 banner pair. Scoped to the toast
    // for two reasons: an unscoped match would pass just as happily against a stale
    // permanent node, and the toast auto-dismisses at 4500ms, so what is asserted has
    // to be the thing that is actually transient.
    await expect(
      page.getByTestId("app-toast").getByText("Data exported successfully."),
    ).toBeVisible({ timeout: 15_000 });

    // Optionally confirm the download was triggered.
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toMatch(/selftend-export.*\.json/);
    }
  });
});
