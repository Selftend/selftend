#!/usr/bin/env node
// Runs an aggregate-only analytics report (scripts/analytics-<name>.sql)
// against the local or linked Supabase project.
//
// CLI path attempted: `supabase db query --file` does NOT support multiple SQL
// statements in a single file (returns "cannot insert multiple commands into a
// prepared statement"). Fallback used instead:
//
//   --local : pipes the SQL file through psql inside the supabase_db_selftend
//             Docker container (psql is not on PATH on this machine).
//             Command: docker exec -i supabase_db_selftend psql -U postgres -d postgres
//
//   --linked: requires SUPABASE_DB_URL env var (get it from the Supabase dashboard
//             under Project Settings > Database > Connection string > psql).
//             Command: psql "$SUPABASE_DB_URL"  (psql must be on PATH for linked runs.)
//
// Usage:
//   npm run analytics:onboarding -- --local
//   npm run analytics:engagement -- --local
//   SUPABASE_DB_URL="postgres://..." npm run analytics:onboarding
//
// Contributor-only tooling; the app bundle never imports this.

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const args = process.argv.slice(2);
const reportName = args.find((arg) => !arg.startsWith("--"));
const isLocal = args.includes("--local");

if (!reportName) {
  console.error(
    "[analytics] Missing report name.\nUsage: node scripts/analytics-report.js <name> [--local]",
  );
  process.exit(1);
}

const sqlFile = path.join(__dirname, `analytics-${reportName}.sql`);
if (!fs.existsSync(sqlFile)) {
  console.error(`[analytics] Report file not found: ${sqlFile}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, "utf8");

// ☠️ ON_ERROR_STOP=1 IS LOAD-BEARING, and its absence was found by #2378. Without
// it psql reports a failing statement, carries on with the next one, and EXITS 0
// - so a report with a broken section printed the rest and looked like a
// success, and `npm run analytics:<name>` could not be trusted as a check.
//
// That is the exact failure this report family is built to rule out:
// docs/analytics.md requires DATA, CORRECTLY EMPTY and BROKEN to be three
// distinguishable states, and #2378 made the first two distinguishable by giving
// open-shape sections a no-rows marker. A runner that swallows the third
// undermines both. A broken report must now stop, say so, and exit non-zero.
//
// ⚠️ The trade is deliberate: a report with one bad section no longer prints the
// sections after it. A loud failure beats a silently missing table, and the
// integration suite has always run these files this way.
const PSQL_STRICT = ["-v", "ON_ERROR_STOP=1"];

if (isLocal) {
  // Pipe SQL file via stdin into psql running inside the Docker container.
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_selftend",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      ...PSQL_STRICT,
    ],
    { input: sql, stdio: ["pipe", "inherit", "inherit"] },
  );
  process.exit(result.status ?? 1);
} else {
  // --linked: use psql with the connection string from the env var.
  //
  // ☠️ TWO NAMES, DELIBERATELY, AND THE DIGEST MUST NOT BORROW THE OTHER ONE
  // (#2380, #2381). `SUPABASE_DB_URL` is the OWNER's credential - the `postgres`
  // role, which can write and bypasses RLS. The monthly digest runs
  // repository-authored SQL against production on a schedule, so it runs as a
  // dedicated read-only role under its own name. Collapsing the two would mean a
  // scheduled job silently acquiring write access the day somebody set the
  // familiar variable, which is the precise failure the separate role exists to
  // prevent.
  //
  // The digest's name wins when both are present: a run that has been handed the
  // restricted credential must never quietly fall back to the privileged one.
  // ⚠️ Both read statically: `process.env[someVariable]` is rejected by
  // eslint's expo/no-dynamic-env-var, and the pair reads more plainly anyway.
  // `||` rather than `??` on purpose - an empty string is an unset credential,
  // not a credential that happens to be empty.
  const digestUrl = process.env.ANALYTICS_DIGEST_DB_URL;
  const ownerUrl = process.env.SUPABASE_DB_URL;
  const dbUrl = digestUrl || ownerUrl;
  const urlVar = digestUrl ? "ANALYTICS_DIGEST_DB_URL" : "SUPABASE_DB_URL";
  if (!dbUrl) {
    console.error(
      `[analytics:${reportName}] neither ANALYTICS_DIGEST_DB_URL nor SUPABASE_DB_URL is set.\n` +
        "Get the connection string from: Supabase dashboard > Project Settings > Database > Connection string > psql\n" +
        `Then run: SUPABASE_DB_URL='postgres://...' npm run analytics:${reportName}\n` +
        "The scheduled digest uses ANALYTICS_DIGEST_DB_URL, which is the read-only role.",
    );
    process.exit(1);
  }
  // Which name, never the value - so a digest run's log evidences that it used
  // the restricted credential rather than the owner's.
  console.error(`[analytics:${reportName}] connecting via ${urlVar}`);
  const result = spawnSync("psql", [dbUrl, ...PSQL_STRICT], {
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
  });
  process.exit(result.status ?? 1);
}
