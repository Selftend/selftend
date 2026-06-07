import { test, expect } from "./fixtures";

// Canary: proves the worker fixture plants a valid Supabase session into the
// browser so the app boots already authenticated, with no UI login and no
// cookie-consent banner. If this fails, session injection is broken (storage
// key drift, expired token, or seed missing).
test("injected session lands on the authenticated dashboard", async ({ page }) => {
  await page.goto("/(app)");
  await expect(page.getByText("Dashboard")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Sign in to your account")).toBeHidden();
});
