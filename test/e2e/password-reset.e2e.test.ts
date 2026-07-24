/**
 * Password-reset flow e2e test.
 *
 * Uses a throwaway user created via the admin API (email_confirm: true) so no
 * sign-up flow is required, and seeded users are never touched.
 *
 * Full happy-path (token_hash recovery link; e2e server runs on its own
 * allowlisted origin - the e2e baseURL, default :8099, set via E2E_PORT):
 *   1. Navigate to forgot-password, submit throwaway email.
 *   2. Assert success copy appears.
 *   3. Fetch the recovery link from Mailpit. The custom recovery template
 *      (supabase/templates/recovery.html) links STRAIGHT to the app callback:
 *      `{{ .SiteURL }}/auth-callback?token_hash={{ .TokenHash }}&type=recovery`
 *      - no /auth/v1/verify hop and no PKCE `code`, so the link works in ANY
 *      browser, not just the one that requested the reset.
 *   4. page.goto(recoveryLink) - AuthCallbackScreen completes it via
 *      verifyOtp and, seeing type=recovery, routes to /(auth)/update-password.
 *   5. Fill a NEW ≥12-char password and submit. Assert routing away.
 *   6. HARD proof: createAnonClient().signInWithPassword(email, NEW_PASSWORD)
 *      must SUCCEED; OLD_PASSWORD must FAIL.
 *
 * No conditionals, no try/catch around the proof assertions, no tautologies.
 *
 * STALENESS WARNING: this flow spans TWO deployables. A stale dist-e2e export
 * (or a reused foreign server via E2E_REUSE_EXISTING_SERVER=1) can still send
 * the old marker-style redirect, and a Supabase stack started before
 * supabase/templates/ existed still emails old /auth/v1/verify links - either
 * one fails this spec. Rebuild the export (unset E2E_SKIP_BUILD) and restart
 * the stack (db:stop + db:start) before debugging anything else.
 */

import { expect, test } from "@playwright/test";

import {
  createAnonClient,
  createServiceClient,
  deleteUserByEmail,
  dismissCookieBanner,
  fetchRecoveryLink,
  rewriteAuthLinkOrigin,
} from "./helpers";

const THROWAWAY_EMAIL = `reset-e2e-${Date.now()}@test.local`;
const ORIGINAL_PASSWORD = "original-pass-reset-123";
const NEW_PASSWORD = "new-reset-password-xyz-456";

test.describe("password reset flow", () => {
  test.afterEach(async () => {
    await deleteUserByEmail(THROWAWAY_EMAIL);
  });

  test("request reset → success copy → recovery link → update password → sign in with new password", async ({
    page,
  }) => {
    // 1. Create throwaway user via admin API (skips sign-up flow entirely).
    const admin = createServiceClient();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: THROWAWAY_EMAIL,
      password: ORIGINAL_PASSWORD,
      email_confirm: true,
    });
    expect(createErr).toBeNull();
    expect(created.user).not.toBeNull();

    // 2. Navigate to sign-in page, then to the forgot-password screen.
    await page.goto("/sign-in");
    await dismissCookieBanner(page);
    await expect(page.getByText("Sign in to your account")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Forgot your password?", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible({
      timeout: 10_000,
    });

    // 3. Submit the throwaway email (Expo Router keeps both auth screens mounted,
    //    so scope to the visible input only).
    await page.locator('input[placeholder="m@example.com"]:visible').fill(THROWAWAY_EMAIL);
    await page.getByRole("button", { name: "Send reset link", exact: true }).click();

    // 4. Assert success copy (forgotPassword.success contains sentTo email).
    await expect(page.getByText(/password-reset link was sent to/i)).toBeVisible({
      timeout: 15_000,
    });

    // 5. Fetch the recovery link from Mailpit: a direct token_hash link into the
    //    app callback (the template's `{{ .SiteURL }}` base - see
    //    supabase/config.toml).
    const recoveryLink = await fetchRecoveryLink(page, THROWAWAY_EMAIL);
    expect(recoveryLink).toContain("/auth-callback?token_hash=");
    expect(recoveryLink).toContain("type=recovery");
    expect(recoveryLink).not.toContain("/auth/v1/verify");

    // The link's origin is the local stack's site_url (:8081), which differs from
    // the port this e2e server runs on. Rewrite the origin to THIS baseURL;
    // token_hash completion is origin-independent (verifyOtp needs no
    // browser-local PKCE state), so the rewrite doesn't weaken the proof.
    const verifyUrl = rewriteAuthLinkOrigin(
      recoveryLink,
      test.info().project.use.baseURL as string,
    );

    // 6. Open the link. AuthCallbackScreen shows the scanner-proof gate; the
    //    press verifies the OTP and - seeing type=recovery - routes to
    //    /(auth)/update-password.
    await page.goto(verifyUrl);
    await page.getByRole("button", { name: "Choose a new password", exact: true }).click();

    // Wait for AuthCallbackScreen to process the token and route to update-password.
    await expect(page.getByText("Reset your password")).toBeVisible({ timeout: 15_000 });

    // 7. Fill and submit the new password.
    const pwInputs = page.locator('input[type="password"]:visible');
    await pwInputs.nth(0).fill(NEW_PASSWORD);
    await pwInputs.nth(1).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Update password", exact: true }).click();

    // 8. Assert routing into the authenticated app (form title disappears).
    await expect(page.getByText("Reset your password")).toBeHidden({ timeout: 15_000 });

    // 9. HARD PROOF: verify the password actually changed using a fresh headless client.
    //    New password MUST sign in successfully.
    const anonClient = createAnonClient();
    const { error: newPwErr } = await anonClient.auth.signInWithPassword({
      email: THROWAWAY_EMAIL,
      password: NEW_PASSWORD,
    });
    expect(newPwErr).toBeNull();

    //    Old password MUST now be rejected.
    const anonClient2 = createAnonClient();
    const { error: oldPwErr } = await anonClient2.auth.signInWithPassword({
      email: THROWAWAY_EMAIL,
      password: ORIGINAL_PASSWORD,
    });
    expect(oldPwErr).not.toBeNull();
  });
});
