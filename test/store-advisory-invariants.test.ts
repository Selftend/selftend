// test/store-advisory-invariants.test.ts
//
// The merge gate on Selftend's committed age-rating declaration (#1021).
//
// .github/workflows/store-metadata-drift.yml guards the OTHER direction - it
// asks weekly whether App Store Connect still agrees with this file. It cannot
// be a merge gate, because it reads a remote system a human may legitimately
// have changed. This suite is the half that can: it runs in `verify` on every
// PR and asserts the properties #1010 decided, so a bad value cannot be
// committed here and then dutifully pushed to Apple by someone trusting it.
//
// These are POLICY assertions, not a second copy of the data. Asserting
// `medicalOrTreatmentInformation === "INFREQUENT_OR_MILD"` would be a
// restatement - it would fail the moment the value legitimately changed, and it
// would teach nothing. What #1010 actually settled is narrower and outlives any
// particular value:
//
//   1. NO MANUAL OVERRIDE, EVER. The questionnaire's own worst case is 16+; the
//      18+ came solely from `ageRatingOverride` / `ageRatingOverrideV2`. An
//      override is the mechanism by which the rating stops being derivable from
//      the answers, which is exactly how it went unnoticed.
//   2. MEDICAL IS NEVER `FREQUENT_OR_INTENSE`. That value triggers a regulated
//      medical-device declaration and lifts the rating to 16+, and nothing in a
//      wellness self-help product supports it - see the product boundary copy
//      shipped in six places.
//   3. EVERY VALUE IS ONE THE SCHEMA ALLOWS. A typo would never match a live
//      value, so the drift check would fail forever with no real drift; this
//      catches it at the PR instead.
import * as fs from "node:fs";
import * as path from "node:path";

const advisory = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "..", "store", "apple-advisory.json"), "utf8"),
) as Record<string, unknown>;

/** https://docs.expo.dev/eas/metadata/schema/ */
const RATING_VALUES = ["NONE", "INFREQUENT_OR_MILD", "FREQUENT_OR_INTENSE"];
const OVERRIDE_FIELDS = ["ageRatingOverride", "ageRatingOverrideV2", "koreaAgeRatingOverride"];

describe("Selftend's committed age-rating declaration", () => {
  // #1010: the questionnaire cannot produce 18+ on its own. Every override
  // present must read NONE - and an override that is simply absent is fine,
  // because the file is a verified subset (store/README.md).
  it.each(OVERRIDE_FIELDS)("declares no manual %s", (field) => {
    if (!(field in advisory)) return;

    expect(advisory[field]).toBe("NONE");
  });

  it("keeps at least one override field committed, so the rule has something to bite on", () => {
    expect(OVERRIDE_FIELDS.some((field) => field in advisory)).toBe(true);
  });

  // #1010: `Frequent` triggers the regulated-medical-device declaration and
  // pushes the rating to 16+. `Infrequent` is the honest answer for a product
  // whose CBT material describes conditions without ever assessing the user.
  it("never declares medical or treatment information as FREQUENT_OR_INTENSE", () => {
    expect(advisory.medicalOrTreatmentInformation).not.toBe("FREQUENT_OR_INTENSE");
  });

  it("still answers the medical question rather than leaving it out", () => {
    expect(RATING_VALUES).toContain(advisory.medicalOrTreatmentInformation);
  });

  // A typo here is worse than a wrong value: it can never match anything live,
  // so the weekly drift check fails forever and gets ignored.
  it("uses only values the EAS Metadata schema allows", () => {
    const offenders = Object.entries(advisory)
      .filter(([key, value]) => {
        if (typeof value !== "string") return false;
        if (key.startsWith("developer") || key.endsWith("Url")) return false;
        if (OVERRIDE_FIELDS.includes(key)) return value !== "NONE" && !value.endsWith("_PLUS");
        return !RATING_VALUES.includes(value);
      })
      .map(([key, value]) => `${key}: ${String(value)}`);

    expect(offenders).toEqual([]);
  });

  it("points the age-suitability URL at a real Selftend page over https", () => {
    if (!("developerAgeRatingInfoUrl" in advisory)) return;

    expect(advisory.developerAgeRatingInfoUrl).toMatch(/^https:\/\/selftend\.org\//);
  });
});
