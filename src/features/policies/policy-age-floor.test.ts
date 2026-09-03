import { FLOOR_BY_COUNTRY, type AgeFloor } from "@/src/features/auth/age-floor";
import { countryName } from "@/src/features/auth/countries";
import bgPolicies from "@/src/i18n/locales/bg/policies.json";
import enPolicies from "@/src/i18n/locales/en/policies.json";

/**
 * The published minimum-age section against the table the gate actually applies
 * (#1767, spec #227 §6).
 *
 * The privacy policy is the only place the per-country floor is published, and
 * it publishes it as prose - one line per floor, naming its countries. That
 * list is retyped from `FLOOR_BY_COUNTRY`, which is exactly the shape of drift
 * nobody notices: a country moved in the code and left behind in the policy
 * reads as a promise the product does not keep, and a country moved in the
 * policy and left behind in the code is a promise the product cannot keep.
 * Either way the person reading it is told the wrong age.
 *
 * ☠️ The naive version of this test greps the section for each country name and
 * checks a number is nearby. It cannot catch the case that matters - a country
 * listed under TWO floors, or under the wrong one - because "nearby" is not a
 * thing prose has. So each floor's line is identified by the set of names it
 * carries, and every other floor's line must carry none of them.
 *
 * Locale-agnostic on purpose except for the two catch-all probes at the bottom:
 * the names come from `countries.ts`, which is where the age gate's own selector
 * reads them, so the policy and the selector cannot disagree about what a
 * country is called either.
 */

const FLOORS = [13, 14, 15, 16] as const;

const locales = [
  ["en", enPolicies],
  ["bg", bgPolicies],
] as const;

function namesForFloor(floor: AgeFloor, language: string): string[] {
  return Object.entries(FLOOR_BY_COUNTRY)
    .filter(([, value]) => value === floor)
    .map(([code]) => countryName(code, language));
}

/** The privacy section that publishes the floor, found by number rather than title. */
function ageSection(policies: (typeof locales)[number][1]): string[] {
  const section = policies.privacy.sections.find((entry) => entry.title.startsWith("11."));
  if (!section) {
    throw new Error("privacy policy has no section 11 - the minimum-age section moved");
  }
  return section.body;
}

describe.each(locales)("published age floor (%s)", (language, policies) => {
  const body = ageSection(policies);

  it.each(FLOORS)("names every country whose floor is %i, on one line", (floor) => {
    const names = namesForFloor(floor, language);
    expect(names.length).toBeGreaterThan(0);

    const carrying = body.filter((line) => names.every((name) => line.includes(name)));
    expect(carrying).toHaveLength(1);
    expect(carrying[0]).toContain(String(floor));
  });

  it.each(FLOORS)("keeps floor-%i countries off every other floor's line", (floor) => {
    const names = namesForFloor(floor, language);
    const own = body.find((line) => names.every((name) => line.includes(name)));
    // Without this the assertion below passes on a section that names no country
    // at all - `own` is undefined, every line is "other", and none of them stray.
    expect(own).toBeDefined();
    const strays = body
      .filter((line) => line !== own)
      .flatMap((line) => names.filter((name) => line.includes(name)));

    expect(strays).toEqual([]);
  });

  it("never publishes a floor below the absolute minimum", () => {
    expect(body.join(" ")).not.toMatch(/\b(?:9|10|11|12)\s*(?:years|години)/i);
  });
});

describe("published age floor - the catch-all", () => {
  // The one half a name-set comparison cannot see: countries with no entry in
  // the table take 13, and a policy that lists only the named countries would
  // leave every other reader with no answer at all.
  it("says in English that unnamed countries take the lowest floor", () => {
    expect(ageSection(enPolicies).join(" ")).toContain("every other country");
  });

  it("says in Bulgarian that unnamed countries take the lowest floor", () => {
    expect(ageSection(bgPolicies).join(" ")).toContain("всяка друга държава");
  });
});
