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

    // Back on landing - the public marketing landing page is shown (not the
    // sign-in form, which now lives at the dedicated /sign-in route).
    await expect(
      page.getByRole("heading", { name: "Guided self-help, private by design.", level: 1 }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
