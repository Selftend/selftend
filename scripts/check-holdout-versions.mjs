#!/usr/bin/env node
/**
 * The comparison inside the weekly hold-out alarm (#2717, decided on #2701).
 *
 * Reads the hold-out register in `docs/releasing.md`, reads the two live store
 * versions, and reports every still-held-out entry whose "Shipped in" release is
 * at or below BOTH — that is, every hold-out whose own condition has been met
 * and that nobody has lifted.
 *
 * ☠️ WHY THIS EXISTS. `dbt` sat 13 days past its condition, the six DBT step
 * tools 13, and `general` 5, across 32 releases in which neither list was ever
 * emptied. `docs/releasing.md` said exactly why at the time: "Nothing lifts it
 * automatically, and nothing goes red while it stays held out — which is exactly
 * how a hold-out outlives its reason." This job is the thing that goes red.
 *
 * ⛔ IT LIFTS NOTHING, AND MUST NOT. A lift is a judgement about a shipped
 * client — it needs a person to decide the client really is out there and to
 * make the matching code and migration edits. This only asks the question.
 *
 * NO CREDENTIALS. Both reads are public and keyless: Apple's iTunes lookup
 * endpoint and the public Play listing page. There is nothing here for
 * control-tower to inventory.
 *
 * ⚠️ THE PLAY READ IS A SCRAPE AND WILL EVENTUALLY BREAK. It is treated as a
 * hard failure rather than a skip, on purpose: a guard that quietly stops
 * comparing is the `store-metadata-drift.yml` failure (#1798), where the job
 * "that would have complained" had never once completed a pull. If this cannot
 * read a version it says so and exits non-zero.
 *
 * The logic lives here rather than in the workflow because it is unit-tested in
 * `verify` by `test/holdout-versions.test.ts`. An untestable comparison inside a
 * weekly guard is how a guard starts lying without anyone noticing.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const APP_STORE_ID = "6796318929";
export const PLAY_PACKAGE = "org.vasilyoshev.selftend";

/**
 * Compare two dotted numeric versions.
 *
 * Returns <0 when `a` is older, 0 when equal, >0 when newer. Missing segments
 * count as 0, so `0.18` and `0.18.0` compare equal. Non-numeric segments are
 * treated as 0 rather than throwing — a store can legitimately publish
 * something this does not model, and the alarm should not die on it.
 */
