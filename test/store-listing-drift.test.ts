/**
 * The comparison inside the weekly store-metadata drift job (#1611).
 *
 * ☠️ WHY THIS FILE EXISTS. The age-rating half of that workflow is a jq
 * one-liner; this half has real logic in it — a per-locale index and two
 * distinct not-drift branches. A weekly guard that is wrong is worse than no
 * guard, because it reports "matches" forever — and the workflow only runs on a
 * schedule, so a mistake in it would surface, at the earliest, a week after it
 * shipped, on a Monday, in a job nobody is watching. That is not a theoretical
 * risk here: this guard was broken from birth and never once completed a pull
 * (#1798).
 *
 * So the logic lives in a script and is exercised here, in `verify`, on the PR
 * that changes it.
 */
import { EXPECTED_LOCALE, findListingDrift } from "../scripts/check-store-listing-drift.mjs";

/**
 * ☠️ **SYNTHETIC ON PURPOSE, AND IT MUST STAY THAT WAY** (#1760).
 *
 * This used to copy the real committed listing — `subtitle` read "Calm, guided
 * self-help tools", the phrase `docs/positioning.md` calls unsafe rather than
 * merely off-frame. Nothing here ever compared it to `store/apple-info.json`,
 * so when that file was corrected (#2009/#2021) this fixture kept the retired
 * phrase, and **the repository went on encoding it inside a file nobody thinks
 * of as copy**.
 *
 * ⚠️ It could not go red either way: the fixture feeds `COMMITTED` to the
 * function and asserts against itself, so it passes whatever the string says.
 * And the copy gate cannot reach it — `positioning-copy.test.ts` does not scan
 * `test/`, deliberately, because tests here legitimately quote banned phrases
 * in order to assert on them.
 *
 * Every assertion below is relational — does `findListingDrift` report drift —
 * so the values are arbitrary. Keeping them obviously fake is what stops this
 * file from quietly becoming a copy surface for a second time. **Do not paste
 * the live listing back in.**
 */
const COMMITTED = {
  subtitle: "A committed subtitle",
  promoText: "A committed promo text.",
};

const matching = () => ({ subtitle: COMMITTED.subtitle, promoText: COMMITTED.promoText });

describe("the App Store listing drift comparison", () => {
  /**
   * Pinned, because the whole tightening rests on it. `en-US` is the locale a
   * live pull reported (#1802, run 33795074521) — not a guess, which is what
   * store/README.md forbids and what kept this check locale-agnostic until now.
   */
  it("indexes the locale that was read from the live record", () => {
    expect(EXPECTED_LOCALE).toBe("en-US");
  });

  it("passes when the expected locale carries every committed value", () => {
    const result = findListingDrift(COMMITTED, { "en-US": matching() });

    expect(result).toEqual({ ok: true, drifted: [], locales: ["en-US"] });
  });

  it("ignores other locales that legitimately differ", () => {
    const result = findListingDrift(COMMITTED, {
      bg: { subtitle: "Спокойни инструменти", promoText: "Безплатно и с отворен код." },
      "en-US": matching(),
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
    // Built from COMMITTED rather than spelled out: a literal here was the
    // second place the retired subtitle survived, and the one that went red
    // when the fixture above was made synthetic.
    expect(result.drifted).toEqual([
      `subtitle: committed "${COMMITTED.subtitle}", en-US has "A calm CBT programme"`,
    ]);
  });

  /**
   * ☠️ THE REASON #1802 TIGHTENED THIS. The old check asked whether SOME locale
   * carried each value, so a listing that MOVED to another locale passed — and
   * would have gone on passing if a second locale were added later still
   * carrying the old string. Indexing `en-US` is what turns that into drift.
   */
  it("does not accept a committed value that has moved to a different locale", () => {
    const result = findListingDrift(COMMITTED, {
      "en-US": { subtitle: "Something else", promoText: "Something else again" },
      "en-GB": matching(),
    });

    expect(result.ok).toBe(false);
    expect(result.drifted).toHaveLength(2);
  });

  it("does not let a match in another locale cover a miss in the expected one", () => {
    const result = findListingDrift(COMMITTED, {
      "en-US": { subtitle: COMMITTED.subtitle },
      "en-GB": { promoText: COMMITTED.promoText },
    });

    expect(result.ok).toBe(false);
    expect(result.drifted).toHaveLength(1);
    expect(result.drifted[0]).toMatch(/^promoText:/);
  });

  /**
   * A shape change in EAS Metadata rather than listing drift, and reported
   * differently on purpose — the fix is in this repository, not in App Store
   * Connect. The advisory step draws the same distinction between a missing key
   * and a changed value.
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

  /**
   * The branch the tightening adds, and the risk it takes on: indexing one
   * locale means a renamed or moved locale key now fails. It is reported as its
   * own reason rather than as drift, because naming App Store Connect as the
   * wrong side there would send the reader to edit the listing back when the
   * repository is what needs updating — and a guard that names the wrong side
   * is how a guard gets muted (store/README.md).
   *
   * ⚠️ NOT reported as drift, and not silently passed: both would be wrong in
   * opposite directions.
   */
  it("fails as a repository-side problem when the expected locale is absent", () => {
    const result = findListingDrift(COMMITTED, { "en-GB": matching(), bg: matching() });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("expected-locale-absent");
    // The locales it DID find, so the reader can update the constant from them.
    expect(result.locales).toEqual(["en-GB", "bg"]);
    // Not dressed up as drift: there is nothing to compare, so nothing drifted.
    expect(result.drifted).toEqual([]);
  });

  it("treats an absent field as a miss rather than as a match on undefined", () => {
    // `locales["en-US"].promoText` is undefined here. An `===` against a
    // committed undefined would pass; against a committed string it must not.
    const result = findListingDrift(COMMITTED, { "en-US": { subtitle: COMMITTED.subtitle } });

    expect(result.ok).toBe(false);
    expect(result.drifted[0]).toMatch(/^promoText:/);
  });

  /** The override exists so this branch is drivable without faking the constant. */
  it("honours an explicit expected locale", () => {
    const result = findListingDrift(COMMITTED, { bg: matching() }, "bg");

    expect(result.ok).toBe(true);
  });
});
