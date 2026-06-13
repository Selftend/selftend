// Pure port-resolution helpers shared by the dev launchers (android-dev.js,
// start-dev-client.js) and the adb-reverse helper. No side effects.

const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

// Parse a port-like value to a valid TCP port (integer 1..65535), or null if it
// isn't one. Without this, a malformed env/CLI value (e.g. "" -> NaN, "abc" -> NaN,
// "0", "99999") would propagate as NaN/garbage into Metro and `adb reverse`, which
// then fail opaquely. Callers treat null as "not configured here" and fall through.
function parsePort(value) {
  if (value === undefined || value === null || value === "") return null;
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
}

// Metro/Expo dev-server port: an explicit env override, else a --port/--port= CLI arg, else 8081.
function getMetroPort(args) {
  const envPort = parsePort(
    process.env.SELFTEND_METRO_PORT || process.env.RCT_METRO_PORT || process.env.EXPO_PACKAGER_PORT,
  );
  if (envPort !== null) return envPort;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--port" && args[index + 1]) {
      const cliPort = parsePort(args[index + 1]);
      if (cliPort !== null) return cliPort;
    }

    if (arg.startsWith("--port=")) {
      const cliPort = parsePort(arg.slice("--port=".length));
      if (cliPort !== null) return cliPort;
    }
  }

  return 8081;
}

// Local Supabase port from SELFTEND_LOCAL_SUPABASE_PORT, or a localhost
// EXPO_PUBLIC_SUPABASE_URL; null when Supabase is remote or unset (nothing to adb-reverse).
function getLocalSupabasePort() {
  const envPort = parsePort(process.env.SELFTEND_LOCAL_SUPABASE_PORT);
  if (envPort !== null) return envPort;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (!LOCALHOST_NAMES.has(parsedUrl.hostname)) return null;
    if (parsedUrl.port) return parsePort(parsedUrl.port);
    return parsedUrl.protocol === "https:" ? 443 : 80;
  } catch {
    return null;
  }
}

module.exports = { LOCALHOST_NAMES, getLocalSupabasePort, getMetroPort, parsePort };
