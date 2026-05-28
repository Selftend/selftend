const { applyAdbReverseOnce, getConnectedAndroidDevices } = require("./lib/adb-reverse");

const metroPort = Number(
  process.env.SELFTEND_METRO_PORT ||
    process.env.RCT_METRO_PORT ||
    process.env.EXPO_PACKAGER_PORT ||
    8081,
);

const devices = getConnectedAndroidDevices();
if (devices.length === 0) {
  console.error("No connected Android devices. Plug one in or start an emulator first.");
  process.exit(1);
}

applyAdbReverseOnce(metroPort, { reapply: true });
