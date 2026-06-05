import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllThoughtRecordsForUser,
  dismissCbtOnboarding,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

test.describe("edit and archive a thought record", () => {
  test.beforeEach(async () => {
    await deleteAllThoughtRecordsForUser(SEED_USERS.alice.id);
  });
  test.afterEach(async () => {
    await deleteAllThoughtRecordsForUser(SEED_USERS.alice.id);
  });

  test("alice creates a thought record, edits the balanced thought, then archives it", async ({
    page,
  }) => {
    const situation =
      "I noticed my heart racing before a routine team meeting and started bracing for criticism.";
    const automaticThought = "They are going to call me out for not delivering enough.";
    const originalBalancedThought =
      "Most meetings are routine status updates; I have no specific evidence of a problem yet.";
    const editedBalancedThought =
      "I can ask for clarification if needed; one meeting is not proof of failure.";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // --- CREATE via wizard ---
    await page.goto("/modules/cbt/new");
    await dismissCbtOnboarding(page);
    // Dismiss cookie banner if it reappears.
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

    // Step 2: NATs - type thought, add it, then continue
    await page.getByPlaceholder("What did your mind say?").fill(automaticThought);
    await page.getByRole("button", { name: "Add thought", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 3: Hot thought - one is auto-selected; just continue
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 4: Emotions - toggle a checkbox by clicking its label
    await page.getByText("Anxious", { exact: true }).first().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 5: Evidence is optional; skip.
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 6: Distortions
    await page.getByRole("checkbox", { name: "Catastrophizing", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 7: Balanced thought
    await page
      .getByPlaceholder(
        "Example: I do not know what the email means yet. One message is not proof that I failed.",
      )
      .fill(originalBalancedThought);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 8: Outcome is optional; save.
    await page.getByRole("button", { name: "Save record", exact: true }).click();

    // After save, detail screen shows the record at /modules/cbt/history/<id>.
    await expect(page).toHaveURL(/\/modules\/cbt\/history\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByText(originalBalancedThought)).toBeVisible({ timeout: 15_000 });

    // --- EDIT ---
    // The detail screen has an "Edit record" button that re-opens the wizard prefilled.
    await page.getByRole("button", { name: "Edit record", exact: true }).click();
    await expect(page).toHaveURL(/\/modules\/cbt\/new/, { timeout: 15_000 });

    // Navigate through the wizard steps until balanced thought (step 7).
    // Step 1: Situation is prefilled - continue.
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Step 2: NATs - continue.
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Step 3: Hot thought - continue.
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Step 4: Emotions - continue.
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Step 5: Evidence - continue.
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Step 6: Distortions - continue.
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 7: Balanced thought - clear and enter the edited value.
    const balancedThoughtInput = page.getByPlaceholder(
      "Example: I do not know what the email means yet. One message is not proof that I failed.",
    );
    await balancedThoughtInput.clear();
    await balancedThoughtInput.fill(editedBalancedThought);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 8: Outcome - save.
    await page.getByRole("button", { name: "Save record", exact: true }).click();

    // After save, detail screen reflects the edited balanced thought.
    await expect(page).toHaveURL(/\/modules\/cbt\/history\/[^/]+$/, { timeout: 15_000 });
    // Use .last() in case router.replace leaves a hidden stale instance.
    await expect(page.getByText(editedBalancedThought).last()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(originalBalancedThought)).toBeHidden({ timeout: 5_000 });

    // --- ARCHIVE (no delete affordance in UI) ---
    // The thought-record detail screen exposes "Edit record" and "Archive" buttons.
    // There is NO delete button; archive is the only removal action available.
    await page.getByRole("button", { name: "Archive", exact: true }).click();

    // After archive, redirected to /modules/cbt/history.
    await expect(page).toHaveURL(/\/modules\/cbt\/history/, { timeout: 15_000 });

    // The archived record is excluded from the useThoughtRecords query (archived_at IS NULL).
    // The history screen's empty-state text confirms no records are listed.
    // (router.replace may leave hidden stale instances in the DOM stack; asserting the
    //  empty-state text appears is more reliable than asserting the edited thought is hidden.)
    await expect(page.getByText("No records on this day")).toBeVisible({ timeout: 10_000 });
  });
});
