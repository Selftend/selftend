import type { Page } from "@playwright/test";

// Relative, not the "@/" alias: every other module under test/e2e/ imports src
// this way, and Playwright resolves its own TS without the jest moduleNameMapper
// that makes the alias work at test/ root.
import enErrors from "../../src/i18n/locales/en/errors.json";

/**
 * The global save-failed toast's title, read from the locale rather than retyped.
 * A hardcoded copy would drift the moment someone reworded the string, and this
 * guard would then quietly never fire again - worse than not having it, because
 * the specs would look protected.
 *
 * `query-client.ts` builds that toast from `errors:saveFailed.title`; a test at
 * test/toast-signal.test.ts pins that it still does.
 */
export const SAVE_FAILED_TOAST_TITLE = enErrors.saveFailed.title;

const DEFAULT_TOAST_TIMEOUT = 15_000;

/**
 * Wait for a success toast carrying `text`, failing fast - and by name - when the
 * global save-failed toast is showing instead.
 *
 * Eleven assertions across nine specs use a success toast as their proof that a
 * DB write committed, because the toast fires only after `mutateAsync` resolves.
 * But `query-client.ts` raises an error toast from ANY unsuppressed mutation
 * failure, and the toast is a single slot: the error takes it, so the success the
 * spec is waiting for never renders. Waiting on the success text alone turns that
 * into an anonymous 15s timeout that says nothing about what actually broke.
 *
 * This races the two. If the save-failed toast wins, the spec fails immediately
 * with the reason attached instead of burning the full timeout on a toast that
 * cannot arrive.
 *
 * Both locators are scoped through `testID="app-toast"` so a same-worded permanent
 * node on the page underneath cannot satisfy the wait - the vacuous-assertion trap
 * that an unscoped `getByText("Saved")` leaves open (it matches case-insensitive
 * substrings, so even "Saved already ..." would do).
 */
export async function expectSuccessToast(
  page: Page,
  text: string | RegExp,
  options: { timeout?: number } = {},
): Promise<void> {
  const timeout = options.timeout ?? DEFAULT_TOAST_TIMEOUT;
  const toast = page.getByTestId("app-toast");
  // A RegExp already prints its delimiters; a plain string needs quoting to read
  // as copy rather than as a sentence fragment.
  const described = typeof text === "string" ? `"${text}"` : String(text);

  // Promise.race subscribes to both, so the loser's eventual timeout rejection is
  // observed and never surfaces as an unhandled rejection in a later test.
  const outcome = await Promise.race([
    toast
      .getByText(text)
      .waitFor({ state: "visible", timeout })
      .then(() => "success" as const),
    toast
      .getByText(SAVE_FAILED_TOAST_TITLE)
      .waitFor({ state: "visible", timeout })
      .then(() => "saveFailed" as const),
  ]).catch(() => "timeout" as const);

  if (outcome === "saveFailed") {
    throw new Error(
      `Expected the success toast ${described}, but the global save-failed toast ` +
        `("${SAVE_FAILED_TOAST_TITLE}") is showing instead. A mutation failed, so the success ` +
        `toast this waits on will never arrive. Check the app console and the Supabase logs ` +
        `for the underlying error.`,
    );
  }

  if (outcome === "timeout") {
    throw new Error(
      `Timed out after ${timeout}ms waiting for the success toast ${described} inside ` +
        `testID="app-toast". No save-failed toast appeared either, so the mutation most likely ` +
        `never fired - or the toast's copy changed and this expectation is now looking for ` +
        `something nothing renders.`,
    );
  }
}
