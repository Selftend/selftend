const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const DEFAULT_AVD_NAME = "Selftend_API_35";
const DEV_CLIENT_SCHEME = "selftend-dev";
const DEV_ANDROID_PACKAGE = "org.vasilyoshev.selftend.dev";
const AVD_NAME = process.env.SELFTEND_ANDROID_AVD || DEFAULT_AVD_NAME;
const BOOT_TIMEOUT_MS = Number(process.env.SELFTEND_ANDROID_BOOT_TIMEOUT_MS || 240000);
const METRO_TIMEOUT_MS = Number(process.env.SELFTEND_METRO_TIMEOUT_MS || 120000);
const POLL_INTERVAL_MS = 3000;
const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

const controlArgs = new Set(["--list-avds"]);
const rawArgs = process.argv.slice(2);
const shouldListAvds = rawArgs.includes("--list-avds");
const expoArgs = rawArgs.filter((arg) => !controlArgs.has(arg));
const metroPort = getMetroPort(expoArgs);
const localSupabasePort = getLocalSupabasePort();

const isWindows = process.platform === "win32";
const exeSuffix = isWindows ? ".exe" : "";

function getSdkRoot() {
  const configuredRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;

  if (configuredRoot) {
    return configuredRoot;
  }

  if (isWindows && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, "Android", "Sdk");
  }

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Android", "sdk");
  }

  return path.join(os.homedir(), "Android", "Sdk");
}

const sdkRoot = getSdkRoot();

function resolveAndroidTool(directory, name) {
  const toolPath = path.join(sdkRoot, directory, `${name}${exeSuffix}`);

  if (fs.existsSync(toolPath)) {
    return toolPath;
  }

  return name;
}

const adb = resolveAndroidTool("platform-tools", "adb");
const emulator = resolveAndroidTool("emulator", "emulator");

function getMetroPort(args) {
  const configuredPort =
    process.env.SELFTEND_METRO_PORT || process.env.RCT_METRO_PORT || process.env.EXPO_PACKAGER_PORT;

  if (configuredPort) {
    return Number(configuredPort);
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--port" && args[index + 1]) {
      return Number(args[index + 1]);
    }

    if (arg.startsWith("--port=")) {
      return Number(arg.slice("--port=".length));
    }
  }

  return 8081;
}

function getLocalSupabasePort() {
  if (process.env.SELFTEND_LOCAL_SUPABASE_PORT) {
    return Number(process.env.SELFTEND_LOCAL_SUPABASE_PORT);
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(supabaseUrl);

    if (!LOCALHOST_NAMES.has(parsedUrl.hostname)) {
      return null;
    }

    if (parsedUrl.port) {
      return Number(parsedUrl.port);
    }

    return parsedUrl.protocol === "https:" ? 443 : 80;
  } catch {
    return null;
  }
}

function runCapture(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    env: buildEnv(),
    windowsHide: true,
  });
}

function buildEnv() {
  const androidPathEntries = [
    path.join(sdkRoot, "platform-tools"),
    path.join(sdkRoot, "emulator"),
    path.join(sdkRoot, "cmdline-tools", "latest", "bin"),
  ].filter((entry) => fs.existsSync(entry));
  const env = {
    ...process.env,
    ANDROID_HOME: sdkRoot,
    ANDROID_SDK_ROOT: sdkRoot,
    SELFTEND_APP_VARIANT: "development",
  };
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") || "PATH";
  const oldPath = env[pathKey] || "";

  for (const key of Object.keys(env)) {
    if (key !== pathKey && key.toLowerCase() === "path") {
      delete env[key];
    }
  }

  env[pathKey] = `${androidPathEntries.join(path.delimiter)}${path.delimiter}${oldPath}`;

  return env;
}

function requireTool(result, toolName) {
  if (!result.error) {
    return;
  }

  console.error(`Could not run ${toolName}.`);
  console.error(`Checked Android SDK root: ${sdkRoot}`);
  console.error("Make sure Android Studio installed the SDK and ANDROID_HOME points to it.");
  process.exit(1);
}

function getAvds() {
  const result = runCapture(emulator, ["-list-avds"]);
  requireTool(result, "emulator");

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function printAvds() {
  const avds = getAvds();

  if (avds.length === 0) {
    console.log("No Android virtual devices found.");
    console.log("Create one in Android Studio > More Actions > Virtual Device Manager.");
    return;
  }

  console.log(avds.join("\n"));
}

function getDevices() {
  const result = runCapture(adb, ["devices", "-l"]);
  requireTool(result, "adb");

  return result.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, state] = line.split(/\s+/);
      return { id, state, line };
    });
}

function getReadyEmulator() {
  return getDevices().find((device) => device.state === "device" && isEmulator(device.id));
}

function isEmulator(deviceId) {
  return deviceId.startsWith("emulator-");
}

