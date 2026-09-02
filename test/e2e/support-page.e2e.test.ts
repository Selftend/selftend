/**
 * Support page e2e (#1728): the assembled column, the rebuilt form, and a send
 * that never reaches the server.
 *
 * Signs in as a throwaway user the way account-deletion does (created through
 * the admin API, pre-confirmed, deleted in afterEach - never a seed or pool
 * user, and never an address that receives mail).
 *
 * ☠️ `send-feedback` MUST NOT reach the server: the function emails the support
 * mailbox (the AGENTS.md email-deliverability rule), and CI starts the stack
 * without an edge runtime anyway. Every call is intercepted with `page.route`
 * and fulfilled locally; the handler counts hits so the spec can prove "no
 * request was made" where none should be, and that every send it did make
 * was answered here. Playwright answers the CORS preflight itself and adds the
 * allow-origin header to a fulfilled cross-origin response, so the handler
 * only ever sees the POST.
 */

import { expect, test, type Page } from "@playwright/test";

import enCommon from "../../src/i18n/locales/en/common.json";
import enSettings from "../../src/i18n/locales/en/settings.json";
import {
  createServiceClient,
  deleteUserByEmail,
  dismissCookieBanner,
  expectSuccessToast,
  signInWithPasswordViaUi,
} from "./helpers";
// ☠️ From ./session-injection, not ./fixtures: loading fixtures.ts registers a
// `beforeEach({ user })` hook that a plain @playwright/test file cannot satisfy.
import { NORMALIZED_GATE_PREFS } from "./session-injection";

const { feedback, supportPage, account } = enSettings;
const { safety } = enCommon;

const THROWAWAY_PASSWORD = "throwaway-support-pass-123";

/** The function's URL under the Supabase gateway; `**` absorbs scheme and host. */
const SEND_FEEDBACK_ROUTE = "**/functions/v1/send-feedback";

/**
 * The page's heading outline, top to bottom: h1 Support, the callout's h3 (a
 * CardTitle), the form's h2, and the four Section eyebrows as h3s. The delete
 * section is title-less, so it adds nothing here.
 */
const EXPECTED_OUTLINE = [
  `1 ${supportPage.title}`,
  `3 ${safety.title}`,
  `2 ${feedback.title}`,
  `3 ${feedback.otherChannels}`,
  `3 ${supportPage.handles}`,
  `3 ${supportPage.projectLinks}`,
  `3 ${supportPage.policiesAndSafety}`,
];

interface FeedbackHit {
  method: string;
  body: unknown;
}

/**
 * Intercepts every `send-feedback` call and answers it here. The status is
 * read at request time, so `respondWith` switches the function's answer
 * between sends without re-routing.
 */
async function interceptSendFeedback(page: Page) {
  const hits: FeedbackHit[] = [];
  let status = 200;
  await page.route(SEND_FEEDBACK_ROUTE, async (route) => {
    const request = route.request();
    hits.push({ method: request.method(), body: request.postDataJSON() });
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(status === 200 ? {} : { error: "rate limited" }),
    });
  });
  return {
    hits,
    respondWith(next: 200 | 429) {
      status = next;
    },
  };
}

async function createThrowawayUser(email: string): Promise<string> {
  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: THROWAWAY_PASSWORD,
    email_confirm: true,
  });
  expect(error).toBeNull();
  expect(data.user).not.toBeNull();
  const userId = data.user!.id;

  // The consent gate, the first-run wizard and the verify banner all key off
  // prefs; normalising them up front (as fixtures.ts does for pool users) keeps
  // the spec about the support page rather than about dismissing modals.
  const { error: prefsError } = await admin
    .from("user_preferences")
    .upsert({ user_id: userId, ...NORMALIZED_GATE_PREFS }, { onConflict: "user_id" });
  expect(prefsError).toBeNull();

  return userId;
}

async function openSupport(page: Page) {
  await page.goto("/support");
  await dismissCookieBanner(page);
  await expect(
    page.getByRole("heading", { name: supportPage.title, exact: true, level: 1 }),
  ).toBeVisible({ timeout: 10_000 });
}

/** Every visible heading as "<level> <text>", in document order. */
function readOutline(page: Page) {
  return page
    .getByRole("heading")
    .evaluateAll((nodes) =>
      nodes.map((node) => `${node.getAttribute("aria-level")} ${node.textContent?.trim()}`),
    );
}

