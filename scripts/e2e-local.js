#!/usr/bin/env node
// One-command local e2e run: verifies Docker is up, boots local Supabase if
// needed, reseeds the database, ensures the Playwright browser is installed,
// then runs the suite. Use it to verify e2e locally before pushing a PR:
//
//   npm run test:e2e:local                   # full suite
//   npm run test:e2e:local -- log-mood       # only matching spec files
//
// Extra args after `--` are passed straight to `playwright test`.

const { spawnSync } = require("node:child_process");

const isWindows = process.platform === "win32";

function npmExec(argString, opts = {}) {
  const cmd = `npm exec ${argString}`;
  const result = isWindows
    ? spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", cmd], {
        stdio: "inherit",
        ...opts,
      })
    : spawnSync("sh", ["-c", cmd], { stdio: "inherit", ...opts });
  if (result.error) {
    console.error(`[e2e-local] Failed to run ${cmd}: ${result.error.message}`);
    process.exit(1);
  }
  return result.status ?? 1;
}

function fail(step, status) {
  console.error(`[e2e-local] ${step} failed (exit ${status}).`);
  process.exit(status || 1);
}

// 1. Docker must be reachable - Supabase local runs in containers.
const docker = spawnSync("docker", ["info"], { stdio: "ignore" });
if (docker.error || docker.status !== 0) {
  console.error("[e2e-local] Docker engine is not reachable. Start Docker Desktop and retry.");
  process.exit(1);
}

// 2. Boot local Supabase if it is not already up.
const status = spawnSync(
  isWindows ? (process.env.ComSpec ?? "cmd.exe") : "sh",
  isWindows
    ? ["/d", "/s", "/c", "npm exec supabase -- status"]
    : ["-c", "npm exec supabase -- status"],
  { stdio: "ignore" },
);
if (status.status !== 0) {
  console.log("[e2e-local] Local Supabase is not running - starting it...");
  const s = npmExec("supabase -- start");
  if (s !== 0) fail("supabase start", s);
} else {
  console.log("[e2e-local] Local Supabase is already running.");
}

// 3. Reseed so every run starts from the same fixtures (matches CI).
{
  const r = spawnSync(
    isWindows ? (process.env.ComSpec ?? "cmd.exe") : "sh",
    isWindows ? ["/d", "/s", "/c", "npm run db:reset"] : ["-c", "npm run db:reset"],
    { stdio: "inherit" },
  );
  if ((r.status ?? 1) !== 0) fail("db:reset", r.status ?? 1);
}

// 4. Ensure the Playwright browser is present (no-op when already installed).
{
  const p = npmExec("playwright -- install chromium");
  if (p !== 0) fail("playwright install", p);
}

// 5. Run the suite; forward any extra args to `playwright test`.
const extraArgs = process.argv.slice(2);
const testCmd = ["playwright -- test", ...extraArgs].join(" ");
const t = npmExec(testCmd);
process.exit(t);
