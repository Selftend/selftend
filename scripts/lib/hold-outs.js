// The hold-out register, parsed off docs/releasing.md (#2717, decided on #2701).
//
// A HOLD-OUT is a change that is built, shipped in the binary, and withheld
// from EVERY user until a condition outside the repository comes true - today,
// "the native build that understands it is live on both stores". Two constants
// carry them, and both were empty as of 2026-09-22:
//
//   HELD_OUT_REMINDER_TARGETS  src/features/notifications/reminder-rollout.ts
//   WITHHELD_STEP_TOOL_IDS     src/features/routines/step-tool-rollout.ts
//
// ☠️ WHY THIS FILE EXISTS. Across 32 releases the repo lifted a hold-out exactly
// zero times, and on 2026-09-22 all three then-live entries turned out to have
// met their own conditions days earlier - `dbt` and the six DBT step tool ids by
// 13 days, `general` by 5. docs/releasing.md had written its own epitaph before
// the fact: "Nothing lifts it automatically, and nothing goes red while it stays
// held out - which is exactly how a hold-out outlives its reason."
//
// Two different defects, which is why there are two readers of this one table:
//
//   D1 INVISIBLE.  WITHHELD_STEP_TOOL_IDS appeared in NO document at all, so
//                  nobody could have found it to check it. A local fact about
//                  the repo -> test/hold-out-register.test.ts, in `verify`.
//   D2 UNCHECKED.  Every condition was met and nothing looked. A fact about two
//                  store listings, which no merge gate can know -> the weekly
//                  alarm, scripts/check-hold-out-conditions.js.
//
// The split is not invented here; it is store-metadata-drift.yml's own header:
// invariants about the repo gate the merge, remote reads raise a weekly alarm,
// "because a red run here means 'the two copies disagree', which is a question,
// not a verdict."
//
// ⛔ NOT A SCHEDULE THAT CONTACTS ANYONE. ADR-0004 refuses contact triggered by
// a person's non-use, and #2621 §5 names the trap precisely: "a queue of written
// copy, each entry waiting on a trigger, with a mechanism to fire them." This
// holds no copy, addresses nobody and arrives nowhere. It turns a check red.
//
// ONE SOURCE, TWO READERS. The table in docs/releasing.md is the human artifact;
// nothing here is a second registry, because a third copy is how the module
// "live list" prose went stale while the code said something else.
//
// CommonJS like scripts/lib/index-list.js, so `node scripts/...` needs no loader
// and the jest gate can `require` the same parser the workflow runs.

const fs = require("node:fs");
const path = require("node:path");

/**
 * The constants this register covers, by the name they carry in the source, and
 * the file that declares each.
 *
 * ☠️ Hand-written, and the merge gate pins the table to exactly these names, so
 * a renamed or third constant fails loudly here rather than quietly escaping
 * the register - which is precisely how `WITHHELD_STEP_TOOL_IDS` came to be
 * documented nowhere for 13 days.
 */
const HOLD_OUT_CONSTANTS = Object.freeze({
  HELD_OUT_REMINDER_TARGETS: "src/features/notifications/reminder-rollout.ts",
  WITHHELD_STEP_TOOL_IDS: "src/features/routines/step-tool-rollout.ts",
});

/** The heading the table lives under, matched on its stable opening words. */
const SECTION_HEADING = /^##\s+Post-release:\s+lift held-out changes/m;

/** A row is still held out when its Lifted cell is this and nothing else. */
const NOT_LIFTED = "—";

/**
 * Pull the register's rows out of `markdown`.
 *
 * Columns, in order: Constant | Entry | Shipped in | Lifts when | Lifted.
 * `entries` collects every backticked token in the Entry cell, so one row can
 * carry a set (the six DBT step tool ids ship and lift as one unit) without the
 * gate losing per-entry precision.
 *
 * `shippedVersion` is the leading `vX.Y.Z` of the Shipped in cell - what the
 * alarm compares against the live store versions.
 *
 * @returns {{constant: string, entries: string[], shippedVersion: string|null,
 *            condition: string, lifted: string, heldOut: boolean}[]}
 */
