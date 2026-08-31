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
// ☠️ LOCALE-AGNOSTIC ON PURPOSE, and this is the part to read before "fixing" it.
// These fields live under `apple.info.<locale>`, and the locale key App Store
// Connect actually uses has never been read - the repository has no committed
// store.config.json and nothing else records it. Hard-coding "en-US" would be
// precisely the guessed value store/README.md forbids: if it is wrong, the job
// reports a missing key every week until someone mutes it. So this asks the
// weaker question it can answer honestly - does SOME locale carry this exact
// value - which still goes red the moment Apple's English listing changes.
//
// Once someone reads the real locale keys out of App Store Connect, tighten this
// to compare per locale and delete this paragraph.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * @param {Record<string, unknown>} committed Fields read from the live record and committed.
 * @param {Record<string, Record<string, unknown>>} locales The pulled `apple.info` block.
 * @returns {{ ok: boolean, reason?: string, drifted: string[], locales: string[] }}
 */
export function findListingDrift(committed, locales) {
  const localeNames = Object.keys(locales ?? {});

  // A shape change in EAS Metadata, not listing drift. Reported separately
  // because the fix is in this repository, not in App Store Connect - the same
  // distinction the advisory step draws between a missing key and a changed one.
  if (localeNames.length === 0) {
    return {
      ok: false,
      reason: "no-info-block",
      drifted: [],
      locales: [],
    };
  }

  const drifted = Object.entries(committed)
    .filter(([field, value]) => !localeNames.some((name) => locales[name]?.[field] === value))
    .map(([field, value]) => `${field}: committed ${JSON.stringify(value)}, matched by no locale`);

  return { ok: drifted.length === 0, drifted, locales: localeNames };
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

  if (result.reason === "no-info-block") {
    console.error("::error::The pulled metadata has no apple.info block at all.");
    console.error(
      "::error::That is a shape change in EAS Metadata, not listing drift - fix the path in this script.",
    );
    process.exit(1);
  }

  if (!result.ok) {
    console.error("::error::App Store Connect no longer matches store/apple-info.json:");
    for (const line of result.drifted) console.error(`::error::${line}`);
    console.error(
      "::error::Decide which side is wrong - store/README.md explains both cases. Do not silence this check.",
    );
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
