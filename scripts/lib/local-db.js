// Ensures the local Supabase stack is up before a dev launcher starts Metro,
// so a cold `npm run start` works without a separate `npm run db:start`.
// Probes the API port first - warm starts stay instant and never touch the
// Supabase CLI. Prod runs are inherently a no-op: their
// EXPO_PUBLIC_SUPABASE_URL is not localhost, so getLocalSupabasePort()
// returns null.

const { spawnSync } = require("node:child_process");
const net = require("node:net");

const { getLocalSupabasePort } = require("./ports");

const PROBE_TIMEOUT_MS = 1500;

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

async function ensureLocalDbRunning() {
  const port = getLocalSupabasePort();
  if (port === null) return;

  if (await isPortOpen(port)) return;

  console.log(`[local-db] Local Supabase is not reachable on 127.0.0.1:${port} - starting it...`);

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
  if (result.status !== 0) {
    console.error("[local-db] `supabase start` failed. Is Docker running?");
    process.exit(result.status ?? 1);
  }
}

module.exports = { ensureLocalDbRunning };
