import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllCoreBeliefsForUser,
  dismissCbtOnboarding,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

/**
 * Routes:
 *   /modules/cbt/beliefs/new            — NewBeliefScreen (create)
 *   /modules/cbt/beliefs/new?beliefId=X — NewBeliefScreen (edit)
 *   /modules/cbt/beliefs/[id]           — BeliefDetailScreen
 *   /modules/cbt/beliefs                — BeliefsScreen
 *
 * Wizard steps (cbt.json > beliefs):
 *   step1 "1. Belief & triggers"  — beliefStatement + triggeringSituations
 *   step2 "2. Evidence"           — evidenceFor + evidenceAgainst
 *   step3 "3. Alternative & strength" — alternativeBelief + originalBeliefStrength + alternativeBeliefStrength + reinforcementPlan
 *
 * Key labels (cbt.json > beliefs):
 *   beliefStatement   "Belief statement"
 *   beliefStatementPlaceholder "Example: I'm not good enough."
 *   listItemPlaceholder "Describe in a short sentence."
 *   alternativeBeliefPlaceholder "Example: I am still learning and that's enough."
 *   save "Save belief"
 *   continue "Continue"
 *   strengthTracker "Strength tracker"
 *   saveStrength "Save strength"
 *   edit "Edit belief"
 *
 * NOTE: The belief detail screen has NO delete button.
 * Edit is via "Edit belief" → opens /modules/cbt/beliefs/new?beliefId=X.
 * The strength tracker on the detail screen allows inline updates via "Save strength".
 */

test.describe("CBT belief: create, edit strength, and edit via wizard", () => {
  test.beforeEach(async () => {
    await deleteAllCoreBeliefsForUser(SEED_USERS.alice.id);
  });
  test.afterEach(async () => {
    await deleteAllCoreBeliefsForUser(SEED_USERS.alice.id);
  });

  test("alice creates a core belief, edits it, and verifies the change persists", async ({
    page,
  }) => {
    const beliefStatement = "I am not capable of handling difficult situations.";
    const triggerSituation = "When I get negative feedback at work.";
    const evidenceFor = "I have made mistakes before.";
    const evidenceAgainst = "I have solved hard problems successfully many times.";
    const alternativeBelief = "I am still learning and I can handle challenges one step at a time.";
    const editedAlternativeBelief =
      "I am capable and continue to develop my skills with each challenge.";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    await page.goto("/modules/cbt/beliefs/new");
    await dismissCbtOnboarding(page);

    // ── Step 1: Belief & triggers ──────────────────────────────────────────────
    await page.getByPlaceholder("Example: I'm not good enough.").fill(beliefStatement);

    // Fill the first trigger situation input
    await page.getByRole("textbox", { name: "Triggering situations 1" }).fill(triggerSituation);

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 2: Evidence ───────────────────────────────────────────────────────
    // Fill evidence for (first item)
    await page.getByRole("textbox", { name: "Evidence supporting the belief 1" }).fill(evidenceFor);

    // Fill evidence against (first item)
    await page
      .getByRole("textbox", { name: "Evidence against the belief 1" })
      .fill(evidenceAgainst);

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 3: Alternative & strength ────────────────────────────────────────
    await page
      .getByPlaceholder("Example: I am still learning and that's enough.")
      .fill(alternativeBelief);

    // Leave originalBeliefStrength at default 70, set alternativeBeliefStrength to 40
    // (NumberRating min=0 max=100 step=10 — buttons are "0","10",...,"100")
    // There are two NumberRatings on step 3: original (default 70) and alternative (default 30).
    // Button "40" appears twice (once per NumberRating). Use .nth(1) to click the second one
    // (alternative strength).
    await page.getByRole("button", { name: "40", exact: true }).nth(1).click();

    await page.getByRole("button", { name: "Save belief", exact: true }).click();

    // After save, routed to /modules/cbt/beliefs/[id]
    await expect(page).toHaveURL(/\/modules\/cbt\/beliefs\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByText(beliefStatement)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(alternativeBelief)).toBeVisible();

    // ── Update strength on detail page ─────────────────────────────────────────
    // The detail has an inline Strength tracker card. Change alternativeStrength to 60.
    // The detail renders two NumberRatings. Click "60".
    await page.getByRole("button", { name: "60", exact: true }).first().click();
    await page.getByRole("button", { name: "Save strength", exact: true }).click();
    // Reload to verify persistence
    await page.reload();
    await expect(page).toHaveURL(/\/modules\/cbt\/beliefs\/[^/]+$/, { timeout: 10_000 });
    // The button "60" in the NumberRating should now be selected (variant="default")
    // which in the DOM renders as a filled button.
    await expect(page.getByText(beliefStatement)).toBeVisible({ timeout: 10_000 });
    // Verify the new strength value (60) persisted: the selected NumberRating button
    // renders with variant="default" → "bg-primary" class; unselected buttons get
    // variant="outline" → "bg-background". Assert the first "60" button is selected.
    await expect(page.getByRole("button", { name: "60", exact: true }).first()).toHaveClass(
      /bg-primary/,
    );

    // ── Full edit via wizard ────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Edit belief", exact: true }).click();
    await expect(page).toHaveURL(/\/modules\/cbt\/beliefs\/new\?beliefId=/, { timeout: 15_000 });

    // Navigate to step 3 (Alternative & strength) directly
    // The wizard pills show step titles. We need to advance through steps.
    // The wizard will show step 1 first (edit mode loads existing data).
    // Wait for the form to populate then continue to step 3.
    await expect(page.getByPlaceholder("Example: I'm not good enough.")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Now on step 3: change the alternative belief text
    const altBeliefField = page.getByPlaceholder("Example: I am still learning and that's enough.");
    await altBeliefField.clear();
    await altBeliefField.fill(editedAlternativeBelief);

    await page.getByRole("button", { name: "Save belief", exact: true }).click();

    // After save, router.replace to /modules/cbt/beliefs/[id]
    await expect(page).toHaveURL(/\/modules\/cbt\/beliefs\/[^/]+$/, { timeout: 15_000 });
    // Assert the edited alternative belief is visible. Use .last() for router.replace stack.
    await expect(page.getByText(editedAlternativeBelief).last()).toBeVisible({ timeout: 15_000 });
    // Original should still appear somewhere (belief statement)
    await expect(page.getByText(beliefStatement).last()).toBeVisible();
  });
});
