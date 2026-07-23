import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { dismissPostSignInModals } from "./helpers";

const THOUGHT_DRAFT_KEY = "selftend:wizard-draft:cbt-thought-record";
const SITUATION_PLACEHOLDER =
  "Example: I saw an email from my manager and my chest tightened immediately.";

async function readThoughtDraft(page: Page) {
  return page.evaluate((key: string) => window.localStorage.getItem(key), THOUGHT_DRAFT_KEY);
}

test.describe("long-form draft lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await dismissPostSignInModals(page);
    await page.evaluate((key: string) => window.localStorage.removeItem(key), THOUGHT_DRAFT_KEY);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate((key: string) => window.localStorage.removeItem(key), THOUGHT_DRAFT_KEY);
  });

  test("restores a thought-record draft after reload and discards it explicitly", async ({
    page,
  }) => {
    const situation = "A private unfinished thought that should survive one reload.";

    await page.goto("/modules/cbt/new");
    await page.getByPlaceholder(SITUATION_PLACEHOLDER).fill(situation);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect.poll(() => readThoughtDraft(page)).not.toBeNull();

    await page.reload();
    await expect(page.getByPlaceholder("What did your mind say?")).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByPlaceholder(SITUATION_PLACEHOLDER)).toHaveValue(situation);

    await page.getByRole("button", { name: "Discard draft", exact: true }).click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect.poll(() => readThoughtDraft(page)).toBeNull();

    await page.goto("/modules/cbt/new");
    await expect(page.getByPlaceholder(SITUATION_PLACEHOLDER)).toHaveValue("");
  });

  test("signing out removes persisted draft content", async ({ page }) => {
    await page.goto("/modules/cbt/new");
    await page
      .getByPlaceholder(SITUATION_PLACEHOLDER)
      .fill("This content must not remain for the next signed-in person.");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect.poll(() => readThoughtDraft(page)).not.toBeNull();

    await page.goto("/settings");
    await page.getByRole("button", { name: "Sign out", exact: true }).first().click();
    await expect(
      page.getByRole("heading", { name: "Small tools for heavy days.", level: 1 }),
    ).toBeVisible({ timeout: 10_000 });
    await expect.poll(() => readThoughtDraft(page)).toBeNull();
  });
});
