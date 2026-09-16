#!/usr/bin/env node
// Compares the App Store listing text committed at store/apple-info.json against
// the metadata pulled from App Store Connect by `eas metadata:pull` (#1611).
//
// Run by .github/workflows/store-metadata-drift.yml, which already does the same
// job for the age-rating declaration at store/apple-advisory.json. The listing
// text is governed by docs/positioning.md, so a silent edit in App Store Connect
// is a positioning change nobody reviewed - the same failure the 18+ episode was,
// one field over.
//
// Compared PER LOCALE against `en-US` (#1802). That key is READ, not guessed:
// the guard was broken from birth and had never completed a pull (#1798); once
// #1799 fixed it, a dispatched run reported `Locales present in the pulled
// metadata: en-US` (run 33795074521). store/README.md's rule is "read the live
// value, commit it, never guess", and this is now the read value.
//
// The check used to ask a deliberately weaker question - does SOME locale carry
// this exact value - because the key had never been read. That question passes
// if the value MOVES to a different locale, and would keep passing if a second
// locale were added later still carrying the old string.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * The one locale App Store Connect holds this listing under, read from a live
 * pull rather than guessed - see the header. Exported so the test names the same
 * value the script does, instead of restating it.
 */
export const EXPECTED_LOCALE = "en-US";

/**
 * @param {Record<string, unknown>} committed Fields read from the live record and committed.
 * @param {Record<string, Record<string, unknown>>} locales The pulled `apple.info` block.
 * @param {string} [expectedLocale] Overridable so a test can drive the branch without faking the constant.
 * @returns {{ ok: boolean, reason?: string, absent: string[], drifted: string[], fields: string[], locales: string[] }}
 */
export function findListingDrift(committed, locales, expectedLocale = EXPECTED_LOCALE) {
  const localeNames = Object.keys(locales ?? {});

  // A shape change in EAS Metadata, not listing drift. Reported separately
  // because the fix is in this repository, not in App Store Connect - the same
  // distinction the advisory step draws between a missing key and a changed one.
  if (localeNames.length === 0) {
    return {
      ok: false,
      reason: "no-info-block",
      absent: [],
      drifted: [],
      fields: [],
      locales: [],
    };
  }

  // Same class as the branch above, and separated from drift for the same
  // reason: if `en-US` is gone, either Apple renamed the locale or the listing
  // moved, and both are answered by reading the live record and updating this
  // repository - not by editing App Store Connect back. Reporting it as drift
  // would name the wrong side.
  if (!localeNames.includes(expectedLocale)) {
    return {
      ok: false,
      reason: "expected-locale-absent",
      absent: [],
      drifted: [],
      fields: [],
      locales: localeNames,
    };
  }

  const pulled = locales[expectedLocale] ?? {};

  // The third not-drift branch, and the last one this shape can have (#2540).
  //
  // A committed field the pulled locale does not carry AT ALL is not the live
  // listing drifting away from this repository - there is no live value to have
  // drifted. It means either the field was never entered in App Store Connect,
  // or `metadata:pull` does not carry it under this name. Both fixes are on
  // this side; "decide which side is wrong" sends the reader to edit the
  // listing back, which is the wrong side, and a guard that names the wrong
  // side is how a guard gets muted (store/README.md).
  //
  // ☠️ This is the distinction the ADVISORY half of the same workflow has drawn
  // since #1611 - "a committed key that does not exist in the pulled block
  // almost always means the field name is wrong" - which the listing half was
  // simply missing. It cost a weekly red on `promoText` that reads as drift and
  // is not (#2540).
  //
  // ⚠️ It does NOT relax anything: an absent field still fails. The one thing
  // that must never happen here is an absent field passing on
  // `undefined === undefined`, which is what the field-presence check below is
  // for - `Object.hasOwn`, never a truthiness or `!= null` test, so a committed
  // empty string is still compared rather than waved through.
  const absent = Object.keys(committed).filter((field) => !Object.hasOwn(pulled, field));

  const drifted = Object.entries(committed)
    .filter(([field, value]) => Object.hasOwn(pulled, field) && pulled[field] !== value)
    .map(
      ([field, value]) =>
        `${field}: committed ${JSON.stringify(value)}, ${expectedLocale} has ${JSON.stringify(pulled[field])}`,
    );

  return {
    ok: absent.length === 0 && drifted.length === 0,
    absent,
    drifted,
    // Keys only, never values: this is logged, and the values are listing copy
    // that does not belong in a public CI log. It is what tells the next reader
    // whether the field is missing from App Store Connect or from the pull.
    fields: Object.keys(pulled).sort(),
    locales: localeNames,
  };
}

