#!/usr/bin/env node
// Runs the aggregate-only onboarding funnel report (scripts/analytics-onboarding.sql)
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
//             Command: psql "$SUPABASE_DB_URL"  (psql must be on PATH for linked runs).
//
// Usage:
//   npm run analytics:onboarding -- --local
//   SUPABASE_DB_URL="postgres://..." npm run analytics:onboarding
//
// Contributor-only tooling; the app bundle never imports this.

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const sqlFile = path.join(__dirname, "analytics-onboarding.sql");
const isLocal = process.argv.includes("--local");

if (isLocal) {
  // Pipe SQL file via stdin into psql running inside the Docker container.
  const sql = fs.readFileSync(sqlFile, "utf8");
  const result = spawnSync(
    "docker",
    ["exec", "-i", "supabase_db_selftend", "psql", "-U", "postgres", "-d", "postgres"],
    { input: sql, stdio: ["pipe", "inherit", "inherit"] },
  );
  process.exit(result.status ?? 1);
} else {
  // --linked: use psql with the connection string from the env var.
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error(
      "[analytics:onboarding] SUPABASE_DB_URL is not set.\n" +
        "Get the connection string from: Supabase dashboard > Project Settings > Database > Connection string > psql\n" +
        "Then run: SUPABASE_DB_URL='postgres://...' npm run analytics:onboarding",
    );
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlFile, "utf8");
  const result = spawnSync("psql", [dbUrl], {
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
  });
  process.exit(result.status ?? 1);
}
