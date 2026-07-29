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
  deleteAllRoutinesForUser,
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
  deleteAllRoutinesForUser,
};

// Alias: clear widget preferences. Empty Home is intentional and no longer seeds defaults.
export async function resetWidgetPreferencesForUser(userId: string): Promise<void> {
  await deleteAllWidgetPreferencesForUser(userId);
}

// Sign in via the actual UI form using a seeded user. Asserts redirect to the
// authenticated tabs.
export async function signInAsViaUi(page: Page, name: SeedUserName) {
  const user = SEED_USERS[name];
  await page.goto("/sign-in");
  await dismissCookieBanner(page);
  await page.getByPlaceholder("m@example.com").fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // After sign-in, the app routes to /(app). The most stable post-auth
  // signal is that the sign-in form (CardTitle "Sign in to your account") is gone.
  // The custom message turns the otherwise-cryptic "form stayed visible" timeout
  // into a pointer at the usual root cause: a web server under test that is not
  // talking to local Supabase (e.g. a reused foreign :8081 dev server with a
  // stale EXPO_PUBLIC_SUPABASE_URL), which makes every sign-in silently fail.
  await expect(
    page.getByText("Sign in to your account"),
    "Sign-in did not complete (the sign-in form stayed visible). Most likely the web server under test is not pointed at local Supabase :54321 with seed users - e.g. a reused foreign :8081 dev server (E2E_REUSE_EXISTING_SERVER=1) carrying a stale EXPO_PUBLIC_SUPABASE_URL. Re-run e2e with a fresh Playwright-managed server.",
  ).toBeHidden({ timeout: 15_000 });
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

  // First-run wizard: "Skip for now" completes onboarding from any panel.
  const wizardTitle = page.getByText(/Welcome to Selftend/i);
  const wizardVisible = await wizardTitle
    .waitFor({ state: "visible", timeout: 2_000 })
    .then(() => true)
    .catch(() => false);
  if (wizardVisible) {
    const skipButton = page.getByRole("button", { name: "Skip for now", exact: true });
    await expect(skipButton).toBeEnabled({ timeout: 5_000 });
    await skipButton.click();
    await expect(wizardTitle).toBeHidden({ timeout: 10_000 });
  }

  // Home tour spotlight: one "Skip all tips" dismisses all four home stops.
  const skipAllTips = page.getByRole("button", { name: "Skip all tips", exact: true });
  const tourVisible = await skipAllTips
    .waitFor({ state: "visible", timeout: 3_000 })
    .then(() => true)
    .catch(() => false);
  if (tourVisible) {
    await skipAllTips.click();
    await expect(skipAllTips).toBeHidden({ timeout: 10_000 });
  }
}

// Local mail server bundled with the Supabase CLI stack (Mailpit). Its REST API
// lets tests read the messages the app sends.
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:54324";

interface MailpitMessageSummary {
  ID: string;
  To?: { Address?: string }[];
}

// Finds the most recent message Mailpit holds for `email` and pulls the auth
// link out of its body. The custom email templates (supabase/templates/) link
// STRAIGHT to the app callback - `<redirect_to>?token_hash=...&type=<type>` -
// instead of GoTrue's /auth/v1/verify, so token_hash links complete in any
// browser (no PKCE verifier needed). Polls because the email arrives a beat
// after the triggering request.
async function fetchAuthEmailLink(page: Page, email: string, type: string): Promise<string> {
  const target = email.toLowerCase();
  const linkPattern = new RegExp(
    `https?://[^\\s"'<>]*auth-callback\\?token_hash=[^\\s"'<>]*type=${type}[^\\s"'<>]*`,
  );
  // The hrefs seen in the newest matching email - included in the failure
  // message so a wrong link FORMAT (e.g. an /auth/v1/verify link from a stack
  // started before the custom templates existed) is distinguishable from "no
  // email arrived at all".
  let seenLinks: string[] = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    const listRes = await page.request.get(`${MAILPIT_URL}/api/v1/messages?limit=50`);
    if (listRes.ok()) {
      const { messages = [] } = (await listRes.json()) as { messages?: MailpitMessageSummary[] };
      const match = messages.find((m) => m.To?.some((to) => to.Address?.toLowerCase() === target));
      if (match) {
        const msgRes = await page.request.get(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
        const body = (await msgRes.json()) as { HTML?: string; Text?: string };
        const haystack = `${body.Text ?? ""}\n${body.HTML ?? ""}`.replace(/&amp;/g, "&");
        const link = haystack.match(linkPattern);
        if (link) return link[0];
        seenLinks = haystack.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error(
    `No Mailpit ${type} email with an auth-callback?token_hash link found for ${email}.` +
      (seenLinks.length > 0
        ? ` An email arrived, but its links do not match the expected format - the local stack is` +
          ` likely running templates from before supabase/templates/ existed (restart with` +
          ` db:stop + db:start). Links found: ${seenLinks.join(", ")}`
        : " No email for this address arrived at all."),
  );
}

// The app bakes redirect_to from its inlined EXPO_PUBLIC_PUBLIC_APP_URL, which is
// not necessarily the port THIS e2e server runs on (e.g. a reused :8081 dev
// server). Rewrite the link's origin to the current baseURL so the callback runs
// against the server under test. token_hash links are origin-independent (the
// callback completes them via verifyOtp - no PKCE verifier in storage needed),
// so this rewrite does not weaken what the test proves.
export function rewriteAuthLinkOrigin(link: string, baseURL: string): string {
  const url = new URL(link);
  const origin = new URL(baseURL).origin;
  return `${origin}${url.pathname}${url.search}${url.hash}`;
}

// (confirmSignupViaMailpit used to live here: under autoconfirm (#489) the
// local stack never sends signup-confirmation emails, so that journey has no
// local trigger any more. The verify-banner code path replaced it.)

// Finds the most recent password-RECOVERY email in Mailpit for `email` and
// returns its `...auth-callback?token_hash=...&type=recovery` link.
export async function fetchRecoveryLink(page: Page, email: string): Promise<string> {
  return fetchAuthEmailLink(page, email, "recovery");
}

// Pulls the 6-digit verification code out of the verify-banner's OTP email
// (supabase/templates/magic_link.html renders `{{ .Token }}` as a bare 6-digit
// number). Polls like fetchAuthEmailLink: the email arrives a beat after the
// banner's send.
export async function fetchVerificationCodeViaMailpit(page: Page, email: string): Promise<string> {
  const target = email.toLowerCase();
  for (let attempt = 0; attempt < 20; attempt++) {
    const listRes = await page.request.get(`${MAILPIT_URL}/api/v1/messages?limit=50`);
    if (listRes.ok()) {
      const { messages = [] } = (await listRes.json()) as { messages?: MailpitMessageSummary[] };
      const match = messages.find((m) => m.To?.some((to) => to.Address?.toLowerCase() === target));
      if (match) {
        const msgRes = await page.request.get(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
        const body = (await msgRes.json()) as { HTML?: string; Text?: string };
        const code = `${body.Text ?? ""}\n${body.HTML ?? ""}`.match(/\b(\d{6})\b/);
        if (code) return code[1];
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error(
    `No Mailpit email with a 6-digit verification code found for ${email}. The local stack may` +
      ` be running templates from before supabase/templates/magic_link.html existed (restart` +
      ` with db:stop + db:start).`,
  );
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
