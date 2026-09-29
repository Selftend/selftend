// The legal gates' forward control clears the cookie banner (#2825).
//
// At the canonical 390x844 mobile viewport the web cookie banner - `fixed
// bottom-0` root chrome - overlaid the gates' only way forward, and the gates'
// content fit the viewport, so there was nothing to scroll: "Accept and
// continue" on the consent gate in en, and "Продължаване" on the AGE gate in
// bg, whose banner copy wraps taller. The first screen of first run read as a
// dead end to anyone who ignored the banner - the most common reaction to one.
//
// ☠️ The banner is left UNANSWERED on purpose, for the whole journey. Every
// other spec plants cookie consent or calls `dismissCookieBanner` first, which
// is exactly why none of them could see this. Both locales run, because the
// defect is locale-shaped: a fix sized for en's banner repeats the bug in bg.
//
// Plain @playwright/test, not ./fixtures: the worker fixture plants a pool
// user that has already answered both gates, and plants cookie consent.

import { expect, type Locator, type Page, test } from "@playwright/test";

// ☠️ From session-injection / guest-session, NOT ./fixtures (its beforeEach
// pool hook would attach to this file and kill every test at 0ms).
import { deleteGuest, mintGuestSession } from "./guest-session";
import { CANDIDATE_STORAGE_KEYS } from "./session-injection";
import { createServiceClient } from "../integration/helpers";

test.use({ viewport: { width: 390, height: 844 } });

/**
 * The control is reachable with the banner still up: after whatever scroll the
 * gate offers, its box ends above the banner's top edge and the point a tap
 * lands on belongs to it, not to the banner.
 */
async function expectClearOfBanner(page: Page, control: Locator) {
  const banner = page.getByTestId("cookie-consent-banner");
  await expect(banner).toBeVisible();

  // Scroll the gate the way a person would: a wheel over the card, to its end.
  // ☠️ Not `scrollIntoViewIfNeeded` - a control sitting UNDER the banner is
  // already inside the viewport, so that call is a no-op exactly when it
  // matters. Before #2825 this wheel moved nothing (the gate had no overflow);
  // where the card plus the banner no longer fit - bg's consent gate - it now
  // brings the control up above the banner.
  await page.mouse.move(195, 200);
  await page.mouse.wheel(0, 2_000);
  await expect
    .poll(async () => {
      const box = await control.boundingBox();
      return box ? box.y + box.height : Number.POSITIVE_INFINITY;
    })
    .toBeLessThanOrEqual((await banner.boundingBox())?.y ?? 0);

  const controlBox = await control.boundingBox();
  const bannerBox = await banner.boundingBox();
  expect(controlBox).not.toBeNull();
  expect(bannerBox).not.toBeNull();
  expect(controlBox!.y + controlBox!.height).toBeLessThanOrEqual(bannerBox!.y);

  const hitsControl = await control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit !== null && element.contains(hit);
  });
  expect(hitsControl).toBe(true);
}

for (const language of ["en", "bg"] as const) {
  test.describe(`legal gates under an unanswered cookie banner (${language}, 390x844)`, () => {
    let guestId: string | undefined;

    test.afterEach(async () => {
      await deleteGuest(guestId);
      guestId = undefined;
    });

    test("both gates' forward controls stay visible and pressable", async ({ page }) => {
      const minted = await mintGuestSession();
      guestId = minted.guestId;

      // Only the language: no age verdict and no policy version, so both gates
      // stand, exactly as for a guest the landing CTA just minted.
      const admin = createServiceClient();
      const { error } = await admin
        .from("user_preferences")
        .upsert({ user_id: minted.guestId, language }, { onConflict: "user_id" });
      if (error) throw new Error(`Prefs setup failed for ${minted.guestId}: ${error.message}`);

      // Session and language only - NO cookie-consent record, so the banner
      // renders and stays.
      await page.addInitScript(
        ({ keys, value, lang }) => {
          for (const key of keys) window.localStorage.setItem(key, value);
          window.localStorage.setItem("selftend:language", lang);
        },
        { keys: CANDIDATE_STORAGE_KEYS, value: minted.sessionValue, lang: language },
      );

      await page.goto("/");

      // Age gate - fully composed before measuring, so the card is at its
      // final height.
      const day = page.getByTestId("age-gate-day");
      await expect(day).toBeVisible({ timeout: 15_000 });
      await day.fill("1");
      await page.getByTestId("age-gate-month").fill("1");
      await page.getByTestId("age-gate-year").fill("1990");
      await page.getByTestId("age-gate-country").fill("GB");
      await page.getByTestId("age-gate-country-option-GB").click();

      const ageSubmit = page.getByTestId("age-gate-submit");
      await expect(ageSubmit).toBeEnabled({ timeout: 5_000 });
      await expectClearOfBanner(page, ageSubmit);
      // A real click, whose actionability check fails on an obscured target:
      // the banner is still unanswered when it lands.
      await ageSubmit.click({ timeout: 5_000 });
      await expect(day).toBeHidden({ timeout: 10_000 });

      // Consent gate - both acts given, then the submit.
      await page.getByTestId("consent-accept-checkbox").click();
      await page.getByTestId("consent-health-data-checkbox").click();
      const consentSubmit = page.getByTestId("consent-submit");
      await expect(consentSubmit).toBeEnabled({ timeout: 5_000 });
      await expectClearOfBanner(page, consentSubmit);
      await consentSubmit.click({ timeout: 5_000 });
      await expect(consentSubmit).toBeHidden({ timeout: 10_000 });

      // The banner was never answered: the fix made room for it, it did not
      // hide or defer it.
      await expect(page.getByTestId("cookie-consent-banner")).toBeVisible();
    });
  });
}
