import { expect, type Page } from "@playwright/test";

import {
  SEED_USERS,
  type SeedUserName,
  createAnonClient,
  createServiceClient,
  deleteAllThoughtRecordsForUser,
  deleteAllMoodLogsForUser,
  deleteAllJournalEntriesForUser,
  deleteAllGratitudeEntriesForUser,
  deleteAllSleepLogsForUser,
  deleteAllHabitsForUser,
  deleteAllCoreBeliefsForUser,
  deleteAllGoalsForUser,
  deleteAllActLogsForUser,
  deleteAllWidgetPreferencesForUser,
  deleteAllExposureForUser,
  deleteAllActivityLogsForUser,
} from "../integration/helpers";

export {
  SEED_USERS,
  createAnonClient,
  createServiceClient,
  deleteAllThoughtRecordsForUser,
  deleteAllMoodLogsForUser,
  deleteAllJournalEntriesForUser,
  deleteAllGratitudeEntriesForUser,
  deleteAllSleepLogsForUser,
  deleteAllHabitsForUser,
  deleteAllCoreBeliefsForUser,
  deleteAllGoalsForUser,
  deleteAllActLogsForUser,
  deleteAllExposureForUser,
  deleteAllActivityLogsForUser,
};

// Alias: reset widget preferences for a user (deletes all rows so the app re-seeds defaults).
export async function resetWidgetPreferencesForUser(userId: string): Promise<void> {
  await deleteAllWidgetPreferencesForUser(userId);
}

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
//   1. ConsentGate - when seeded policy_version_accepted differs from the
//      current app policyVersion ("Quick policy check"). Affects all seed users.
//   2. App-level OnboardingModal - when appOnboardingCompleted is false ("Welcome to Selftend").
//   3. CBT-screen OnboardingModal - when cbt_onboarding_completed is false ("Using CBT gently").
// Each is dismissed by clicking its primary button so subsequent UI is interactable.
export async function dismissPostSignInModals(page: Page) {
  // Cookie banner can re-appear post-navigation; always re-dismiss.
  await dismissCookieBanner(page);

  // The modal is gated by prefs loading after sign-in - wait for it to render
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
    // The app onboarding modal's only button is labelled by settings.json
    // `onboarding.appContinue` ("Got it"). The modal is the only "Got it"
    // button visible on (app)/(tabs) once consent has been accepted.
    const startButton = page.getByRole("button", { name: "Got it", exact: true });
    await expect(startButton).toBeEnabled({ timeout: 5_000 });
    await startButton.click();
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

// Local mail server bundled with the Supabase CLI stack (Mailpit). Its REST API
// lets tests read the messages the app sends.
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:54324";

interface MailpitMessageSummary {
  ID: string;
  To?: { Address?: string }[];
}

// Finds the most recent message Mailpit holds for `email` and pulls the Supabase
// `/auth/v1/verify` confirmation link out of its body. Polls because the email
// arrives a beat after sign-up.
async function fetchConfirmationLink(page: Page, email: string): Promise<string> {
  const target = email.toLowerCase();
  for (let attempt = 0; attempt < 20; attempt++) {
    const listRes = await page.request.get(`${MAILPIT_URL}/api/v1/messages?limit=50`);
    if (listRes.ok()) {
      const { messages = [] } = (await listRes.json()) as { messages?: MailpitMessageSummary[] };
      const match = messages.find((m) => m.To?.some((to) => to.Address?.toLowerCase() === target));
      if (match) {
        const msgRes = await page.request.get(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
        const body = (await msgRes.json()) as { HTML?: string; Text?: string };
        const haystack = `${body.Text ?? ""}\n${body.HTML ?? ""}`.replace(/&amp;/g, "&");
        const link = haystack.match(/https?:\/\/[^\s"'<>]*\/auth\/v1\/verify[^\s"'<>]*/);
        if (link) return link[0];
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`No Mailpit confirmation email found for ${email}`);
}

// Completes local email verification for a freshly signed-up user. Hitting the
// verify endpoint confirms the address server-side; we deliberately do NOT follow
// its redirect - confirmation only needs the server-side verify, so the caller
// establishes the browser session by signing in afterward.
export async function confirmSignupViaMailpit(page: Page, email: string) {
  const link = await fetchConfirmationLink(page, email);
  const res = await page.request.get(link, { maxRedirects: 0 });
  expect([200, 301, 302, 303]).toContain(res.status());
}

// Finds the most recent password-RECOVERY email in Mailpit for `email` and
// returns the Supabase `/auth/v1/verify?...type=recovery...` link.
// Mirrors fetchConfirmationLink but filters for the recovery type.
export async function fetchRecoveryLink(page: Page, email: string): Promise<string> {
  const target = email.toLowerCase();
  for (let attempt = 0; attempt < 20; attempt++) {
    const listRes = await page.request.get(`${MAILPIT_URL}/api/v1/messages?limit=50`);
    if (listRes.ok()) {
      const { messages = [] } = (await listRes.json()) as { messages?: MailpitMessageSummary[] };
      const match = messages.find((m) => m.To?.some((to) => to.Address?.toLowerCase() === target));
      if (match) {
        const msgRes = await page.request.get(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
        const body = (await msgRes.json()) as { HTML?: string; Text?: string };
        const haystack = `${body.Text ?? ""}\n${body.HTML ?? ""}`.replace(/&amp;/g, "&");
        // Match a recovery verify link specifically (type=recovery in URL)
        const link = haystack.match(
          /https?:\/\/[^\s"'<>]*\/auth\/v1\/verify[^\s"'<>]*type=recovery[^\s"'<>]*/,
        );
        if (link) return link[0];
        // Fallback: match any verify link (recovery emails may not have type in URL depending on config)
        const anyLink = haystack.match(/https?:\/\/[^\s"'<>]*\/auth\/v1\/verify[^\s"'<>]*/);
        if (anyLink) return anyLink[0];
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`No Mailpit recovery email found for ${email}`);
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
