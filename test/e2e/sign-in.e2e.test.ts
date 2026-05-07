import { expect, test } from "@playwright/test";

import { SEED_USERS, dismissCookieBanner, signInAsViaUi } from "./helpers";

test.describe("sign in", () => {
  test("seeded user can sign in via the UI and reaches the authenticated app", async ({ page }) => {
    await signInAsViaUi(page, "bob");
  });

  test("rejects a wrong password with an in-form error", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);
    await page.getByPlaceholder("m@example.com").fill(SEED_USERS.alice.email);
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Auth error message rendered inline; sign-in form is still visible.
    await expect(page.getByText("Sign in to your account")).toBeVisible();
    await expect(page.getByText(/invalid|credential/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
