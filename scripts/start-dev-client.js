const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const expoCliPath = path.join(process.cwd(), "node_modules", "expo", "bin", "cli");
const expoArgs = process.argv.slice(2);
const args = [expoCliPath, "start", "--dev-client", ...expoArgs];

const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

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

function getConnectedAndroidDevices() {
  const result = spawnSync("adb", ["devices"], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, state] = line.split(/\s+/);
      return { id, state };
    })
    .filter((device) => device.id && device.state === "device");
}

function reversePort(deviceId, port, label) {
  if (!Number.isFinite(port) || port <= 0) {
    return false;
  }

  const result = spawnSync("adb", ["-s", deviceId, "reverse", `tcp:${port}`, `tcp:${port}`], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status === 0) {
    return true;
  }

  console.warn(`Could not configure adb reverse for ${label} on ${deviceId} port ${port}.`);
  console.warn((result.stderr || result.stdout).trim());
  return false;
}

function configureAdbReverse() {
  if (process.env.SELFTEND_SKIP_ADB_REVERSE === "1") {
    return;
  }

  const devices = getConnectedAndroidDevices();

  if (devices.length === 0) {
    return;
  }

  const ports = [{ label: "Metro", port: getPort(expoArgs) }];
  const localSupabasePort = getLocalSupabasePort();

  if (localSupabasePort) {
    ports.push({ label: "local Supabase", port: localSupabasePort });
  }

  for (const device of devices) {
    const reversedLabels = ports
      .filter(({ label, port }) => reversePort(device.id, port, label))
      .map(({ label, port }) => `${label}:${port}`);

    if (reversedLabels.length > 0) {
      console.log(`Configured adb reverse for ${device.id}: ${reversedLabels.join(", ")}`);
    }
  }
}

configureAdbReverse();

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
