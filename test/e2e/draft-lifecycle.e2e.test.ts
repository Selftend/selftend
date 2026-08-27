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
    // ☠️ Poll for the CONTENT, not the key: mounting the form persists an
    // EMPTY envelope immediately, so a bare not-null check passes before the
    // debounced capture (#1381 removed the step transitions that used to
    // flush it synchronously) has written the text - and a reload taken then
    // restores nothing.
    await expect.poll(() => readThoughtDraft(page)).toContain("survive one reload");

    await page.reload();
    // The whole column is on one screen, so the restored value is right there.
    await expect(page.getByPlaceholder(SITUATION_PLACEHOLDER)).toHaveValue(situation);
    await expect(page.getByText("1 of 6 parts filled in")).toBeVisible();

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
    // Content, not key (see above): the purge assertion below is only proven
    // against a draft that actually holds the text.
    await expect.poll(() => readThoughtDraft(page)).toContain("must not remain");

    await page.goto("/settings");
    await page.getByRole("button", { name: "Sign out", exact: true }).first().click();
    await expect(
      page.getByRole("heading", { name: "Small tools for heavy days.", level: 1 }),
    ).toBeVisible({ timeout: 10_000 });
    await expect.poll(() => readThoughtDraft(page)).toBeNull();
  });
});
