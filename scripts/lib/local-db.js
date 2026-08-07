// Ensures the local Supabase stack is up before a dev launcher starts Metro,
// so a cold `npm run start` works without a separate `npm run db:start`.
// Probes the API port first - warm starts stay instant and never touch the
// Supabase CLI. When the stack is down it also boots Docker Desktop
// (Windows/macOS) if the daemon isn't up yet. Prod runs are inherently a
// no-op: their EXPO_PUBLIC_SUPABASE_URL is not localhost, so
// getLocalSupabasePort() returns null.

const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const { getLocalSupabasePort } = require("./ports");

const PROBE_TIMEOUT_MS = 1500;
const DOCKER_POLL_INTERVAL_MS = 2000;
// Docker Desktop cold boot (incl. its WSL VM on Windows) can take minutes.
const DOCKER_BOOT_TIMEOUT_MS = 300000;
const SUPABASE_START_ATTEMPTS = 5;
const SUPABASE_RETRY_DELAY_MS = 5000;

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port, timeout: PROBE_TIMEOUT_MS });
    const finish = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDockerDaemonUp() {
  const result = spawnSync("docker", ["info"], { stdio: "ignore" });
  return !result.error && result.status === 0;
}

// Fire-and-forget launch of Docker Desktop. Returns false when there is
// nothing sensible to launch (Linux daemon, exe not found) so the caller can
// tell the developer to start Docker themselves.
function launchDockerDesktop() {
  if (process.platform === "win32") {
    const exePath = path.join(
      process.env.ProgramFiles ?? "C:\\Program Files",
      "Docker",
      "Docker",
      "Docker Desktop.exe",
    );
    if (!fs.existsSync(exePath)) return false;

    const child = spawn(exePath, [], { detached: true, stdio: "ignore" });
    child.unref();
    return true;
  }

  if (process.platform === "darwin") {
    const result = spawnSync("open", ["-g", "-a", "Docker"], { stdio: "ignore" });
    return !result.error && result.status === 0;
  }

  // Linux runs dockerd as a service - launching a GUI app makes no sense.
  return false;
}

async function ensureDockerRunning() {
  if (isDockerDaemonUp()) return;

  console.log("[local-db] Docker daemon is not running - starting Docker Desktop...");

  if (!launchDockerDesktop()) {
    console.error(
      "[local-db] Could not launch Docker Desktop automatically. Start Docker, then rerun.",
    );
    process.exit(1);
  }

  const startedAt = Date.now();
  const deadline = startedAt + DOCKER_BOOT_TIMEOUT_MS;
  let lastNotice = startedAt;
  while (Date.now() < deadline) {
    await sleep(DOCKER_POLL_INTERVAL_MS);
    if (isDockerDaemonUp()) {
      console.log("[local-db] Docker daemon is up.");
      return;
    }
    if (Date.now() - lastNotice >= 30000) {
      lastNotice = Date.now();
      console.log(
        `[local-db] Still waiting for the Docker daemon (${Math.round((Date.now() - startedAt) / 1000)}s)...`,
      );
    }
  }

  console.error("[local-db] Timed out waiting for the Docker daemon. Start Docker, then rerun.");
  process.exit(1);
}

async function ensureLocalDbRunning() {
  const port = getLocalSupabasePort();
  if (port === null) return;

  if (await isPortOpen(port)) return;

  console.log(`[local-db] Local Supabase is not reachable on 127.0.0.1:${port} - starting it...`);

  await ensureDockerRunning();

  // `supabase start` can fail transiently right after the Docker daemon comes
  // up: Docker auto-restarts the project's containers and the CLI reports
  // "container is not ready: starting" instead of waiting. Retry with a
  // delay, and short-circuit if the stack finishes booting on its own.
  let lastStatus = 1;
  for (let attempt = 1; attempt <= SUPABASE_START_ATTEMPTS; attempt += 1) {
    const result =
      process.platform === "win32"
        ? spawnSync(
            process.env.ComSpec ?? "cmd.exe",
            ["/d", "/s", "/c", "npm exec supabase -- start"],
            {
              stdio: "inherit",
            },
          )
        : spawnSync("npm", ["exec", "supabase", "--", "start"], { stdio: "inherit" });

    if (result.error) {
      console.error(`[local-db] Failed to run supabase start: ${result.error.message}`);
      process.exit(1);
    }
    if (result.status === 0) return;

    lastStatus = result.status ?? 1;

    if (attempt < SUPABASE_START_ATTEMPTS) {
      console.log(
        "[local-db] `supabase start` failed - the stack may still be booting, retrying...",
      );
      await sleep(SUPABASE_RETRY_DELAY_MS);
      if (await isPortOpen(port)) return;
    }
  }

  console.error("[local-db] `supabase start` kept failing.");
  process.exit(lastStatus);
}

module.exports = { ensureLocalDbRunning };
