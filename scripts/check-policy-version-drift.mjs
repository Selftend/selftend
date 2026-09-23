#!/usr/bin/env node
/**
 * The comparison inside the weekly policy-version drift alarm (#2737, ruled on
 * #2706).
 *
 * Reads the distinct `policy_version_accepted` values in production and reports
 * any that rank **above** the version `main` ships — i.e. a cohort has accepted
 * policy text that has never publicly released.
 *
 * ☠️ WHY THIS EXISTS. Twenty production rows accepted
 * `2026-09-18-programme-retention` on 2026-09-21, a version that existed only on
 * `dev`. Closed-testing builds ship against the production backend **by design**
 * (docs/releasing.md) so testers keep their real accounts, and #2706 ruled that
 * arrangement stays. What was missing is anything that NOTICES: #2707 decided
 * what to do when a cohort is on an unreleased version — edit the text in place
 * when their consent survives it, bump to a fresh version when it does not — and
 * that rule can only be applied by somebody who knows the cohort exists. Those
 * twenty rows were found by accident, while grilling something else.
 *
 * ⛔ IT REFUSES NOTHING AND BLOCKS NOTHING. A red run means "a cohort is on an
 * unreleased version — #2707's rule applies before you touch that text". A
 * question for a person, not a verdict, on the same footing as
 * store-metadata-drift.yml. #2706 explicitly rejected making the consent write
 * itself fail: the monotonic trigger fails open on purpose, and a failed consent
 * write leaves somebody staring at a full-screen wall with no way past.
 *
 * NO NEW CREDENTIAL. Reuses the read-only `analytics_digest_ro` role and
 * ANALYTICS_DIGEST_DB_URL, already inventoried on control-tower#137.
 *
 * NO PERSONAL DATA. The query returns DISTINCT VERSION STRINGS and nothing else
 * — no rows, no user ids, no per-person counts. This reads a consent table, so
 * that constraint is a boundary rather than a preference: do not widen the
 * select list.
 *
 * ⚠️ WHAT "ABOVE" MEANS, and it is not "different". Ordering comes from the
 * leading ISO date prefix and from nothing else — the exact rule
 * `20260911000000_policy_version_monotonic.sql` encodes. So:
 *   * a version OLDER than main's is normal — a client that has not re-accepted
 *     yet — and must never redden;
 *   * an UNRANKABLE value (no date prefix) is ignored, because the migration
 *     deliberately lets legacy and hand-edited values heal on the next accept;
 *   * only a STRICTLY NEWER date prefix is the pre-release case.
 *
 * The logic lives here rather than in the workflow because it is unit-tested in
 * `verify` by test/policy-version-drift.test.ts. An untestable comparison inside
 * a scheduled guard is how a guard starts lying without anyone noticing —
 * store-metadata-drift.yml was broken from birth and never once completed a
 * pull (#1798).
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** The one column this alarm may ever read. */
export const QUERY =
  "select distinct policy_version_accepted from public.user_preferences " +
  "where policy_version_accepted is not null order by 1;";

/**
 * The version `main` ships, read out of the source rather than duplicated.
 *
 * ⭐ This works because the workflow is SCHEDULED, and GitHub runs scheduled
 * workflows from the DEFAULT BRANCH — which docs/releasing.md keeps as `main`
 * for exactly this class of reason. So the checkout the job reads already is
 * what shipped; there is no second source of truth to keep in step.
 */
export function parseShippedVersion(source) {
  const match = /export const policyVersion\s*=\s*["']([^"']+)["']/.exec(source);
  if (!match) {
    throw new Error(
      "Could not find `export const policyVersion` in src/features/policies/policy-content.ts. " +
        "If that constant moved, this guard must move with it rather than be deleted.",
    );
  }
  return match[1];
}

/** The leading `YYYY-MM-DD`, or null when the value carries no date prefix. */
export function datePrefix(version) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(version));
  return match ? match[1] : null;
}

/**
 * The alarm's question, as a pure function.
 *
 * Returns the production versions that rank strictly above `shipped`. Anything
 * older, equal, or unrankable is deliberately not reported.
 */
export function findUnshippedVersions(productionVersions, shipped) {
  const shippedDate = datePrefix(shipped);
  if (shippedDate === null) {
    throw new Error(
      `The shipped policyVersion ${JSON.stringify(shipped)} has no YYYY-MM-DD prefix, so nothing ` +
        "can be ranked against it. Fix the constant rather than loosening this guard.",
    );
  }
  return productionVersions.filter((version) => {
    const date = datePrefix(version);
    // Unrankable values pass through, exactly as the monotonic trigger lets them.
    return date !== null && date > shippedDate;
  });
}

/** Distinct version strings, one per line, from `psql`'s tuples-only output. */
export function parsePsqlVersions(stdout) {
  return String(stdout)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function readProductionVersions(url) {
  const result = spawnSync("psql", [url, "--no-psqlrc", "-At", "-c", QUERY], {
    encoding: "utf8",
  });
  if (result.error) throw new Error(`psql could not be run: ${result.error.message}`);
  if (result.status !== 0) {
    // ☠️ A failed read must go RED, never quietly green. A guard that cannot see
    // reports "nothing to do" in exactly the same words as a healthy one.
    throw new Error(`psql exited ${result.status}: ${String(result.stderr).trim()}`);
  }
  return parsePsqlVersions(result.stdout);
}

async function main() {
  const url = process.env.ANALYTICS_DIGEST_DB_URL;
  if (!url) {
    throw new Error("ANALYTICS_DIGEST_DB_URL is not set - see this script's header.");
  }

  const shipped = parseShippedVersion(
    readFileSync("src/features/policies/policy-content.ts", "utf8"),
  );
  const production = readProductionVersions(url);
  const unshipped = findUnshippedVersions(production, shipped);

  console.log(`main ships: ${shipped}`);
  console.log(`production holds: ${production.join(", ") || "(none)"}`);

  if (unshipped.length === 0) {
    console.log("No production consent record is ahead of what main ships.");
    return;
  }

  for (const version of unshipped) {
    console.log(
      `::error::Production holds policy_version_accepted=${version}, which main does not ship. ` +
        "A cohort has accepted policy text that never publicly released.",
    );
  }
  console.log(
    "::error::Apply #2707's rule BEFORE editing that policy text: edit in place when the " +
      "correction leaves their consent valid, bump to a fresh version when it does not. " +
      "This is a question, not a verdict - nothing is broken.",
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
