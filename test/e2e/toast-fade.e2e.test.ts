import { expect, test } from "./fixtures";

import {
  deleteAllGratitudeEntriesForUser,
  dismissPostSignInModals,
  expectSuccessToast,
} from "./helpers";

/**
 * The toast's web entrance actually paints (#1337).
 *
 * Jest can prove the CLASS is on the card, and does. It cannot prove the class
 * means anything: `animate-in fade-in-0 duration-200` is only real if
 * tailwindcss-animate compiled it into the shipped stylesheet, and a class that
 * compiles to nothing is indistinguishable from a class that works when all you
 * can read is the className string. That is not hypothetical here - this repo
 * has shipped Tailwind-4-shaped classes that emitted nothing under its Tailwind
 * 3 config, silently.
 *
 * So this reads the COMPUTED style. `animation-name: enter` is what
 * tailwindcss-animate's `animate-in` resolves to, and `duration-200` has to
 * survive as `0.2s` - the pin that keeps web from drifting to animate-in's own
 * 150ms default while native runs 200ms.
 */
test.describe("the toast fades in on web", () => {
  // The whole suite runs `reducedMotion: "reduce"` (playwright.config.ts), which
  // is exactly the setting that makes the host OMIT this class. Opting out here
  // is the point of the spec, not an incidental convenience.
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test.beforeEach(async ({ user }) => {
    await deleteAllGratitudeEntriesForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllGratitudeEntriesForUser(user.id);
  });

  test("alice sees a success toast carrying a real 200ms fade", async ({ page }) => {
    await page.goto("/tools/gratitude-log/new");
    // A prior spec's trailing preferences write can leave this worker user with a
    // stale policy_version_accepted at boot; the consent gate then hijacks the
    // deep link to "/". Clear any gates (no-op when absent), then deep-link again.
    await dismissPostSignInModals(page);
    await page.goto("/tools/gratitude-log/new");

    await page.getByRole("textbox", { name: "What made you laugh?" }).fill("Morning coffee");
    await page.getByRole("button", { name: "Save entry", exact: true }).click();

    // Names its own failure if the save is what broke, rather than timing out
    // anonymously on a toast that was never coming (#1334).
    await expectSuccessToast(page, "Saved");

    // A success clears itself after 2500ms, so everything below has to happen
    // inside that window - one evaluate round-trip, comfortably. The class is
    // applied for the toast's whole life, not just while the 200ms is running,
    // so this is not racing the animation itself.
    const toast = await page.getByTestId("app-toast").evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animationName: style.animationName,
        animationDuration: style.animationDuration,
        ariaLive: element.getAttribute("aria-live"),
        // The X must be a real, reachable control - not a decoration.
        dismissLabels: [...element.querySelectorAll('[aria-label="Dismiss message"]')].length,
      };
    });

    expect(toast.animationName).toBe("enter");
    expect(toast.animationDuration).toBe("0.2s");
    // Jest asserts the PROP; only a browser can say the prop survived into the
    // DOM as an attribute a screen reader would actually act on. (The `assertive`
    // half needs a failing mutation to raise an error toast, so it stays jest-only.)
    expect(toast.ariaLive).toBe("polite");
    expect(toast.dismissLabels).toBe(1);
  });
});
