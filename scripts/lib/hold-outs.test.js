const {
  HOLD_OUT_CONSTANTS,
  NOT_LIFTED,
  parseHoldOutTable,
  heldOutRows,
  readHoldOutTable,
  versionAtOrBelow,
  appStoreVersionFromJson,
  playVersionFromHtml,
} = require("./hold-outs");

/**
 * ☠️ **The parser's own tests, and the reason they exist rather than just the
 * gate in `test/hold-out-register.test.ts`.**
 *
 * Both constants are empty (#2698, #2713), so the gate currently compares an
 * empty set against an empty set and would pass **exactly as well if this
 * parser returned nothing at all** - at which point the next hold-out could be
 * added with no row, no alarm and nothing red. That is the failure
 * `registry.test.ts:216-232` records in its own words: six stems "were matched
 * by no probe at all, so a typo in any one would have passed forever while the
 * docblock cited the very convention it was breaking."
 *
 * So the parser is proved against fixtures that DO contain hold-outs. These
 * tests are the only thing standing between "nothing is held out" and "nothing
 * is being read".
 */

const FIXTURE = [
  "## Post-release: lift held-out changes",
  "",
  "Some prose that mentions `HELD_OUT_REMINDER_TARGETS` outside any table.",
  "",
  "| Constant | Entry | Shipped in | Lifts when | Lifted |",
  "| --- | --- | --- | --- | --- |",
  "| `HELD_OUT_REMINDER_TARGETS` | `dbt` | v0.18.0, 2026-09-09 | `/modules/dbt` is live on both | 2026-09-22, [#2698](x) |",
  "| `HELD_OUT_REMINDER_TARGETS` | `sleepStory` | v0.24.0, 2026-10-01 | `/tools/sleep-story` is live on both | — |",
  "| `WITHHELD_STEP_TOOL_IDS` | `wiseMind`, `script` | v0.18.0, 2026-09-09 | the DBT build is past review | — |",
  "",
  "## Some other section",
  "",
  "| Constant | Entry | Shipped in | Lifts when | Lifted |",
  "| --- | --- | --- | --- | --- |",
  "| `NOT_A_HOLD_OUT` | `nope` | v9.9.9 | never | — |",
].join("\n");

describe("parseHoldOutTable", () => {
  const rows = parseHoldOutTable(FIXTURE);

  it("reads every row of the register and no row from another section", () => {
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.constant)).toEqual([
      "HELD_OUT_REMINDER_TARGETS",
      "HELD_OUT_REMINDER_TARGETS",
      "WITHHELD_STEP_TOOL_IDS",
    ]);
    // ☠️ The table under the NEXT h2 must not leak in - the section is sliced at
    // the next heading precisely so a later table cannot be mistaken for this one.
    expect(rows.map((r) => r.constant)).not.toContain("NOT_A_HOLD_OUT");
  });

  it("collects several entries from one cell, so a set that lifts together is one row", () => {
    expect(rows[2].entries).toEqual(["wiseMind", "script"]);
  });

  it("reads the shipped version the alarm compares against the stores", () => {
    expect(rows.map((r) => r.shippedVersion)).toEqual(["0.18.0", "0.24.0", "0.18.0"]);
  });

  it("separates what is still held out from what has been lifted", () => {
    expect(rows.map((r) => r.heldOut)).toEqual([false, true, true]);
    expect(heldOutRows(rows).flatMap((r) => r.entries)).toEqual([
      "sleepStory",
      "wiseMind",
      "script",
    ]);
  });

  it("throws rather than returning nothing when the section is renamed away", () => {
    // ⚠️ The dangerous failure is silence: a renamed heading that yields zero
    // rows would make both guards pass forever. It must be loud.
    expect(() => parseHoldOutTable("# no register here")).toThrow(/hold-out register/i);
  });

  it("takes a row as held out only on the exact not-lifted marker", () => {
    expect(NOT_LIFTED).toBe("—");
    const withDate = FIXTURE.replace(
      "| — |\n| `WITHHELD_STEP_TOOL_IDS`",
      "| 2026-10-02 |\n| `WITHHELD_STEP_TOOL_IDS`",
    );
    expect(heldOutRows(parseHoldOutTable(withDate)).flatMap((r) => r.entries)).toEqual([
      "wiseMind",
      "script",
    ]);
  });
});

describe("versionAtOrBelow", () => {
  it("is true when the shipped build is at or below the live store version", () => {
    expect(versionAtOrBelow("0.18.0", "0.23.0")).toBe(true);
    expect(versionAtOrBelow("0.21.0", "0.21.0")).toBe(true);
  });

  it("is false when the store has not caught up yet", () => {
    expect(versionAtOrBelow("0.24.0", "0.23.0")).toBe(false);
    expect(versionAtOrBelow("0.21.0", "0.9.0")).toBe(false);
  });

  it("compares numerically, not as strings", () => {
    // "0.9.0" > "0.23.0" as strings, which is the bug this pins.
    expect(versionAtOrBelow("0.9.0", "0.23.0")).toBe(true);
  });
});

describe("reading the live store versions", () => {
  it("takes the App Store version out of Apple's lookup payload", () => {
    expect(appStoreVersionFromJson({ resultCount: 1, results: [{ version: "0.21.0" }] })).toBe(
      "0.21.0",
    );
  });

  it("throws when the App Store lookup is empty or malformed, rather than reading as 'not live yet'", () => {
    expect(() => appStoreVersionFromJson({ resultCount: 0, results: [] })).toThrow(/no version/i);
    expect(() => appStoreVersionFromJson({ results: [{ version: "latest" }] })).toThrow(
      /no version/i,
    );
  });

  it("takes Play's version from its data key, not from the page's inline SVG", () => {
    // ☠️ THE REGRESSION THIS FILE EXISTS FOR. The first implementation took "the
    // highest version-shaped string on the page" and read 24.04.47 off a
    // <path d="..."> coordinate list. It happened to give the right verdict,
    // which is the worst kind of green. The fixture keeps that trap in place.
    const html =
      '<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 1.43.35-2.09V7.07 24.04.47"/>' +
      '...,"141":[[["0.23.0"]],[[[36]],[[[24,"7.0"]]]]],"146"...';
    expect(playVersionFromHtml(html)).toBe("0.23.0");
  });

  it("throws when Play's page shape changes, so a blind alarm looks broken rather than quiet", () => {
    expect(() => playVersionFromHtml("<html>no data blob here</html>")).toThrow(/page shape/i);
  });
});

describe("the register as committed", () => {
  it("parses, and names only constants this module knows", () => {
    const rows = readHoldOutTable();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Object.keys(HOLD_OUT_CONSTANTS)).toContain(row.constant);
    }
  });

  it("holds nothing out today", () => {
    // ✅ Seeded green rather than shipping with grandfathered exceptions - the
    // shape `docs/positioning.md:419` requires, and the reason #2717 waited for
    // both lifts to land first.
    expect(heldOutRows(readHoldOutTable())).toEqual([]);
  });
});