function parseHoldOutTable(markdown) {
  const heading = SECTION_HEADING.exec(markdown);
  if (!heading) {
    throw new Error(
      "docs/releasing.md has no '## Post-release: lift held-out changes' section - " +
        "the hold-out register has been renamed or removed, and both guards read it.",
    );
  }

  // From the heading to the next h2, so a table further down the file cannot be
  // mistaken for this one.
  const after = markdown.slice(heading.index + heading[0].length);
  const nextHeading = /^##\s/m.exec(after);
  const section = nextHeading ? after.slice(0, nextHeading.index) : after;

  const rows = [];
  for (const line of section.split("\n")) {
    if (!line.trim().startsWith("|")) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 5) continue;
    if (/^-+$/.test(cells[0].replace(/\s/g, ""))) continue; // the --- separator
    if (cells[0] === "Constant") continue; // the header

    const constant = (/`([A-Z_]+)`/.exec(cells[0]) || [])[1];
    if (!constant) continue;

    const entries = [...cells[1].matchAll(/`([A-Za-z_][A-Za-z0-9_]*)`/g)].map((m) => m[1]);
    const shippedVersion = (/\bv(\d+\.\d+\.\d+)\b/.exec(cells[2]) || [])[1] || null;

    rows.push({
      constant,
      entries,
      shippedVersion,
      condition: cells[3],
      lifted: cells[4],
      heldOut: cells[4] === NOT_LIFTED,
    });
  }

  return rows;
}

/** The rows still waiting: what the alarm checks and the gate must cover. */
function heldOutRows(rows) {
  return rows.filter((row) => row.heldOut);
}

/** Read the register straight off disk. `root` defaults to the repo root. */
function readHoldOutTable(root = path.join(__dirname, "..", "..")) {
  return parseHoldOutTable(fs.readFileSync(path.join(root, "docs", "releasing.md"), "utf8"));
}

/** `0.21.0` <= `0.23.0`. Returns true when `a` is at or below `b`. */
function versionAtOrBelow(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i];
  }
  return true;
}

/**
 * The App Store's current version, out of Apple's public lookup JSON.
 *
 * Throws rather than returning null: for this alarm, "I could not read the
 * store" and "the store has not caught up" must never be the same outcome.
 */
function appStoreVersionFromJson(body) {
  const version = body && body.results && body.results[0] && body.results[0].version;
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error("App Store lookup returned no version - is the listing still published?");
  }
  return version;
}

/**
 * Play's live version, out of the listing HTML.
 *
 * ☠️ **Not "the highest version-shaped string on the page".** That was the first
 * attempt and it read `24.04.47` off an inline SVG `<path d="...">` - the
 * listing is full of coordinate pairs that look exactly like versions. It gave
 * the right answer for the wrong reason, which is the worst kind of green.
 *
 * Google publishes no unauthenticated version API, so this anchors on the key
 * its own data blob uses for the version field (`"141":[[["0.23.0"]]`), which
 * carries the app's version and nothing else. ⚠️ That key is Google's internal
 * numbering and can change without notice - which is why this THROWS when it
 * does not match, so a page-shape change surfaces as a broken alarm rather than
 * as "no hold-out is ready".
 */
function playVersionFromHtml(html) {
  const match = /"141":\s*\[\[\["(\d+\.\d+\.\d+)"\]\]/.exec(html);
  if (!match) {
    throw new Error(
      "Play listing carried no version at its usual key - the page shape has changed, " +
        "so this alarm is blind until scripts/lib/hold-outs.js is taught the new one.",
    );
  }
  return match[1];
}

module.exports = {
  HOLD_OUT_CONSTANTS,
  NOT_LIFTED,
  parseHoldOutTable,
  heldOutRows,
  readHoldOutTable,
  versionAtOrBelow,
  appStoreVersionFromJson,
  playVersionFromHtml,
};
