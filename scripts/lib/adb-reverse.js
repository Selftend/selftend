const { spawnSync } = require("node:child_process");

const { getLocalSupabasePort } = require("./ports");

function getConnectedAndroidDevices() {
  const result = spawnSync("adb", ["devices"], { encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) return [];

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
  if (!Number.isFinite(port) || port <= 0) return false;

  const result = spawnSync("adb", ["-s", deviceId, "reverse", `tcp:${port}`, `tcp:${port}`], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status === 0) return true;

  console.warn(`Could not configure adb reverse for ${label} on ${deviceId} port ${port}.`);
  console.warn((result.stderr || result.stdout).trim());
  return false;
}

function reverseDevicePorts(deviceId, metroPort) {
  const ports = [{ label: "Metro", port: metroPort }];
  const localSupabasePort = getLocalSupabasePort();
  if (localSupabasePort) {
    ports.push({ label: "local Supabase", port: localSupabasePort });
  }

  return ports
    .filter(({ label, port }) => reversePort(deviceId, port, label))
    .map(({ label, port }) => `${label}:${port}`);
}

function applyAdbReverseOnce(metroPort, { reapply = false } = {}) {
  if (process.env.SELFTEND_SKIP_ADB_REVERSE === "1") return;

  const devices = getConnectedAndroidDevices();
  if (devices.length === 0) return;

  for (const device of devices) {
    const reversed = reverseDevicePorts(device.id, metroPort);
    if (reversed.length > 0) {
      console.log(
        `${reapply ? "Re-applied" : "Configured"} adb reverse for ${device.id}: ${reversed.join(", ")}`,
      );
    }
  }
}

function startAdbDeviceWatcher(metroPort, { intervalMs = 2500 } = {}) {
  if (process.env.SELFTEND_SKIP_ADB_REVERSE === "1") return null;

  const known = new Set(getConnectedAndroidDevices().map((device) => device.id));

  const interval = setInterval(() => {
    const devices = getConnectedAndroidDevices();
    const currentIds = new Set(devices.map((device) => device.id));

    // Forget devices that disconnected so a future reconnect re-applies the reverses.
    for (const id of [...known]) {
      if (!currentIds.has(id)) known.delete(id);
    }

    // Apply reverses to devices that just came online.
    for (const device of devices) {
      if (!known.has(device.id)) {
        known.add(device.id);
        const reversed = reverseDevicePorts(device.id, metroPort);
        if (reversed.length > 0) {
          console.log(`Re-applied adb reverse for ${device.id}: ${reversed.join(", ")}`);
        }
      }
    }
  }, intervalMs);

  interval.unref?.();
  return interval;
}

module.exports = {
  applyAdbReverseOnce,
  startAdbDeviceWatcher,
};