export function compareVersions(a, b) {
  const pa = String(a).split(".");
  const pb = String(b).split(".");
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const na = Number.parseInt(pa[i] ?? "0", 10) || 0;
    const nb = Number.parseInt(pb[i] ?? "0", 10) || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

/**
 * Pull `v0.18.0` out of a "Shipped in" cell like `v0.18.0, 2026-09-09`.
 * Returns null when the cell carries no version, which the caller reports
 * rather than silently skipping — `test/holdout-table.test.ts` already refuses
 * an empty cell, so a null here means a malformed one.
 */
export function releaseVersion(shippedIn) {
  const m = /v?(\d+(?:\.\d+)*)/.exec(String(shippedIn));
  return m ? m[1] : null;
}

/**
 * The alarm's question, as a pure function.
 *
 * `rows` are the still-held rows of the register. A row is REPORTED when its
 * shipped-in release is at or below both store versions: the client that
 * understands the entry is live everywhere, so the condition every hold-out in
 * this repo carries has been met.
 *
 * ⚠️ "At or below", not "below" — the release that ships the reading client is
 * itself sufficient. `dbt` shipped in v0.18.0 and was routable in v0.18.0; a
 * strict comparison would have waited for v0.19.0 for no reason.
 */
export function findMetConditions(rows, stores) {
  const met = [];
  for (const row of rows) {
    const version = releaseVersion(row.shippedIn);
    if (version === null) {
      met.push({ ...row, version: null, reason: `its "Shipped in" cell names no version` });
      continue;
    }
    const vsAppStore = compareVersions(version, stores.appStore);
    const vsPlay = compareVersions(version, stores.play);
    if (vsAppStore <= 0 && vsPlay <= 0) {
      met.push({
        ...row,
        version,
        reason:
          `shipped in v${version}; App Store is on ${stores.appStore} and Google Play on ${stores.play}, ` +
          `so the client that understands it is live on both`,
      });
    }
  }
  return met;
}

/** Apple's keyless lookup endpoint. Throws rather than returning a guess. */
export async function readAppStoreVersion(fetchImpl = fetch) {
  const res = await fetchImpl(`https://itunes.apple.com/lookup?id=${APP_STORE_ID}`);
  if (!res.ok) throw new Error(`iTunes lookup returned HTTP ${res.status}`);
  const body = await res.json();
  const version = body?.results?.[0]?.version;
  if (!version) throw new Error("iTunes lookup returned no version for the app.");
  return version;
}

/**
 * The public Play listing. ⚠️ A scrape: Play has no metadata API at all
 * (EAS Metadata is App Store only), which `store/README.md` records as the
 * reason the committed mirror is the only guard that will ever exist there.
 */
export function extractPlayVersion(html) {
  // The version sits in a nested array literal in the page's embedded data.
  const m = /\[\[\["(\d+(?:\.\d+)+)"\]\]/.exec(html);
  return m ? m[1] : null;
}

export async function readPlayVersion(fetchImpl = fetch) {
  const res = await fetchImpl(
    `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&hl=en&gl=US`,
    { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } },
  );
  if (!res.ok) throw new Error(`Play listing returned HTTP ${res.status}`);
  const version = extractPlayVersion(await res.text());
  if (!version) {
    throw new Error(
      "Could not find a version in the Play listing. The page shape has probably changed - " +
        "fix extractPlayVersion in scripts/check-holdout-versions.mjs. Do not silence this check.",
    );
  }
  return version;
}

// --- the table reader -------------------------------------------------------
// Kept in step with test/holdout-table.ts, which is the TypeScript half that the
// merge gate uses. The gate enforces that this table matches the constants, so
// reading only the table here is safe.

const TABLE_START = "<!-- holdout-table:start -->";
const TABLE_END = "<!-- holdout-table:end -->";

export function parseStillHeld(markdown) {
  const start = markdown.indexOf(TABLE_START);
  const end = markdown.indexOf(TABLE_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`The hold-out table markers are missing from docs/releasing.md.`);
  }
  const lines = markdown
    .slice(start + TABLE_START.length, end)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));

  return lines
    .slice(2)
    .map(rowOf)
    .filter((r) => r.lifted === "");
}

function rowOf(line) {
  const cells = line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
  const untick = (c) => (/^`(.+)`$/.test(c) ? c.slice(1, -1) : c);
  return {
    constant: untick(cells[0] ?? ""),
    entry: untick(cells[1] ?? ""),
    withholds: cells[2] ?? "",
    shippedIn: cells[3] ?? "",
    liftsWhen: cells[4] ?? "",
    liftIssue: cells[5] ?? "",
    lifted: cells[6] ?? "",
  };
}

async function main() {
  const docPath = process.argv[2] ?? "docs/releasing.md";
  const rows = parseStillHeld(readFileSync(docPath, "utf8"));

  if (rows.length === 0) {
    console.log("Nothing is held out. Both constants are empty and the register agrees.");
    return;
  }

  const [appStore, play] = await Promise.all([readAppStoreVersion(), readPlayVersion()]);
  console.log(`App Store ${appStore} · Google Play ${play}`);
  console.log(`Still held out: ${rows.map((r) => `${r.constant}.${r.entry}`).join(", ")}`);

  const met = findMetConditions(rows, { appStore, play });
  if (met.length === 0) {
    console.log("No hold-out has met its condition yet.");
    return;
  }

  for (const row of met) {
    console.log(
      `::error::${row.constant}.${row.entry} can be lifted - ${row.reason}. ` +
        `Condition: ${row.liftsWhen}. ${row.liftIssue ? `Lift issue: ${row.liftIssue}.` : ""}`,
    );
  }
  console.log(
    "::error::Follow docs/releasing.md 'Post-release: lift held-out entries'. " +
      "This is a question, not a verdict - confirm the build really is live before lifting.",
  );
  process.exitCode = 1;
}

// Windows-safe entrypoint check, same shape as check-store-listing-drift.mjs.
if (import.meta.url && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.log(`::error::${err.message}`);
    process.exitCode = 1;
  });
}
