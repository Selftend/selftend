/**
 * Password-reset flow e2e test.
 *
 * Uses a throwaway user created via the admin API (email_confirm: true) so no
 * sign-up flow is required, and seeded users are never touched.
 *
 * Full happy-path (Fix A — browser recovery session on :8082):
 *   1. Navigate to forgot-password, submit throwaway email.
 *   2. Assert success copy appears.
 *   3. Fetch the recovery link from Mailpit.
 *   4. Rewrite the verify link's redirect_to to point at :8082/auth-callback.
 *      Local Supabase does not restrict the redirect_to for the verify endpoint
 *      (additional_redirect_urls only blocks the initial resetPasswordForEmail
 *      call — once the OTP token is in the URL the verify endpoint honours the
 *      redirect_to param). Rewriting lets the browser land on :8082 with the
 *      access_token fragment so the app can establish the recovery session.
 *   5. page.goto(rewrittenLink) — browser follows the 303 → :8082/auth-callback
 *      #access_token=…&type=recovery. AuthCallbackScreen calls setSession then
 *      routes to /(auth)/update-password.
 *   6. Fill a NEW ≥12-char password and submit. Assert routing to the tabs.
 *   7. HARD proof: createAnonClient().signInWithPassword(email, NEW_PASSWORD)
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

    // 5. Fetch the recovery link from Mailpit. The link contains:
    //    …/auth/v1/verify?token=…&type=recovery&redirect_to=http://localhost:8081
    //    Supabase uses site_url (:8081) because :8082/auth-callback is not in
    //    additional_redirect_urls. We rewrite redirect_to to :8082/auth-callback
    //    before navigating; the local Supabase verify endpoint honours the
    //    rewritten value at token-exchange time.
    const rawRecoveryLink = await fetchRecoveryLink(page, THROWAWAY_EMAIL);
    expect(rawRecoveryLink).toContain("/auth/v1/verify");

    // Rewrite redirect_to so the browser lands on :8082.
    const rewrittenLink = rawRecoveryLink.replace(
      /([?&]redirect_to=)[^&]*/,
      "$1" + encodeURIComponent("http://localhost:8082/auth-callback"),
    );

    // 6. Navigate to the rewritten verify link. Supabase returns a 303 to
    //    http://localhost:8082/auth-callback#access_token=…&refresh_token=…&type=recovery
    //    The app's AuthCallbackScreen reads window.location.href, calls setSession,
    //    and — seeing type=recovery — routes to /(auth)/update-password.
    await page.goto(rewrittenLink);

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