function main() {
  const [committedPath, pulledPath] = process.argv.slice(2);
  if (!committedPath || !pulledPath) {
    console.error("usage: check-store-listing-drift.mjs <apple-info.json> <store.config.json>");
    process.exit(2);
  }

  const committed = JSON.parse(readFileSync(committedPath, "utf8"));
  const pulled = JSON.parse(readFileSync(pulledPath, "utf8"));
  const info = pulled?.apple?.info ?? {};

  const result = findListingDrift(committed, info);

  console.log("Committed listing text:");
  console.log(JSON.stringify(committed, null, 2));
  console.log(`Locales present in the pulled metadata: ${result.locales.join(", ") || "(none)"}`);
  // Field NAMES only - see `fields` above for why the values stay out of here.
  // Without this line the pulled shape was unknowable after the fact: the job
  // deletes store.config.json on the way out, so a field that comes back
  // missing looked identical to a field that came back changed (#2540).
  console.log(`Fields present under ${EXPECTED_LOCALE}: ${result.fields.join(", ") || "(none)"}`);

  if (result.reason === "no-info-block") {
    console.error("::error::The pulled metadata has no apple.info block at all.");
    console.error(
      "::error::That is a shape change in EAS Metadata, not listing drift - fix the path in this script.",
    );
    process.exit(1);
  }

  if (result.reason === "expected-locale-absent") {
    console.error(
      `::error::The pulled metadata has no ${EXPECTED_LOCALE} locale (found: ${result.locales.join(", ")}).`,
    );
    console.error(
      "::error::That is a repository-side fix, not App Store Connect drift - read the live locale key and update EXPECTED_LOCALE and store/README.md.",
    );
    process.exit(1);
  }

  // Reported before drift, and separately, because the remedy is the opposite
  // one: nothing here drifted, so there is no "which side is wrong" to decide.
  if (result.absent.length > 0) {
    console.error(
      `::error::store/apple-info.json commits fields the ${EXPECTED_LOCALE} pull does not carry: ${result.absent.join(", ")}`,
    );
    console.error(
      "::error::That is not drift - there is no live value to have drifted from. Either the field is unset in App Store Connect, or metadata:pull does not carry it under this name.",
    );
    console.error(
      "::error::Both fixes are on this side: enter the value in App Store Connect, or stop committing it. Do not edit the listing back, and do not silence this check.",
    );
  }

  if (result.drifted.length > 0) {
    console.error("::error::App Store Connect no longer matches store/apple-info.json:");
    for (const line of result.drifted) console.error(`::error::${line}`);
    console.error(
      "::error::Decide which side is wrong - store/README.md explains both cases. Do not silence this check.",
    );
  }

  if (!result.ok) {
    process.exit(1);
  }

  console.log("App Store Connect matches the committed listing text.");
}

// Only run when invoked directly, so the test can import findListingDrift.
//
// ⚠️ `import.meta.url` is null under babel, which is how jest loads this file -
// the same note test/audio-manifest-cli.test.ts carries about manifest.mjs. That
// null is what keeps main() from running during the suite, so the guard must
// short-circuit on it BEFORE touching process.argv: on Windows a bare
// `new URL("file://" + argv[1])` on a "C:\..." path is not a valid URL and throws
// at import time, taking the test down with it. pathToFileURL is the encoding-safe
// form, and it is only reached when import.meta.url is a real string.
if (import.meta.url && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
