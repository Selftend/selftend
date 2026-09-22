#!/usr/bin/env node
// The hold-out alarm (#2717, decided on #2701). Run weekly by
// .github/workflows/hold-out-conditions.yml.
//
// Reads the register in docs/releasing.md and the two LIVE store versions, and
// exits non-zero when a row still marked `—` shipped in a version that is at or
// below both. That is the sentence "this hold-out's own condition is now true",
// said by something that changes colour.
//
// ☠️ WHY. Across 32 releases this repo lifted a hold-out zero times. On
// 2026-09-22 all three then-live entries turned out to have met their
// conditions days earlier - `dbt` and the six DBT step tool ids by 13 days,
// `general` by 5 - because, in docs/releasing.md's own words, "nothing goes red
// while it stays held out."
//
// ⚠️ NOT A MERGE GATE, on purpose, and the reason is store-metadata-drift.yml's
// header rather than anything new: this reads a remote system that a human can
// legitimately change, so a red run means "the two copies disagree", which is a
// question, not a verdict. The invariant that IS a merge gate - every entry has
// a row at all - is test/hold-out-register.test.ts, in `verify`.
//
// ⛔ NOT A SCHEDULE THAT CONTACTS ANYONE. ADR-0004 refuses contact triggered by
// a person's non-use, and #2621 §5 names the trap: "a queue of written copy,
// each entry waiting on a trigger, with a mechanism to fire them." This holds
// no copy, addresses nobody and arrives nowhere.
//
// ✅ NO CREDENTIALS. Both reads are public: Apple's iTunes lookup endpoint and
// the Play listing page. Nothing for control-tower to inventory, and nothing
// that can expire and leave the alarm quietly dead.

const {
  readHoldOutTable,
  heldOutRows,
  versionAtOrBelow,
  appStoreVersionFromJson,
  playVersionFromHtml,
} = require("./lib/hold-outs");

const IOS_BUNDLE_ID = "org.vasilyoshev.selftend";
const ANDROID_PACKAGE = "org.vasilyoshev.selftend";

/** The App Store's current version, from Apple's public lookup endpoint. */
async function appStoreVersion() {
  const url = `https://itunes.apple.com/lookup?bundleId=${IOS_BUNDLE_ID}&country=US`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`App Store lookup failed: HTTP ${res.status}`);
  return appStoreVersionFromJson(await res.json());
}

/**
 * Play's live version, scraped off the listing.
 *
 * ⚠️ Google publishes no unauthenticated version API, so this is a scrape and it
 * is the fragile half. The parsing lives in `lib/hold-outs.js` so it is proved
 * against fixtures, and it throws rather than guessing: a failed read must look
 * like a broken alarm, never like "no hold-out is ready".
 */
async function playStoreVersion() {
  const url = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&hl=en_US&gl=US`;
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  if (!res.ok) throw new Error(`Play listing fetch failed: HTTP ${res.status}`);
  return playVersionFromHtml(await res.text());
}

async function main() {
  const held = heldOutRows(readHoldOutTable());

  if (held.length === 0) {
    console.log("No hold-outs in the register. Nothing to check.");
    console.log(
      "(Empty is the normal state - the register's rows are the history, and a new hold-out lands here with its row.)",
    );
    return 0;
  }

  const [ios, android] = await Promise.all([appStoreVersion(), playStoreVersion()]);
  console.log(`App Store: ${ios}`);
  console.log(`Google Play: ${android}`);
  console.log("");

  const ready = [];
  for (const row of held) {
    if (!row.shippedVersion) {
      throw new Error(
        `Register row for ${row.constant} (${row.entries.join(", ")}) has no vX.Y.Z in its "Shipped in" cell.`,
      );
    }
    const live =
      versionAtOrBelow(row.shippedVersion, ios) && versionAtOrBelow(row.shippedVersion, android);
    const mark = live ? "READY" : "waiting";
    console.log(
      `${mark}  ${row.constant}: ${row.entries.join(", ")} (shipped v${row.shippedVersion}) - ${row.condition}`,
    );
    if (live) ready.push(row);
  }

  if (ready.length === 0) {
    console.log("\nNo hold-out's build is live on both stores yet.");
    return 0;
  }

  console.log(
    `\n${ready.length} hold-out(s) have met their own condition. Their builds are live on BOTH stores.`,
  );
  console.log(
    "Lift them, or amend the register's condition to say what is really being waited for.",
  );
  console.log("See docs/releasing.md, 'Post-release: lift held-out changes'.");
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(`Hold-out check failed to run: ${error.message}`);
    // ☠️ Exit 2, not 1: "the alarm is broken" and "a hold-out is ready" are
    // different facts, and a scrape that rots must not read as good news.
    process.exit(2);
  });
