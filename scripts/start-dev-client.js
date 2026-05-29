const { spawn } = require("node:child_process");
const path = require("node:path");

const { applyAdbReverseOnce, startAdbDeviceWatcher } = require("./lib/adb-reverse");
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

function getPort(argsToParse) {
  const configuredPort =
    process.env.SELFTEND_METRO_PORT || process.env.RCT_METRO_PORT || process.env.EXPO_PACKAGER_PORT;

  if (configuredPort) {
    return Number(configuredPort);
  }

  for (let index = 0; index < argsToParse.length; index += 1) {
    const arg = argsToParse[index];

    if (arg === "--port" && argsToParse[index + 1]) {
      return Number(argsToParse[index + 1]);
    }

    if (arg.startsWith("--port=")) {
      return Number(arg.slice("--port=".length));
    }
  }

  return 8081;
}

const metroPort = getPort(expoArgs);

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
