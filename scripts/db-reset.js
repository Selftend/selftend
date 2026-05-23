#!/usr/bin/env node
// Wraps `supabase db reset` and restarts the Kong container afterwards.
// `db reset` recreates the GoTrue container with a fresh IP, but Kong's nginx
// caches the old upstream IP and returns 502 Bad Gateway until restarted.

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

const ps = tryRun("docker", ["ps", "-q", "--filter", "name=^supabase_kong_"]);
const kongIds = ps.stdout?.toString().trim().split("\n").filter(Boolean) ?? [];

if (kongIds.length === 0) {
  console.warn(
    "[db-reset] No Kong container found to restart. If sign-in returns 502, run: docker restart supabase_kong_<project>",
  );
  process.exit(0);
}

console.log(`[db-reset] Restarting Kong (${kongIds.join(", ")}) to refresh upstream IPs...`);
const restart = tryRun("docker", ["restart", ...kongIds]);
if (restart.status !== 0) {
  console.warn(`[db-reset] Kong restart failed: ${restart.stderr?.toString().trim()}`);
  process.exit(restart.status ?? 1);
}
console.log("[db-reset] Kong restarted.");
