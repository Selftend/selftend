/**
 * Account deletion e2e test.
 *
 * Creates a throwaway user via the admin API, signs in as them, navigates to
 * Settings, triggers DeleteAccountModal, types "DELETE" in the confirmation input,
 * confirms. Asserts the user is signed out to the landing page and the auth record
 * is gone (verified via admin listUsers).
 *
 * NEVER runs against seeded alice/bob/demo users.
 */

import { expect, test } from "@playwright/test";

import {
  createServiceClient,
  deleteUserByEmail,
  dismissCookieBanner,
  dismissPostSignInModals,
} from "./helpers";

const THROWAWAY_EMAIL = `deletion-e2e-${Date.now()}@test.local`;
const THROWAWAY_PASSWORD = "throwaway-deletion-pass-123";

test.describe("account deletion", () => {
  test.afterEach(async () => {
    // Safety net: if the deletion test failed before removing the user, clean up.
    await deleteUserByEmail(THROWAWAY_EMAIL);
  });

  test("throwaway user deletes their account and is signed out; auth record is gone", async ({
    page,
  }) => {
    // 1. Create throwaway user via admin API.
    const admin = createServiceClient();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: THROWAWAY_EMAIL,
      password: THROWAWAY_PASSWORD,
      email_confirm: true,
    });
    expect(createErr).toBeNull();
    expect(created.user).not.toBeNull();

    // 2. Sign in as the throwaway user.
    await page.goto("/");
    await dismissCookieBanner(page);
    await page.getByPlaceholder("m@example.com").fill(THROWAWAY_EMAIL);
    await page.locator('input[type="password"]').fill(THROWAWAY_PASSWORD);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("Sign in to your account")).toBeHidden({ timeout: 15_000 });

    // 3. Dismiss any post-sign-in modals.
    await dismissPostSignInModals(page);

    // 4. Navigate to Settings.
    await page.goto("/(app)/settings");
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // 5. Click "Delete my account" button (account.deleteButton in settings.json).
    const deleteButton = page.getByRole("button", { name: "Delete my account", exact: true });
    await expect(deleteButton).toBeVisible({ timeout: 10_000 });
    await deleteButton.click();

    // 6. DeleteAccountModal should appear with the title "Delete account permanently?".
    await expect(page.getByText("Delete account permanently?")).toBeVisible({ timeout: 10_000 });

    // 7. Type "DELETE" in the confirmation input (account.deleteConfirmPlaceholder).
    await page.getByPlaceholder("DELETE").fill("DELETE");

    // 8. Click the "Delete account" confirm button (account.deleteAccount in the modal).
    const confirmButton = page.getByRole("button", { name: "Delete account", exact: true });
    await expect(confirmButton).toBeEnabled({ timeout: 5_000 });
    await confirmButton.click();

    // 9. Assert the user is signed out to the landing / sign-in page.
    await expect(page.getByText("Sign in to your account")).toBeVisible({ timeout: 20_000 });

    // 10. Verify the auth record is actually gone.
    const list = await admin.auth.admin.listUsers();
    const stillExists = list.data?.users.some((u) => u.email === THROWAWAY_EMAIL);
    expect(stillExists).toBe(false);
  });
});
