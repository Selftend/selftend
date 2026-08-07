const { spawn } = require("node:child_process");
const path = require("node:path");

const { applyAdbReverseOnce, startAdbDeviceWatcher } = require("./lib/adb-reverse");
const { ensureLocalDbRunning } = require("./lib/local-db");
const { getMetroPort } = require("./lib/ports");
const {
  applyProdEnvGuard,
  ensureCacheMatchesEnv,
  hasGuardFlag,
  stripGuardArgs,
} = require("./lib/prod-env-guard");

const rawArgs = process.argv.slice(2);

if (hasGuardFlag(rawArgs)) {
  applyProdEnvGuard();
}

ensureCacheMatchesEnv();

const expoArgs = stripGuardArgs(rawArgs);
const expoCliPath = path.join(process.cwd(), "node_modules", "expo", "bin", "cli");
const args = [expoCliPath, "start", "--dev-client", ...expoArgs];

const metroPort = getMetroPort(expoArgs);

async function main() {
  await ensureLocalDbRunning();

  applyAdbReverseOnce(metroPort);
  startAdbDeviceWatcher(metroPort);

  const child = spawn(process.execPath, args, {
    env: {
      ...process.env,
      EXPO_NO_DOTENV: "1",
      SELFTEND_APP_VARIANT: "development",
    },
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
