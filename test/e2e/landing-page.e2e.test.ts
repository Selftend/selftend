import { expect, test } from "@playwright/test";

import { dismissCookieBanner } from "./helpers";

// The public marketing landing page rendered at "/" for SIGNED-OUT web
// visitors (app/index.tsx: Platform.OS === "web" ? <LandingScreen /> : ...).
// No pool user / storageState fixture is used here - these tests exercise the
// pre-auth experience, mirroring the pre-auth portions of sign-in.e2e.test.ts
// and sign-up-onboarding.e2e.test.ts (plain `@playwright/test`, not the
// authenticated `user` fixture from ./fixtures).
test.describe("landing page (signed out)", () => {
  test("shows the hero headline as the page's single top-level heading", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);

    await expect(
      page.getByRole("heading", { name: "Small tools for heavy days.", level: 1 }),
    ).toBeVisible();
  });

  // #1441 renamed the sign-up link: "Start now - no account needed" is the
  // primary CTA (an action, covered by landing-guest-entry.e2e.test.ts), and
  // the sign-up LINK beside it now reads "Create an account".
  test("'Create an account' navigates to the sign-up screen", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);

    await page.getByRole("link", { name: "Create an account", exact: true }).click();

    await expect(page).toHaveURL(/\/sign-up$/, { timeout: 10_000 });
    // The subtitle, not the "Create an account" title: the landing link that
    // navigated here carries the same three words.
    await expect(page.getByText("Enter your details to get started.")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("'Sign in' navigates to the sign-in screen", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);

    await page.getByRole("link", { name: "Sign in", exact: true }).click();

    await expect(page).toHaveURL(/\/sign-in$/, { timeout: 10_000 });
    await expect(page.getByText("Sign in to your account")).toBeVisible({ timeout: 10_000 });
  });

  test("footer crisis link reaches /crisis", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);

    await page.getByRole("link", { name: "Open crisis guidance", exact: true }).click();

    await expect(page).toHaveURL(/\/crisis$/, { timeout: 10_000 });
    await expect(page.getByText("Crisis guidance", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });
});

// The Android mobile-web download bar (#388 section 4): UA-gated, public
// routes only, forever-dismissible. Desktop must never see it; an Android
// browser sees it until dismissed, and the dismissal survives a reload.
test.describe("Android download bar", () => {
  test("desktop UA never sees the bar", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);
    await expect(page.getByText("Selftend is on Google Play.")).toHaveCount(0);
  });

  test.describe("Android UA", () => {
    test.use({
      userAgent:
        "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
    });

    test("shows the bar on the landing and dismissal survives reload", async ({ page }) => {
      await page.goto("/");
      await dismissCookieBanner(page);
      await expect(page.getByText("Selftend is on Google Play.")).toBeVisible({
        timeout: 10_000,
      });

      await page.getByRole("button", { name: "Dismiss", exact: true }).last().click();
      await expect(page.getByText("Selftend is on Google Play.")).toBeHidden();

      await page.reload();
      await dismissCookieBanner(page);
      await expect(page.getByText("Selftend is on Google Play.")).toHaveCount(0);
    });
  });
});
