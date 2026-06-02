const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const HIDE_FLAG = "--hide-env-local";

function stripGuardArgs(args) {
  return args.filter((arg) => arg !== HIDE_FLAG);
}

function hasGuardFlag(args) {
  return args.includes(HIDE_FLAG);
}

function getCacheDirs(projectRoot) {
  return [
    path.join(os.tmpdir(), "metro-cache"),
    path.join(projectRoot, "node_modules", ".cache"),
    path.join(projectRoot, ".expo", "web"),
  ];
}

function envFingerprint() {
  const publicEnv = Object.keys(process.env)
    .filter((key) => key.startsWith("EXPO_PUBLIC_"))
    .sort()
    .map((key) => `${key}=${process.env[key]}`)
    .join("\n");
  return crypto.createHash("sha1").update(publicEnv).digest("hex");
}

/**
 * Wipe metro/babel/expo caches only when the EXPO_PUBLIC_* fingerprint differs
 * from the previous run. Same env back-to-back reuses the warm caches.
 */
function ensureCacheMatchesEnv(projectRoot = process.cwd()) {
  const metroCacheDir = path.join(os.tmpdir(), "metro-cache");
  const markerPath = path.join(metroCacheDir, ".selftend-env-fingerprint");
  const fingerprint = envFingerprint();

  let previous = null;
  try {
    previous = fs.readFileSync(markerPath, "utf8").trim();
  } catch {
    // marker missing - treat as mismatch
  }

  if (previous === fingerprint) {
    return false;
  }

  for (const cacheDir of getCacheDirs(projectRoot)) {
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
  }

  fs.mkdirSync(metroCacheDir, { recursive: true });
  fs.writeFileSync(markerPath, fingerprint);
  console.log(
    `[env-cache] EXPO_PUBLIC_* fingerprint changed (${previous?.slice(0, 8) ?? "none"} → ${fingerprint.slice(0, 8)}) - wiped metro/babel/expo caches.`,
  );
  return true;
}

/**
 * In dev mode @expo/metro-config builds the virtual env module via
 * require.context over `.env`, `.env.development`, `.env.local`,
 * `.env.development.local` and merges them over process.env - so `.env.local`
 * always wins, regardless of `EXPO_NO_DOTENV` or `--env-file`. The only
 * reliable way to run dev-client against the prod URL is to hide `.env.local`
 * for the duration of the run.
 */
function applyProdEnvGuard(projectRoot = process.cwd()) {
  const envLocalPath = path.join(projectRoot, ".env.local");
  const envLocalHiddenPath = path.join(projectRoot, ".env.local.start-prod-hidden");

  // Recover from a previous run that exited without restoring (e.g. SIGKILL).
  if (!fs.existsSync(envLocalPath) && fs.existsSync(envLocalHiddenPath)) {
    console.warn("[prod-env-guard] Restoring orphaned .env.local from a previous run.");
    fs.renameSync(envLocalHiddenPath, envLocalPath);
  }

  let hidden = false;

  function restore() {
    if (!hidden) return;
    hidden = false;
    try {
      if (fs.existsSync(envLocalHiddenPath)) {
        fs.renameSync(envLocalHiddenPath, envLocalPath);
      }
    } catch (error) {
      console.error("[prod-env-guard] Failed to restore .env.local:", error.message);
    }
  }

  if (fs.existsSync(envLocalPath)) {
    fs.renameSync(envLocalPath, envLocalHiddenPath);
    hidden = true;
  }

  process.on("exit", restore);
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGQUIT"]) {
    process.on(signal, () => {
      restore();
      process.exit(0);
    });
  }
  process.on("uncaughtException", (error) => {
    restore();
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  applyProdEnvGuard,
  ensureCacheMatchesEnv,
  hasGuardFlag,
  stripGuardArgs,
  HIDE_FLAG,
};
