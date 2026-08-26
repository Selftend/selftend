import { expect, test } from "./fixtures";

import { deleteAllThoughtRecordsForUser } from "./helpers";

const THOUGHT_DRAFT_KEY = "selftend:wizard-draft:cbt-thought-record";

test.describe("create thought record", () => {
  test.beforeEach(async ({ user }) => {
    // Alice starts with zero records by seed; clean to be doubly sure across reruns.
    await deleteAllThoughtRecordsForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllThoughtRecordsForUser(user.id);
  });

  test("alice signs in, fills the one-column thought record, and the record is saved", async ({
    page,
  }) => {
    const situation =
      "I noticed my heart racing before a routine team meeting and started bracing for criticism.";
    const automaticThought = "They are going to call me out for not delivering enough.";
    const balancedThought =
      "Most meetings are routine status updates; I have no specific evidence of a problem yet.";

    // The rail's own acceptance width: the six stops must fit a phone (#1381).
    await page.setViewportSize({ width: 360, height: 800 });

    await page.goto("/modules/cbt/new");
    // Cookie banner can re-show after navigation.
    await page
      .getByRole("button", { name: "Essential only", exact: true })
      .click({ timeout: 2_000 })
      .catch(() => undefined);

    // The whole form is ONE COLUMN (#1381): every part is on screen, there is
    // no "Continue", and the sticky rail names the six parts.
    await expect(page.getByText("0 of 6 parts filled in")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toHaveCount(0);
    // Nothing overflows the 360dp viewport - the rail's captions included.
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);

    // Situation
    await page
      .getByPlaceholder(
        "Example: I saw an email from my manager and my chest tightened immediately.",
      )
      .fill(situation);
    // Content, not a bare not-null check: mounting the form persists an empty
    // envelope immediately, so only the text proves the debounced capture ran.
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), THOUGHT_DRAFT_KEY))
      .toContain("bracing for criticism");

    // Thoughts - type, rate the belief, add. Several 0-100 tracks share the
    // column, so every rating click is scoped by testID.
    await page.getByPlaceholder("What did your mind say?").fill(automaticThought);
    await page
      .getByTestId("nat-add-belief-rating")
      .getByRole("button", { name: "70", exact: true })
      .click();
    await page.getByRole("button", { name: "Add thought", exact: true }).click();

    // Feelings - toggle a checkbox by clicking its label
    await page.getByText("Anxious", { exact: true }).first().click();

    // Patterns sit BEFORE evidence in the column.
    await page.getByRole("checkbox", { name: "Catastrophising", exact: true }).click();

    // Evidence prompts must render real copy, not raw keys.
    await expect(page.getByText("Is this a fact or an opinion?")).toBeVisible();
    await expect(page.getByText(/disputePrompt/)).toHaveCount(0);

    // Balanced - the calmer thought and the hot thought re-rated.
    await page
      .getByPlaceholder(
        "Example: I do not know what the email means yet. One message is not proof that I failed.",
      )
      .fill(balancedThought);
    await page
      .getByTestId("belief-after-rating")
      .getByRole("button", { name: "30", exact: true })
      .click();

    await page.getByRole("button", { name: "Save record", exact: true }).click();

    // After save, a new record lands on the calm closing moment first - now
    // leading with the BELIEF pair (#1381).
    await expect(page.getByText("You examined a thought.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Belief before")).toBeVisible();
    await expect(page.getByText("70", { exact: true })).toBeVisible();
    await expect(page.getByText("Belief after")).toBeVisible();
    await expect(page.getByText("30", { exact: true })).toBeVisible();
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), THOUGHT_DRAFT_KEY))
      .toBeNull();
    await page.getByRole("button", { name: "View record", exact: true }).click();

    // From there, "View record" routes to /cbt/history/<id>. Verify the saved values render.
    await expect(page.getByText(situation)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(automaticThought)).toBeVisible();
    await expect(page.getByText(balancedThought)).toBeVisible();

    // And the record shows up in history.
    await page.goto("/modules/cbt/history");
    await expect(page.getByText(balancedThought)).toBeVisible({ timeout: 10_000 });
  });

  test("a record with no thought is refused at the save, and a partial record saves", async ({
    page,
  }) => {
    await page.goto("/modules/cbt/new");
    await page
      .getByRole("button", { name: "Essential only", exact: true })
      .click({ timeout: 2_000 })
      .catch(() => undefined);

    // Only the LAST part filled - the column allows answering it first.
    await page
      .getByPlaceholder("Example: The thought still feels uncomfortable, but less certain.")
      .fill("It loosened a little.");
    await expect(page.getByText("1 of 6 parts filled in")).toBeVisible();

    // Save without a thought: refused at the save, with a visible reason - the
    // button is never disabled.
    await page.getByRole("button", { name: "Save record", exact: true }).click();
    await expect(page.getByText("Add at least one thought before saving.")).toBeVisible();

    // Add the one thing that is required and the same Save goes through.
    await page.getByPlaceholder("What did your mind say?").fill("I cannot finish anything.");
    await page.getByRole("button", { name: "Add thought", exact: true }).click();
    await page.getByRole("button", { name: "Save record", exact: true }).click();

    await expect(page.getByText("You examined a thought.")).toBeVisible({ timeout: 15_000 });
  });
});
