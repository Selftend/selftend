import { expect, test } from "@playwright/test";

import {
  deleteUserByEmail,
  dismissCbtOnboarding,
  dismissCookieBanner,
  dismissPostSignInModals,
} from "./helpers";

test.describe("sign-up + onboarding + first record", () => {
  const email = `signup-e2e-${Date.now()}@test.local`;
  const password = "password123";

  test.afterEach(async () => {
    await deleteUserByEmail(email);
  });

  test("new user signs up, completes onboarding, and saves their first thought record", async ({
    page,
  }) => {
    await page.goto("/");
    await dismissCookieBanner(page);

    // Click "Sign up" link to navigate to sign-up form.
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await expect(page.getByText("Create an account")).toBeVisible({ timeout: 10_000 });

    // Fill the sign-up form. Expo Router may keep both auth screens mounted,
    // so scope to visible inputs only.
    await page.locator('input[placeholder="m@example.com"]:visible').fill(email);
    const pwInputs = page.locator('input[type="password"]:visible');
    await pwInputs.nth(0).fill(password);
    await pwInputs.nth(1).fill(password);
    await page.getByRole("button", { name: "Sign up", exact: true }).click();

    // Sign-up routes the user to /verify-email.
    await expect(page.getByText("Verify your email")).toBeVisible({ timeout: 15_000 });

    // With local auto-confirm, the user is already signed in. Navigate directly
    // to the app to trigger the consent + onboarding flow.
    await page.goto("/(app)/(tabs)");
    await dismissPostSignInModals(page);

    // First-time user must accept consent + complete app onboarding before
    // anything else. dismissPostSignInModals handles both.
    await expect(page.getByText("Quick policy check")).toBeHidden();
    await expect(page.getByText(/Welcome to Selftend/)).toBeHidden();

    // Now create the first thought record.
    await page.goto("/modules/cbt/new");
    await dismissCbtOnboarding(page);
    await page
      .getByRole("button", { name: "Essential only", exact: true })
      .click({ timeout: 2_000 })
      .catch(() => undefined);

    const situation = "First-ever record on a brand-new account.";
    const automaticThought = "Brand-new accounts always break.";
    const balancedThought = "It is just a first record. The form should hold.";

    await page
      .getByPlaceholder(
        "Example: I saw an email from my manager and my chest tightened immediately.",
      )
      .fill(situation);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page
      .getByPlaceholder("Example: I am about to be told I messed everything up.")
      .fill(automaticThought);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page.getByText("Anxious", { exact: true }).first().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Evidence is optional in the first thought-record flow.
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page.getByRole("checkbox", { name: "Catastrophizing", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page
      .getByPlaceholder(
        "Example: I do not know what the email means yet. One message is not proof that I failed.",
      )
      .fill(balancedThought);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page.getByRole("button", { name: "Save record", exact: true }).click();

    // Detail page renders the saved values.
    await expect(page.getByText(situation)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(balancedThought)).toBeVisible();
  });
});
