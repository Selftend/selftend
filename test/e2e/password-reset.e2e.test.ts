/**
 * Password-reset flow e2e test.
 *
 * Uses a throwaway user created via the admin API (email_confirm: true) so no
 * sign-up flow is required, and seeded users are never touched.
 *
 * Full happy-path (PKCE recovery; e2e server runs on its own allowlisted origin -
 * the e2e baseURL, default :8099, set via E2E_PORT):
 *   1. Navigate to forgot-password, submit throwaway email.
 *   2. Assert success copy appears.
 *   3. Fetch the recovery link from Mailpit. The app sends redirect_to with a
 *      ?type=recovery marker (see getPasswordResetRedirectUrl) built from the e2e
 *      server's origin, which is in additional_redirect_urls (both :8081 and
 *      :8099/auth-callback are allowlisted), so Supabase honours it verbatim.
 *   4. page.goto(recoveryLink) - browser follows the 303 → <baseURL>/auth-callback
 *      ?code=...&type=recovery. AuthCallbackScreen exchanges the PKCE code and -
 *      seeing type=recovery - routes to /(auth)/update-password.
 *   5. Fill a NEW ≥12-char password and submit. Assert routing away.
 *   6. HARD proof: createAnonClient().signInWithPassword(email, NEW_PASSWORD)
 *      must SUCCEED; OLD_PASSWORD must FAIL.
 *
 * No conditionals, no try/catch around the proof assertions, no tautologies.
 */

import { expect, test } from "@playwright/test";

import {
  createAnonClient,
  createServiceClient,
  deleteUserByEmail,
  dismissCookieBanner,
  fetchRecoveryLink,
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
    await page.goto("/");
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

    // 5. Fetch the recovery link from Mailpit. Under the PKCE flow the link is:
    //    .../auth/v1/verify?token=...&type=recovery&redirect_to=<e2e baseURL>/auth-callback?type=recovery
    //    The app builds redirect_to (with a ?type=recovery marker, see
    //    getPasswordResetRedirectUrl) from EXPO_PUBLIC_PUBLIC_APP_URL = the e2e
    //    server's origin, which is allowlisted in supabase/config.toml's
    //    additional_redirect_urls (both :8081 and :8099/auth-callback), so Supabase
    //    honours it instead of falling back to site_url. No rewrite needed.
    const recoveryLink = await fetchRecoveryLink(page, THROWAWAY_EMAIL);
    expect(recoveryLink).toContain("/auth/v1/verify");

    // The app bakes redirect_to from its inlined EXPO_PUBLIC_PUBLIC_APP_URL, which on
    // this setup is the dev web origin (:8081), not necessarily the port the e2e
    // server is running on. Rewrite redirect_to to THIS e2e server's origin (the
    // Playwright baseURL) so the recovery 303 lands back on the server under test -
    // where the PKCE code_verifier was stored when the reset was requested. The target
    // origin is allowlisted in supabase/config.toml, so GoTrue still honours it.
    const e2eOrigin = new URL(test.info().project.use.baseURL!).origin;
    const verifyUrl = new URL(recoveryLink);
    const appRedirect = new URL(verifyUrl.searchParams.get("redirect_to")!);
    verifyUrl.searchParams.set(
      "redirect_to",
      `${e2eOrigin}${appRedirect.pathname}${appRedirect.search}`,
    );

    // 6. Navigate to the verify link. Supabase returns a 303 to
    //    <e2e baseURL>/auth-callback?code=...&type=recovery
    //    AuthCallbackScreen exchanges the PKCE code, and - seeing type=recovery -
    //    routes to /(auth)/update-password.
    await page.goto(verifyUrl.toString());

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
