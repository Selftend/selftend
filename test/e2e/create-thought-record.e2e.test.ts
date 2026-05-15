import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllThoughtRecordsForUser,
  dismissCbtOnboarding,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

test.describe("create thought record", () => {
  test.beforeEach(async () => {
    // Alice starts with zero records by seed; clean to be doubly sure across reruns.
    await deleteAllThoughtRecordsForUser(SEED_USERS.alice.id);
  });

  test.afterEach(async () => {
    await deleteAllThoughtRecordsForUser(SEED_USERS.alice.id);
  });

  test("alice signs in, completes the thought record wizard, and the record is saved", async ({
    page,
  }) => {
    const situation =
      "I noticed my heart racing before a routine team meeting and started bracing for criticism.";
    const automaticThought = "They are going to call me out for not delivering enough.";
    const balancedThought =
      "Most meetings are routine status updates; I have no specific evidence of a problem yet.";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    await page.goto("/modules/cbt/new");
    await dismissCbtOnboarding(page);
    // Cookie banner can re-show after navigation.
    await page
      .getByRole("button", { name: "Essential only", exact: true })
      .click({ timeout: 2_000 })
      .catch(() => undefined);

    // Step 1: Situation
    await page
      .getByPlaceholder(
        "Example: I saw an email from my manager and my chest tightened immediately.",
      )
      .fill(situation);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 2: Automatic thought
    await page
      .getByPlaceholder("Example: I am about to be told I messed everything up.")
      .fill(automaticThought);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 3: Emotions — toggle a checkbox by clicking its label
    await page.getByText("Anxious", { exact: true }).first().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 4: Evidence is optional in this flow.
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 5: Distortions
    await page.getByRole("checkbox", { name: "Catastrophizing", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 6: Balanced thought
    await page
      .getByPlaceholder(
        "Example: I do not know what the email means yet. One message is not proof that I failed.",
      )
      .fill(balancedThought);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 7: Outcome is optional; save from the final step.
    await page.getByRole("button", { name: "Save record", exact: true }).click();

    // After save, app routes to /cbt/history/<id>. Verify the saved values render.
    await expect(page.getByText(situation)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(automaticThought)).toBeVisible();
    await expect(page.getByText(balancedThought)).toBeVisible();

    // And the record shows up in history.
    await page.goto("/modules/cbt/history");
    await expect(page.getByText(balancedThought)).toBeVisible({ timeout: 10_000 });
  });
});
