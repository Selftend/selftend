// Pure port-resolution helpers shared by the dev launchers (android-dev.js,
// start-dev-client.js) and the adb-reverse helper. No side effects.

const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

// Metro/Expo dev-server port: an explicit env override, else a --port/--port= CLI arg, else 8081.
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

// Local Supabase port from SELFTEND_LOCAL_SUPABASE_PORT, or a localhost
// EXPO_PUBLIC_SUPABASE_URL; null when Supabase is remote or unset (nothing to adb-reverse).
function getLocalSupabasePort() {
  if (process.env.SELFTEND_LOCAL_SUPABASE_PORT) {
    return Number(process.env.SELFTEND_LOCAL_SUPABASE_PORT);
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (!LOCALHOST_NAMES.has(parsedUrl.hostname)) return null;
    if (parsedUrl.port) return Number(parsedUrl.port);
    return parsedUrl.protocol === "https:" ? 443 : 80;
  } catch {
    return null;
  }
}

module.exports = { LOCALHOST_NAMES, getLocalSupabasePort, getMetroPort };
