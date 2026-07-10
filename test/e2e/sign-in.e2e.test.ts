import { expect, test } from "@playwright/test";

import { SEED_USERS, dismissCookieBanner, signInAsViaUi } from "./helpers";

test.describe("sign in", () => {
  test("seeded user can sign in via the UI and reaches the authenticated app", async ({ page }) => {
    await signInAsViaUi(page, "bob");
  });

  test("rejects a wrong password with an in-form error", async ({ page }) => {
    await page.goto("/sign-in");
    await dismissCookieBanner(page);
    await page.getByPlaceholder("m@example.com").fill(SEED_USERS.alice.email);
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Auth error message rendered inline; sign-in form is still visible. The raw
    // GoTrue "Invalid login credentials" is mapped to friendly copy that also
    // hints at the Google SSO path (signIn.invalidCredentials).
    await expect(page.getByText("Sign in to your account")).toBeVisible();
    await expect(page.getByText(/incorrect email or password/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
