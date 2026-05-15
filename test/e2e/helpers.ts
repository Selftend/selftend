import { expect, type Page } from "@playwright/test";

import {
  SEED_USERS,
  type SeedUserName,
  createServiceClient,
  deleteAllThoughtRecordsForUser,
} from "../integration/helpers";

export { SEED_USERS, createServiceClient, deleteAllThoughtRecordsForUser };

// Sign in via the actual UI form using a seeded user. Asserts redirect to the
// authenticated tabs.
export async function signInAsViaUi(page: Page, name: SeedUserName) {
  const user = SEED_USERS[name];
  await page.goto("/");
  await dismissCookieBanner(page);
  await page.getByPlaceholder("m@example.com").fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // After sign-in, the app routes to /(app)/(tabs). The most stable post-auth
  // signal is that the sign-in form (CardTitle "Sign in to your account") is gone.
  await expect(page.getByText("Sign in to your account")).toBeHidden({ timeout: 15_000 });
}

// The cookie consent banner overlays the bottom of the screen on first load.
// We dismiss it with "Essential only" so no analytics consent is implied.
// Best-effort: if it isn't there or has already animated out, do nothing.
export async function dismissCookieBanner(page: Page) {
  await page
    .getByRole("button", { name: "Essential only", exact: true })
    .click({ timeout: 2_000, trial: false })
    .catch(() => undefined);
}

// After signing in, gates and modals can appear depending on user state:
//   1. ConsentGate — when seeded policy_version_accepted differs from the
//      current app policyVersion ("Quick policy check"). Affects all seed users.
//   2. App-level OnboardingModal — when appOnboardingCompleted is false ("Welcome to Selftend").
//   3. CBT-screen OnboardingModal — when cbt_onboarding_completed is false ("Using CBT gently").
// Each is dismissed by clicking its primary button so subsequent UI is interactable.
export async function dismissPostSignInModals(page: Page) {
  // Cookie banner can re-appear post-navigation; always re-dismiss.
  await dismissCookieBanner(page);

  // The modal is gated by prefs loading after sign-in — wait for it to render
  // (or time out if the user is already past consent).
  const consentTitle = page.getByText("Quick policy check", { exact: true });
  const consentVisible = await consentTitle
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (consentVisible) {
    // The first checkbox in the gate is the agreement checkbox.
    await page.getByRole("checkbox").first().click();
    const acceptButton = page.getByRole("button", { name: "Accept and continue", exact: true });
    await expect(acceptButton).toBeEnabled({ timeout: 5_000 });
    await acceptButton.click();
    await expect(consentTitle).toBeHidden({ timeout: 10_000 });
  }

  const welcome = page.getByText(/Welcome to Selftend/i);
  const welcomeVisible = await welcome
    .waitFor({ state: "visible", timeout: 2_000 })
    .then(() => true)
    .catch(() => false);
  if (welcomeVisible) {
    await page.getByRole("button").last().click();
    await expect(welcome).toBeHidden({ timeout: 10_000 });
  }
}

// Dismisses the CBT onboarding modal that appears on first visit to CBT screens
// when cbt_onboarding_completed is false.
export async function dismissCbtOnboarding(page: Page) {
  const cbtOnboardingTitle = page.getByText(/Using CBT gently/);
  const visible = await cbtOnboardingTitle
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (visible) {
    await page.getByRole("button", { name: "Continue to CBT", exact: true }).click();
    await expect(cbtOnboardingTitle).toBeHidden({ timeout: 10_000 });
  }
}

// Visit a path and wait until the app's main content renders (not the loading
// shell). The session-provider shows a "Loading" placeholder while restoring.
export async function gotoAndSettle(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByText("Restoring your session", { exact: false })).toBeHidden({
    timeout: 15_000,
  });
}

// Removes a user via service role admin API. Used for sign-up tests that
// create throwaway users.
export async function deleteUserByEmail(email: string) {
  const admin = createServiceClient();
  const list = await admin.auth.admin.listUsers();
  const found = list.data?.users.find((u) => u.email === email);
  if (found) {
    await admin.auth.admin.deleteUser(found.id);
  }
}
