// STALENESS WARNING: the verification step expects the OTP-code email from
// supabase/templates/magic_link.html. A Supabase stack started before that
// template existed (templates load only at `supabase start`, not on db:reset)
// or a stale dist-e2e export / reused foreign server
// (E2E_REUSE_EXISTING_SERVER=1) sends the default link-only email and fails
// this spec - restart the stack and rebuild the export before debugging
// anything else.

import { expect, test } from "@playwright/test";

import { deleteUserByEmail, dismissCookieBanner, fetchVerificationCodeViaMailpit } from "./helpers";

test.describe("sign-up + onboarding + first record", () => {
  const email = `signup-e2e-${Date.now()}@test.local`;
  const password = "e2e-test-pass-1234";

  test.afterEach(async () => {
    await deleteUserByEmail(email);
  });

  test("new user signs up, completes onboarding, and saves their first thought record", async ({
    page,
  }) => {
    await page.goto("/sign-up");
    await dismissCookieBanner(page);
    await expect(page.getByText("Create an account")).toBeVisible({ timeout: 10_000 });

    // Fill the sign-up form. Expo Router may keep both auth screens mounted,
    // so scope to visible inputs only.
    await page.locator('input[placeholder="m@example.com"]:visible').fill(email);
    const pwInputs = page.locator('input[type="password"]:visible');
    await pwInputs.nth(0).fill(password);
    await pwInputs.nth(1).fill(password);
    await page.getByRole("button", { name: "Sign up", exact: true }).click();

    // Autoconfirm (#489): sign-up returns a session immediately and routes
    // straight into the app - no interstitial, no confirmation email. Mailbox
    // ownership is proven later through the verify banner, exercised at the
    // end of this journey.

    // First-time user must accept consent before anything else.
    // Handle the consent gate manually so the wizard is left for us to walk below.
    const consentTitle = page.getByText("Quick policy check", { exact: true });
    const consentVisible = await consentTitle
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (consentVisible) {
      await page.getByRole("checkbox").first().click();
      const acceptButton = page.getByRole("button", { name: "Accept and continue", exact: true });
      await expect(acceptButton).toBeEnabled({ timeout: 5_000 });
      await acceptButton.click();
      await expect(consentTitle).toBeHidden({ timeout: 10_000 });
    }

    // Panel 1: welcome + disclaimer.
    await expect(page.getByText("Welcome to Selftend")).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Panel 2: pick a concern.
    await expect(page.getByText("What brings you here?")).toBeVisible();
    await page.getByText("Sleep", { exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Panel 3: leave both optional modules unselected for a tools-only setup.
    // Guidance is skipped; with >= 2 eligible steps and zero routines the
    // starter-routine offer (#46) is the panel before finish.
    await expect(page.getByText("Would a self-help module be useful?")).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Final panel: the pre-composed starter routine. Decline it - skipping must
    // write nothing and simply finish onboarding with the tool suggestions.
    await expect(page.getByText("One small routine to start?")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Skip", exact: true }).click();
    await expect(page.getByText("One small routine to start?", { exact: true })).toBeHidden({
      timeout: 15_000,
    });

    // Personalization payoff: the selected shared widgets are now on Home.
    await expect(page.getByText("Check-in", { exact: true }).last()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Sleep", { exact: true }).last()).toBeVisible({
      timeout: 10_000,
    });

    // The optional Home tour may be ineligible after the personalized setup. If
    // it appears, dismiss it so the reload assertion remains deterministic.
    const skipTour = page.getByRole("button", { name: "Skip all tips", exact: true });
    if (await skipTour.isVisible()) await skipTour.click();

    // Reload: the one-time widget wizard must not reappear.
    await page.reload();
    await dismissCookieBanner(page);
    await expect(page.getByText("Welcome to Selftend")).toBeHidden();

    // Now create the first thought record. (The CBT onboarding modal mounts on
    // the CBT home screen only, so navigating straight to /new skips it.)
    await page.goto("/modules/cbt/new");
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

    // NATs - type thought, add it, then continue
    await page.getByPlaceholder("What did your mind say?").fill(automaticThought);
    await page.getByRole("button", { name: "Add thought", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Hot thought - one is auto-selected; just continue
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

    // Saving a new record lands on the closing moment; "View record" opens the detail.
    await expect(page.getByText("You examined a thought.")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "View record", exact: true }).click();

    // Detail page renders the saved values.
    await expect(page.getByText(situation)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(balancedThought)).toBeVisible();

    // Finally, the verify banner (#489): it has been pinned at the top since
    // sign-in, and the full send-code -> enter-code round trip clears it.
    await expect(page.getByText("Verify your email to secure your account.")).toBeVisible();
    await page.getByRole("button", { name: "Send code", exact: true }).click();
    // Copy no longer states a digit count: the backend owns the OTP length and
    // hardcoding six in the client is the bug this branch fixes.
    await expect(page.getByText("We emailed you a verification code.")).toBeVisible({
      timeout: 15_000,
    });

    const code = await fetchVerificationCodeViaMailpit(page, email);
    await page.getByLabel("Verification code").fill(code);
    await page.getByRole("button", { name: "Verify", exact: true }).click();

    // Verified: the banner unmounts and stays gone across a reload (the flag
    // is persisted, not component state).
    await expect(page.getByText("Verify your email to secure your account.")).toBeHidden({
      timeout: 15_000,
    });
    await page.reload();
    await dismissCookieBanner(page);
    await expect(page.getByText(situation)).toBeVisible({ timeout: 15_000 });

    // #548 lists this line as flaky. Worth being precise about what a failure
    // here can and cannot mean, because the obvious reading is wrong:
    //
    // The query cache is NOT persisted on web - `createQueryPersister` returns
    // null for `Platform.OS === "web"` - so after a reload there is no stale
    // snapshot to flash from. `VerifyEmailBanner` also renders nothing while
    // preferences are loading, precisely so it cannot flash. And the config's
    // default expect timeout is already 10s.
    //
    // So a failure here is not a transition being caught mid-flight. It means
    // the banner was genuinely visible for over ten seconds after a reload,
    // i.e. `email_verified` did not survive the round trip - the #504 silent
    // no-op class of bug. That is worth failing on, so the assertion keeps its
    // teeth; the message just makes the next reader stop guessing.
    await expect(
      page.getByText("Verify your email to secure your account."),
      "Verify banner still showing after a completed verification and a reload. This is not a" +
        " timing flake: web does not persist the query cache, and the banner self-suppresses" +
        " while preferences load. Check that user_preferences.email_verified was actually" +
        " written (see #504).",
    ).toBeHidden({ timeout: 15_000 });
  });
});
