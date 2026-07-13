#!/usr/bin/env node
// Wraps `supabase db reset` and refreshes the local API containers afterwards.
// `db reset` can leave PostgREST serving its pre-migration function cache, and
// recreating GoTrue can leave Kong's nginx pointing at its old container IP.

const { spawnSync } = require("node:child_process");

const isWindows = process.platform === "win32";

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (result.error) {
    console.error(`[db-reset] Failed to run ${cmd}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function tryRun(cmd, args) {
  return spawnSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
}

if (isWindows) {
  run(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm exec supabase -- db reset"]);
} else {
  run("npm", ["exec", "supabase", "--", "db", "reset"]);
}

function restartMatchingContainers(namePattern, label, reason) {
  const ps = tryRun("docker", ["ps", "-q", "--filter", `name=^${namePattern}`]);
  const ids = ps.stdout?.toString().trim().split("\n").filter(Boolean) ?? [];
  if (ids.length === 0) {
    console.warn(`[db-reset] No ${label} container found to restart.`);
    return;
  }

  console.log(`[db-reset] Restarting ${label} (${ids.join(", ")}) ${reason}...`);
  const restart = tryRun("docker", ["restart", ...ids]);
  if (restart.status !== 0) {
    console.warn(`[db-reset] ${label} restart failed: ${restart.stderr?.toString().trim()}`);
    process.exit(restart.status ?? 1);
  }
  console.log(`[db-reset] ${label} restarted.`);
}

restartMatchingContainers("supabase_rest_", "PostgREST", "to load the completed migration schema");
restartMatchingContainers("supabase_kong_", "Kong", "to refresh upstream IPs");
