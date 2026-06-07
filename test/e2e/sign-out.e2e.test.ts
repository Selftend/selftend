import { expect, test } from "@playwright/test";

import { dismissPostSignInModals, signInAsViaUi } from "./helpers";

test.describe("sign out", () => {
  test("signed-in user reaches settings, signs out, and lands on the landing page", async ({
    page,
  }) => {
    await signInAsViaUi(page, "bob");
    await dismissPostSignInModals(page);

    await page.goto("/(app)/settings");
    // Settings has multiple sections; the account section's "Sign out" button.
    const signOut = page.getByRole("button", { name: "Sign out", exact: true }).first();
    await expect(signOut).toBeVisible({ timeout: 10_000 });
    await signOut.click();

    // Back on landing - sign-in form is visible again.
    await expect(page.getByText("Sign in to your account")).toBeVisible({ timeout: 10_000 });
  });
});
