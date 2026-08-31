/**
 * The comparison inside the weekly store-metadata drift job (#1611).
 *
 * ☠️ WHY THIS FILE EXISTS. The age-rating half of that workflow is a jq
 * one-liner; this half has real logic in it, because the locale key App Store
 * Connect uses for `apple.info` has never been read and the check therefore
 * searches every locale instead of indexing one. A weekly guard that is wrong is
 * worse than no guard - it reports "matches" forever - and the workflow only
 * runs on a schedule, so a mistake in it would surface, at the earliest, a week
 * after it shipped, on a Monday, in a job nobody is watching.
 *
 * So the logic lives in a script and is exercised here, in `verify`, on the PR
 * that changes it.
 */
import { findListingDrift } from "../scripts/check-store-listing-drift.mjs";

const COMMITTED = {
  subtitle: "Calm, guided self-help tools",
  promoText: "Free and open source.",
};

describe("the App Store listing drift comparison", () => {
  it("passes when one locale carries every committed value", () => {
    const result = findListingDrift(COMMITTED, {
      "en-US": { subtitle: "Calm, guided self-help tools", promoText: "Free and open source." },
    });

    expect(result).toEqual({ ok: true, drifted: [], locales: ["en-US"] });
  });

  /**
   * The whole reason the check is locale-agnostic. Whichever key Apple actually
   * uses - `en-US`, `en-GB`, something else - the committed English text is
   * found, so a guessed key cannot make the job red for a reason that has
   * nothing to do with drift (store/README.md names that as how a guard gets
   * muted).
   */
  it.each(["en-US", "en-GB", "en-AU"])(
    "finds the values under whichever locale key is used: %s",
    (locale) => {
      const result = findListingDrift(COMMITTED, {
        [locale]: { subtitle: COMMITTED.subtitle, promoText: COMMITTED.promoText },
      });

      expect(result.ok).toBe(true);
    },
  );

  it("ignores other locales that legitimately differ", () => {
    const result = findListingDrift(COMMITTED, {
      bg: { subtitle: "Спокойни инструменти", promoText: "Безплатно и с отворен код." },
      "en-US": { subtitle: COMMITTED.subtitle, promoText: COMMITTED.promoText },
    });

    expect(result.ok).toBe(true);
  });

  // The signal the whole job exists for: someone edited the listing in App Store
  // Connect and nothing in the repository knew.
  it("reports the field that drifted, and names both sides", () => {
    const result = findListingDrift(COMMITTED, {
      "en-US": { subtitle: "A calm CBT programme", promoText: COMMITTED.promoText },
    });

    expect(result.ok).toBe(false);
    expect(result.drifted).toEqual([
      'subtitle: committed "Calm, guided self-help tools", matched by no locale',
    ]);
  });

  it("does not let a partial match in one locale cover a miss in another field", () => {
    const result = findListingDrift(COMMITTED, {
      "en-US": { subtitle: COMMITTED.subtitle },
      "en-GB": { promoText: "something else entirely" },
    });

    expect(result.ok).toBe(false);
    expect(result.drifted).toHaveLength(1);
    expect(result.drifted[0]).toMatch(/^promoText:/);
  });

  /**
   * A shape change in EAS Metadata rather than listing drift, and reported
   * differently on purpose - the fix is in this repository, not in App Store
   * Connect. The advisory step above it draws the same distinction between a
   * missing key and a changed value.
   *
   * ⚠️ Without this branch the check would go vacuously green: no locales means
   * no fields to compare, `drifted` is empty, and the job reports a match
   * against nothing at all.
   */
  it.each([{}, undefined, null])(
    "fails loudly when there is no apple.info block (%p)",
    (locales) => {
      const result = findListingDrift(COMMITTED, locales as never);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("no-info-block");
    },
  );

  it("treats an absent field as a miss rather than as a match on undefined", () => {
    // `locales["en-US"].promoText` is undefined here. An `===` against a
    // committed undefined would pass; against a committed string it must not.
    const result = findListingDrift(COMMITTED, { "en-US": { subtitle: COMMITTED.subtitle } });

    expect(result.ok).toBe(false);
    expect(result.drifted[0]).toMatch(/^promoText:/);
  });
});