test.describe("support page", () => {
  // Each test owns one throwaway account; the safety net removes whichever the
  // test created, even when it failed before its own cleanup.
  let throwawayEmail = "";

  test.afterEach(async () => {
    if (throwawayEmail) await deleteUserByEmail(throwawayEmail);
    throwawayEmail = "";
  });

  test("the column, the form, and a send that never reaches the server", async ({ page }) => {
    throwawayEmail = `support-e2e-${Date.now()}@test.local`;
    const userId = await createThrowawayUser(throwawayEmail);
    const { hits, respondWith } = await interceptSendFeedback(page);

    await signInWithPasswordViaUi(page, throwawayEmail, THROWAWAY_PASSWORD);
    await openSupport(page);

    await test.step("the column reads h1 → callout h3 → form h2 → four h3s, and the callout opens /crisis", async () => {
      expect(await readOutline(page)).toEqual(EXPECTED_OUTLINE);

      await page.getByRole("button", { name: safety.openCrisis, exact: true }).click();
      await expect(page).toHaveURL(/\/crisis$/);
      await page.goBack();
      await expect(
        page.getByRole("heading", { name: supportPage.title, exact: true, level: 1 }),
      ).toBeVisible({ timeout: 10_000 });
    });

    const message = page.getByLabel(feedback.messageLabel, { exact: true });
    const send = page.getByRole("button", { name: feedback.submit, exact: true });

    await test.step("a too-short message is refused inline, and no request is made", async () => {
      const question = page.getByRole("radio", { name: feedback.category.question, exact: true });
      await question.click();
      await expect(question).toBeChecked();
      // An account holder gets the reply-to line, not a field.
      await expect(
        page.getByText(feedback.replyToAccount.replace("{{email}}", throwawayEmail), {
          exact: true,
        }),
      ).toBeVisible();

      await message.fill("short");
      await send.click();
      await expect(page.getByText(feedback.messageTooShort, { exact: true })).toBeVisible();
      expect(hits).toHaveLength(0);
    });

    await test.step("a valid message is sent, the toast shows, and Send is still there (#1722)", async () => {
      const text = "The support page e2e is sending a message that never leaves the machine.";
      await message.fill(text);
      await send.click();

      await expectSuccessToast(page, feedback.submitSuccess);
      expect(hits).toEqual([{ method: "POST", body: { category: "question", message: text } }]);

      // The regression: a success used to replace the button with a thank-you
      // line, so a second message had no way out of the page.
      await expect(send).toBeVisible();
      await expect(send).toBeEnabled();
      await expect(message).toHaveValue("");
    });

    await test.step("a 429 shows the rate-limited toast and keeps the message in the box", async () => {
      respondWith(429);
      const text = "A second message, this time answered with the function's rate limit.";
      await message.fill(text);
      await send.click();

      await expect(
        page.getByTestId("app-toast").getByText(feedback.rateLimited, { exact: true }),
      ).toBeVisible({ timeout: 15_000 });
      expect(hits).toHaveLength(2);
      await expect(message).toHaveValue(text);
      await expect(send).toBeEnabled();

      // An error toast stays until dismissed, and the toast host sits over the
      // bottom of the viewport - exactly where the delete row is. Dismiss it
      // the way a person would; the toast is on screen, so this is a real exit.
      const toast = page.getByTestId("app-toast");
      await toast.getByRole("button", { name: enCommon.toast.dismiss, exact: true }).click();
      await expect(toast).toBeHidden();
    });

    await test.step("the delete row opens the modal, Cancel closes it, and the account survives", async () => {
      await page.getByRole("button", { name: account.deleteButton, exact: true }).click();
      const title = page.getByText(account.deleteTitle, { exact: true });
      await expect(title).toBeVisible({ timeout: 10_000 });

      await page.getByRole("button", { name: account.cancel, exact: true }).click();
      // On web a closed modal unmounts outright, so this is a real disappearance.
      await expect(title).toBeHidden();
      await expect(
        page.getByRole("button", { name: account.deleteButton, exact: true }),
      ).toBeVisible();

      const admin = createServiceClient();
      const { data, error } = await admin.auth.admin.getUserById(userId);
      expect(error).toBeNull();
      expect(data.user?.email).toBe(throwawayEmail);
    });
  });

  test("at phone width the outline holds, the chip run wraps, and both store rows are present", async ({
    page,
  }) => {
    throwawayEmail = `support-e2e-phone-${Date.now()}@test.local`;
    await createThrowawayUser(throwawayEmail);
    // Guard, not a step: nothing here sends, and a hit would be a bug.
    const { hits } = await interceptSendFeedback(page);

    await page.setViewportSize({ width: 360, height: 800 });
    await signInWithPasswordViaUi(page, throwawayEmail, THROWAWAY_PASSWORD);
    await openSupport(page);

    expect(await readOutline(page)).toEqual(EXPECTED_OUTLINE);

    // "Bug · Idea · Question · This helped" is two lines in the 312px column:
    // the first and the last chip sit on different rows.
    const first = await page
      .getByRole("radio", { name: feedback.category.bug, exact: true })
      .boundingBox();
    const last = await page
      .getByRole("radio", { name: feedback.category.helped, exact: true })
      .boundingBox();
    expect(first).not.toBeNull();
    expect(last).not.toBeNull();
    expect(last!.y).toBeGreaterThan(first!.y + first!.height / 2);

    // Store referral is a web-only surface, and both rows are drawn whether or
    // not their URL is configured (the e2e build bakes only the Play one).
    await expect(page.getByTestId("support-row-android")).toBeVisible();
    await expect(page.getByTestId("support-row-ios")).toBeVisible();

    expect(hits).toHaveLength(0);
  });
});
