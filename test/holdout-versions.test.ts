/**
 * The comparison inside the weekly hold-out alarm (#2717).
 *
 * ☠️ WHY THIS FILE EXISTS — the same reason `store-listing-drift.test.ts` gives,
 * and it is not theoretical here either. That weekly guard was broken from birth
 * and never once completed a pull (#1798), on the job built after Selftend was
 * rated 18+ in 173 countries unnoticed. A scheduled job that is wrong reports
 * "nothing to do" forever, and a mistake in it surfaces at the earliest a week
 * later, on a Monday, in a run nobody is watching.
 *
 * So the alarm's logic lives in a script and is exercised here, in `verify`, on
 * the PR that changes it. Every case below is driven with synthetic versions —
 * ⚠️ deliberately NOT the live store numbers, which move, and which would make
 * these assertions rot into tautologies.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  compareVersions,
  extractPlayVersion,
  findMetConditions,
  parseStillHeld,
  releaseVersion,
} from "../scripts/check-holdout-versions.mjs";

const row = (over: Partial<Record<string, string>> = {}) => ({
  constant: "HELD_OUT_REMINDER_TARGETS",
  entry: "demo",
  withholds: "a thing",
  shippedIn: "v0.18.0, 2026-09-09",
  liftsWhen: "the build is live on both stores",
  liftIssue: "[#1](http://x/1)",
  lifted: "",
  ...over,
});

describe("compareVersions", () => {
  it.each([
    ["0.18.0", "0.21.0", -1],
    ["0.21.0", "0.18.0", 1],
    ["0.21.0", "0.21.0", 0],
    // Segment-wise, not lexicographic: "0.9.0" < "0.10.0" even though "9" > "1".
    ["0.9.0", "0.10.0", -1],
    // Missing segments count as zero.
    ["0.18", "0.18.0", 0],
    ["1.0.0", "0.99.99", 1],
  ])("orders %s against %s", (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b))).toBe(sign);
  });

  it("does not throw on a segment it cannot model", () => {
    // A store can publish something this does not parse; the alarm must not die.
    expect(() => compareVersions("1.0.0-beta", "1.0.0")).not.toThrow();
  });
});

describe("releaseVersion", () => {
  it.each([
    ["v0.18.0, 2026-09-09", "0.18.0"],
    ["0.21.0", "0.21.0"],
    ["v1.2", "1.2"],
  ])("reads %s", (cell, want) => {
    expect(releaseVersion(cell)).toBe(want);
  });

  it("returns null for a cell with no version rather than guessing one", () => {
    expect(releaseVersion("some prose")).toBeNull();
  });
});

describe("findMetConditions", () => {
  const stores = { appStore: "0.21.0", play: "0.23.0" };

  it("reports a hold-out whose release is live on both stores", () => {
    const met = findMetConditions([row()], stores);
    expect(met).toHaveLength(1);
    expect(met[0].reason).toContain("live on both");
  });

  it("says nothing while the release is ahead of both stores", () => {
    expect(findMetConditions([row({ shippedIn: "v0.24.0, 2026-10-01" })], stores)).toEqual([]);
  });

  it("☠️ says nothing while ONE store is still behind", () => {
    // The whole point of the two-store rule. A push minted for a url the phone's
    // build cannot route is a daily dead end the person opted into, so a lift
    // waits for BOTH - iOS needs a manual App Store Connect promotion that can
    // lag Play by days.
    expect(findMetConditions([row({ shippedIn: "v0.22.0, 2026-09-18" })], stores)).toEqual([]);
  });

  it("treats the shipping release itself as sufficient, not the one after it", () => {
    // `dbt` shipped in v0.18.0 and was routable in v0.18.0. A strict `<` would
    // have waited for v0.19.0 for no reason.
    const met = findMetConditions([row({ shippedIn: "v0.21.0, 2026-09-16" })], stores);
    expect(met).toHaveLength(1);
  });

  it("reports a malformed cell rather than skipping the row", () => {
    // Silently skipping is how a guard goes quiet about the one row that is wrong.
    const met = findMetConditions([row({ shippedIn: "soon" })], stores);
    expect(met).toHaveLength(1);
    expect(met[0].reason).toContain("names no version");
  });

  it("carries the condition and the lift issue into what it reports", () => {
    // A red run has to be actionable without opening the source.
    const [met] = findMetConditions([row()], stores);
    expect(met.liftsWhen).toBe("the build is live on both stores");
    expect(met.liftIssue).toBe("[#1](http://x/1)");
  });
});

describe("parseStillHeld", () => {
  const table = [
    "<!-- holdout-table:start -->",
    "",
    "| Constant | Entry | Withholds | Shipped in | Lifts when | Lift issue | Lifted |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    "| `A` | `held` | x | v1.0.0 | live | [#1](u) |  |",
    "| `A` | `done` | x | v1.0.0 | live | [#2](u) | 2026-01-01 |",
    "",
    "<!-- holdout-table:end -->",
  ].join("\n");

  it("returns only rows with an empty Lifted cell", () => {
    expect(parseStillHeld(table).map((r: { entry: string }) => r.entry)).toEqual(["held"]);
  });

  it("agrees with the real register, which currently holds nothing", () => {
    // Keeps this reader in step with test/holdout-table.ts, the TypeScript half.
    // The two parse the same table and must not diverge.
    const releasing = readFileSync(join(__dirname, "..", "docs", "releasing.md"), "utf8");
    expect(parseStillHeld(releasing)).toEqual([]);
  });

  it("throws when the markers are gone instead of reporting nothing held out", () => {
    // ☠️ Returning [] here would make the alarm green forever.
    expect(() => parseStillHeld("# no table")).toThrow(/markers are missing/);
  });
});

describe("extractPlayVersion", () => {
  it("reads the version out of the listing's embedded data", () => {
    expect(extractPlayVersion('junk [[["0.23.0"]] junk')).toBe("0.23.0");
  });

  it("returns null when the page shape changes, so the caller can fail loudly", () => {
    // ⚠️ The scrape WILL break one day. It must break red, not quiet.
    expect(extractPlayVersion("<html>nothing useful</html>")).toBeNull();
  });
});
