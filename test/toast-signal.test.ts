import { readFileSync } from "fs";
import { join } from "path";

import enErrors from "@/src/i18n/locales/en/errors.json";

import { SAVE_FAILED_TOAST_TITLE, expectSuccessToast } from "./e2e/toast-signal";

// `test/e2e/` is in jest's testPathIgnorePatterns, so the e2e helper's own proof
// has to live out here at test/ root. The helper takes a type-only dependency on
// @playwright/test precisely so it can be driven by this fake instead of a browser.

interface Waiter {
  resolve: () => void;
  reject: (error: Error) => void;
  timeout: number | undefined;
}

function createFakePage() {
  const waiters = new Map<string, Waiter>();
  const scopes: string[] = [];
  const queried: string[] = [];

  const page = {
    getByTestId(testId: string) {
      scopes.push(testId);
      return {
        getByText(text: string | RegExp) {
          const key = String(text);
          queried.push(key);
          return {
            waitFor(options?: { state?: string; timeout?: number }) {
              return new Promise<void>((resolve, reject) => {
                waiters.set(key, { resolve, reject, timeout: options?.timeout });
              });
            },
          };
        },
      };
    },
  };

  // Both locators are built and awaited before the helper settles, so a test that
  // resolves a waiter must first let the helper reach its race.
  const settled = () => new Promise((resolve) => setImmediate(resolve));

  return { page: page as never, waiters, scopes, queried, settled };
}

describe("expectSuccessToast", () => {
  it("resolves once the success toast is visible", async () => {
    const { page, waiters, settled } = createFakePage();

    const pending = expectSuccessToast(page, "Saved");
    await settled();
    waiters.get("Saved")?.resolve();

    await expect(pending).resolves.toBeUndefined();
  });

  it("fails fast and names the save-failed toast when an error toast shows instead", async () => {
    const { page, waiters, settled } = createFakePage();

    const pending = expectSuccessToast(page, "Saved");
    await settled();
    // The success waiter is deliberately left pending forever. If the helper only
    // rejected once THAT settled, this test could not pass at all - which is what
    // makes it a real fail-fast proof rather than a timing guess.
    waiters.get(SAVE_FAILED_TOAST_TITLE)?.resolve();

    await expect(pending).rejects.toThrow(SAVE_FAILED_TOAST_TITLE);
    await expect(pending).rejects.toThrow(/Saved/);
  });

  it("reports the expected copy when neither toast arrives", async () => {
    const { page, waiters, settled } = createFakePage();

    const pending = expectSuccessToast(page, "Ratings saved", { timeout: 1234 });
    await settled();
    waiters.get("Ratings saved")?.reject(new Error("locator timeout"));
    waiters.get(SAVE_FAILED_TOAST_TITLE)?.reject(new Error("locator timeout"));

    await expect(pending).rejects.toThrow(/Ratings saved/);
    await expect(pending).rejects.toThrow(/1234/);
  });

  it("surfaces the underlying Playwright error rather than calling everything a timeout", async () => {
    const { page, waiters, settled } = createFakePage();

    const pending = expectSuccessToast(page, "Saved");
    await settled();
    // A locator matching two nodes rejects like this, and it is NOT a timeout.
    // Reporting it as one would hide the real cause behind a wrong explanation.
    waiters
      .get("Saved")
      ?.reject(new Error('strict mode violation: getByText("Saved") resolved to 2 elements'));

    await expect(pending).rejects.toThrow(/strict mode violation/);
  });

  it("scopes both locators to the toast, so page copy cannot satisfy it", async () => {
    const { page, waiters, scopes, queried, settled } = createFakePage();

    const pending = expectSuccessToast(page, "Saved");
    await settled();
    waiters.get("Saved")?.resolve();
    await pending;

    expect(new Set(scopes)).toEqual(new Set(["app-toast"]));
    expect(queried).toEqual(expect.arrayContaining(["Saved", SAVE_FAILED_TOAST_TITLE]));
  });

  it("passes the caller's timeout down to both waits", async () => {
    const { page, waiters, settled } = createFakePage();

    const pending = expectSuccessToast(page, "Saved", { timeout: 4321 });
    await settled();
    waiters.get("Saved")?.resolve();
    await pending;

    expect(waiters.get("Saved")?.timeout).toBe(4321);
    expect(waiters.get(SAVE_FAILED_TOAST_TITLE)?.timeout).toBe(4321);
  });
});

describe("SAVE_FAILED_TOAST_TITLE", () => {
  it("is the locale's save-failed title, not a retyped copy", () => {
    expect(SAVE_FAILED_TOAST_TITLE).toBe(enErrors.saveFailed.title);
    expect(SAVE_FAILED_TOAST_TITLE.length).toBeGreaterThan(0);
  });

  // The guard is only worth having while the app's global error toast really is
  // built from this key. If query-client ever switches keys, the helper would go
  // on watching for copy nothing renders - a guard that silently never fires.
  it("is the key query-client's global error toast is built from", () => {
    const source = readFileSync(join(__dirname, "..", "src", "lib", "query-client.ts"), "utf8");

    expect(source).toContain("errors:saveFailed.title");
  });
});