function isBootComplete(deviceId) {
  if (!isEmulator(deviceId)) {
    return true;
  }

  const result = runCapture(adb, ["-s", deviceId, "shell", "getprop", "sys.boot_completed"]);

  return result.status === 0 && result.stdout.trim() === "1";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForTcpPort(port, timeoutMs) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ host: "127.0.0.1", port });

      socket.once("connect", () => {
        socket.end();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();

        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for Metro on 127.0.0.1:${port}.`));
          return;
        }

        setTimeout(tryConnect, 1000);
      });
    };

    tryConnect();
  });
}

function startEmulator() {
  const avds = getAvds();

  if (!avds.includes(AVD_NAME)) {
    console.error(`Android virtual device "${AVD_NAME}" was not found.`);
    console.error(`Available devices: ${avds.length ? avds.join(", ") : "(none)"}`);
    console.error("Set SELFTEND_ANDROID_AVD to use a different emulator name.");
    process.exit(1);
  }

  console.log(`Starting Android emulator "${AVD_NAME}"...`);

  const child = spawn(emulator, ["-avd", AVD_NAME], {
    detached: true,
    env: buildEnv(),
    stdio: "ignore",
    windowsHide: false,
  });

  child.unref();
}

async function waitForReadyEmulator() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < BOOT_TIMEOUT_MS) {
    const device = getReadyEmulator();

    if (device && isBootComplete(device.id)) {
      return device;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  console.error("Timed out waiting for Android emulator to finish booting.");
  console.error(
    "Open Android Studio > Virtual Device Manager and start the emulator manually, then try again.",
  );
  process.exit(1);
}

function reverseTcpPort(deviceId, port, label) {
  const result = runCapture(adb, ["-s", deviceId, "reverse", `tcp:${port}`, `tcp:${port}`]);

  if (result.status !== 0) {
    console.warn(`Could not configure adb reverse for ${label} on port ${port}.`);
    console.warn((result.stderr || result.stdout).trim());
  }
}

function isDevelopmentClientInstalled(deviceId) {
  const result = runCapture(adb, ["-s", deviceId, "shell", "pm", "path", DEV_ANDROID_PACKAGE]);

  return result.status === 0 && result.stdout.trim().startsWith("package:");
}

function openDevelopmentClient(deviceId) {
  if (!isDevelopmentClientInstalled(deviceId)) {
    console.warn(`Selftend Dev is not installed on ${deviceId}.`);
    console.warn("Install the latest development build, then rerun this command.");
    return;
  }

  reverseTcpPort(deviceId, metroPort, "Metro");

  if (localSupabasePort) {
    reverseTcpPort(deviceId, localSupabasePort, "local Supabase");
  }

  const manifestUrl = `http://127.0.0.1:${metroPort}`;
  const devClientUrl = `${DEV_CLIENT_SCHEME}://expo-development-client/?url=${encodeURIComponent(
    manifestUrl,
  )}`;
  const result = runCapture(adb, [
    "-s",
    deviceId,
    "shell",
    "am",
    "start",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    devClientUrl,
  ]);

  if (result.status !== 0) {
    console.warn("Could not open Selftend Dev automatically.");
    console.warn((result.stderr || result.stdout).trim());
    console.warn(`Open Selftend Dev manually and connect to ${manifestUrl}.`);
    return;
  }

  console.log(`Opened Selftend Dev with ${manifestUrl}`);
}

async function launchDevelopmentClientWhenReady(deviceId) {
  try {
    await waitForTcpPort(metroPort, METRO_TIMEOUT_MS);
    openDevelopmentClient(deviceId);
  } catch (error) {
    console.warn(error.message);
    console.warn("Open Selftend Dev manually after Metro finishes starting.");
  }
}

function startExpo(deviceId) {
  const expoCliPath = path.join(process.cwd(), "node_modules", "expo", "bin", "cli");
  const args = [expoCliPath, "start", "--dev-client", ...expoArgs];

  const child = spawn(process.execPath, args, {
    env: buildEnv(),
    stdio: "inherit",
  });

  launchDevelopmentClientWhenReady(deviceId);

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

async function main() {
  if (shouldListAvds) {
    printAvds();
    return;
  }

  const connectedEmulator = getReadyEmulator();

  let activeEmulator = connectedEmulator;

  if (activeEmulator && isBootComplete(activeEmulator.id)) {
    console.log(`Using connected Android emulator: ${activeEmulator.id}`);
  } else {
    if (activeEmulator) {
      console.log(`Waiting for Android emulator to finish booting: ${activeEmulator.id}`);
    } else {
      startEmulator();
    }

    activeEmulator = await waitForReadyEmulator();
    console.log(`Android emulator is ready: ${activeEmulator.id}`);
  }

  startExpo(activeEmulator.id);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
