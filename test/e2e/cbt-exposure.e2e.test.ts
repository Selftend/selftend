import { expect, test } from "./fixtures";

import { deleteAllExposureForUser } from "./helpers";

/**
 * Routes:
 *   /modules/cbt/exposure/new    - NewExposureHierarchyScreen (wizard)
 *   /modules/cbt/exposure/[id]   - ExposureHierarchyDetailScreen
 *   /modules/cbt/exposure        - ExposureScreen (list)
 *
 * Wizard steps (cbt.json > exposure):
 *   step1 "1. About"  - title ("Title") + anxietyType ("Type of anxiety")
 *   step2 "2. Steps"  - items field array (description + SUDS NumberRating)
 *
 * Key labels (cbt.json > exposure):
 *   hierarchyTitle "Title"
 *   anxietyType "Type of anxiety"
 *   itemDescription "Step description"
 *   itemSuds "Anticipated SUDS (0–100)"
 *   addItem "Add step"
 *   save "Save hierarchy"
 *   continue "Continue"
 *   item.start "Start session"
 *   session.preSuds "Pre-exposure SUDS (0–100)"
 *   session.postSuds "Post-exposure SUDS (0–100)"
 *   session.duration "Duration (minutes)"
 *   session.save "Save session"
 *
 * The detail screen has NO delete button. Items have a "Start session" button
 * that opens a Modal SessionSheet. After saving a session the item shows
 * "Recent sessions" with a summary row. Cleanup is via deleteAllExposureForUser.
 *
 * State assertions:
 *   - After create: hierarchy title + item description visible on detail screen
 *   - After session save: "Recent sessions" section appears with session summary
 *     (pre SUDS → post SUDS · duration min)
 */

test.describe("CBT exposure: create hierarchy and log a session", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllExposureForUser(user.id);
  });
  test.afterEach(async ({ user }) => {
    await deleteAllExposureForUser(user.id);
  });

  test("alice creates an exposure hierarchy with one step, logs a session, and the session appears in recent sessions", async ({
    page,
  }) => {
    const hierarchyTitle = "Driving on motorways";
    const anxietyType = "Driving anxiety";
    const stepDescription = "Drive to the nearest on-ramp and sit in the car";

    await page.goto("/modules/cbt/exposure/new");

    // ── Step 1: About ──────────────────────────────────────────────────────────
    await page.getByRole("textbox", { name: "Title" }).fill(hierarchyTitle);
    await page.getByRole("textbox", { name: "Type of anxiety" }).fill(anxietyType);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 2: Steps ──────────────────────────────────────────────────────────
    // One item row is pre-populated; fill in the description.
    await page.getByRole("textbox", { name: "Step description" }).fill(stepDescription);

    // Rate anticipated SUDS at 30 (the NumberRating renders buttons 0,10,20,...100)
    // Buttons are labelled by their numeric value text.
    await page.getByRole("button", { name: "30", exact: true }).first().click();

    await page.getByRole("button", { name: "Save hierarchy", exact: true }).click();

    // After save, routed to /modules/cbt/exposure/[id]
    await expect(page).toHaveURL(/\/modules\/cbt\/exposure\/[^/]+$/, { timeout: 20_000 });
    await expect(page.getByText(hierarchyTitle).last()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(stepDescription).last()).toBeVisible({ timeout: 10_000 });

    // ── Log a session ──────────────────────────────────────────────────────────
    // The ItemRow for our step has a "Start session" button.
    await page.getByRole("button", { name: "Start session", exact: true }).last().click();

    // The SessionSheet modal should be visible.
    await expect(page.getByText("Exposure session")).toBeVisible({ timeout: 10_000 });

    // Rate pre-SUDS at 50
    // There are two NumberRating groups (pre / post) - get the "50" buttons
    // and click the first one (pre-SUDS) then the second one (post-SUDS).
    const fiftyButtons = page.getByRole("button", { name: "50", exact: true });
    await fiftyButtons.first().click();

    // Rate post-SUDS at 20
    const twentyButtons = page.getByRole("button", { name: "20", exact: true });
    // There may be multiple "20" buttons across pre/post. The post-SUDS row
    // comes second - click the last matching one.
    await twentyButtons.last().click();

    // Enter duration
    await page.getByRole("textbox", { name: "Duration (minutes)" }).fill("15");

    await page.getByRole("button", { name: "Save session", exact: true }).click();

    // After saving the modal should close and "Recent sessions" section appears.
    await expect(page.getByText("Exposure session")).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText("Recent sessions").last()).toBeVisible({ timeout: 10_000 });
    // The session summary format is "Pre {{pre}} → Post {{post}} · {{duration}} min"
    await expect(page.getByText(/Pre 50.*Post 20.*15 min/).last()).toBeVisible({ timeout: 10_000 });
  });
});
