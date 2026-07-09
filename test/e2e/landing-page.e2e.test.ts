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
      page.getByRole("heading", { name: "Guided self-help, private by design.", level: 1 }),
    ).toBeVisible();
  });

  test("'Get started' navigates to the sign-up screen", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);

    await page.getByRole("button", { name: "Get started", exact: true }).click();

    await expect(page).toHaveURL(/\/sign-up$/, { timeout: 10_000 });
    await expect(page.getByText("Create an account")).toBeVisible({ timeout: 10_000 });
  });

  test("'Sign in' navigates to the sign-in screen", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);

    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page).toHaveURL(/\/sign-in$/, { timeout: 10_000 });
    await expect(page.getByText("Sign in to your account")).toBeVisible({ timeout: 10_000 });
  });

  test("footer crisis link reaches /crisis", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);

    await page.getByRole("button", { name: "Open crisis guidance", exact: true }).click();

    await expect(page).toHaveURL(/\/crisis$/, { timeout: 10_000 });
    await expect(page.getByText("Crisis guidance", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });
});
