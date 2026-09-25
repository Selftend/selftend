/**
 * The comparison inside the weekly policy-version drift alarm (#2737, ruled on
 * #2706).
 *
 * ☠️ WHY THIS FILE EXISTS — the same reason `store-listing-drift.test.ts` gives,
 * and it is not theoretical here either: that weekly guard was broken from birth
 * and never once completed a pull (#1798), on the job built after Selftend was
 * rated 18+ in 173 countries unnoticed. A scheduled job that is wrong reports
 * "nothing to do" forever, and a mistake surfaces at the earliest a week later,
 * in a run nobody is watching.
 *
 * ⚠️ Every case below is driven with **synthetic** versions — deliberately not
 * the live constant, which moves, and which would turn these assertions into
 * tautologies the next time policy text ships.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  QUERY,
  datePrefix,
  findUnshippedVersions,
  parsePsqlVersions,
  parseShippedVersion,
} from "../scripts/check-policy-version-drift.mjs";

describe("parseShippedVersion", () => {
  it("reads the constant out of the real source", () => {
    // Non-vacuous: proves the regex matches the file it will actually read, so a
    // rename goes red here rather than at 06:00 on a Monday.
    const source = readFileSync(
      resolve(__dirname, "../src/features/policies/policy-content.ts"),
      "utf8",
    );
    expect(parseShippedVersion(source)).toMatch(/^\d{4}-\d{2}-\d{2}-/);
  });

  it.each([
    ['export const policyVersion = "2026-09-18-x";', "2026-09-18-x"],
    ["export const policyVersion = '2026-09-18-x';", "2026-09-18-x"],
    ['export const policyVersion="2026-09-18-x";', "2026-09-18-x"],
  ])("reads %s", (source, want) => {
    expect(parseShippedVersion(source)).toBe(want);
  });

  it("☠️ throws when the constant is gone, rather than passing over nothing", () => {
    // Returning null here would make the alarm compare against nothing and stay
    // green forever.
    expect(() => parseShippedVersion("export const somethingElse = 1;")).toThrow(
      /Could not find `export const policyVersion`/,
    );
  });
});

describe("datePrefix", () => {
  it.each([
    ["2026-09-18-programme-retention", "2026-09-18"],
    ["2026-09-04-teen-floor", "2026-09-04"],
    ["legacy", null],
    ["", null],
  ])("reads %s", (version, want) => {
    expect(datePrefix(version)).toBe(want);
  });
});

describe("findUnshippedVersions", () => {
  const shipped = "2026-09-04-teen-floor";

  it("☠️ reports a version NEWER than what main ships - the case this exists for", () => {
    expect(findUnshippedVersions(["2026-09-18-programme-retention"], shipped)).toEqual([
      "2026-09-18-programme-retention",
    ]);
  });

  it("⚠️ says nothing about an OLDER version, which is an ordinary un-updated client", () => {
    // The most important negative. Most production rows will be older than main
    // at any moment; reddening on "different" would make this fire constantly
    // and get muted.
    expect(findUnshippedVersions(["2026-08-01-something"], shipped)).toEqual([]);
  });

  it("says nothing about the shipped version itself", () => {
    expect(findUnshippedVersions([shipped], shipped)).toEqual([]);
  });

  it("says nothing about a same-date variant", () => {
    // The migration treats a same date prefix as "not a downgrade"; this treats
    // it as "not ahead", for the same reason - the date is the whole ordering.
    expect(findUnshippedVersions(["2026-09-04-other-slug"], shipped)).toEqual([]);
  });

  it("⚠️ ignores an unrankable value rather than reddening on it", () => {
    // policy-version-monotonic.sql deliberately lets a legacy or hand-edited
    // value through so it heals on the next accept. This must agree with it.
    expect(findUnshippedVersions(["legacy", "handedited"], shipped)).toEqual([]);
  });

  it("picks only the ahead ones out of a mixed set", () => {
    expect(
      findUnshippedVersions(
        ["2026-08-01-old", shipped, "legacy", "2026-09-18-ahead", "2026-12-25-further"],
        shipped,
      ),
    ).toEqual(["2026-09-18-ahead", "2026-12-25-further"]);
  });

  it("☠️ throws when the shipped constant cannot be ranked", () => {
    // Loosening here would silently disable the alarm.
    expect(() => findUnshippedVersions(["2026-09-18-x"], "no-date-prefix")).toThrow(
      /has no YYYY-MM-DD prefix/,
    );
  });
});

describe("parsePsqlVersions", () => {
  it("reads one version per line from tuples-only output", () => {
    expect(parsePsqlVersions("2026-09-04-teen-floor\n2026-09-18-programme-retention\n")).toEqual([
      "2026-09-04-teen-floor",
      "2026-09-18-programme-retention",
    ]);
  });

  it("returns an empty list for an empty result", () => {
    expect(parsePsqlVersions("\n")).toEqual([]);
  });
});

describe("the query", () => {
  it("☠️ selects version strings and nothing else", () => {
    // This reads a CONSENT table. The select list is a privacy boundary, not a
    // preference: no user ids, no rows, no per-person counts. If this test is
    // failing because someone widened the query, that is the conversation.
    expect(QUERY).toContain("select distinct policy_version_accepted");
    expect(QUERY).not.toMatch(/user_id|count\(|\*/);
  });

  it("reads only user_preferences", () => {
    expect(QUERY).toContain("from public.user_preferences");
    expect(QUERY.match(/from /g)).toHaveLength(1);
  });
});
