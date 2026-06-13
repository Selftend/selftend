const { getMetroPort, getLocalSupabasePort, parsePort } = require("./ports");

const PORT_ENV_KEYS = [
  "SELFTEND_METRO_PORT",
  "RCT_METRO_PORT",
  "EXPO_PACKAGER_PORT",
  "SELFTEND_LOCAL_SUPABASE_PORT",
  "EXPO_PUBLIC_SUPABASE_URL",
];

describe("scripts/lib/ports", () => {
  let savedEnv;

  beforeEach(() => {
    savedEnv = {};
    for (const key of PORT_ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of PORT_ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  describe("parsePort", () => {
    it("accepts valid TCP ports", () => {
      expect(parsePort("8081")).toBe(8081);
      expect(parsePort(443)).toBe(443);
      expect(parsePort("65535")).toBe(65535);
      expect(parsePort("1")).toBe(1);
    });

    it("rejects malformed / out-of-range values as null (never NaN)", () => {
      for (const bad of ["", "abc", "0", "-1", "99999", "8081.5", null, undefined, "  "]) {
        expect(parsePort(bad)).toBeNull();
      }
    });
  });

  describe("getMetroPort", () => {
    it("uses a valid env override", () => {
      process.env.SELFTEND_METRO_PORT = "19000";
      expect(getMetroPort([])).toBe(19000);
    });

    it("falls through a malformed env override to the default instead of returning NaN", () => {
      process.env.SELFTEND_METRO_PORT = "not-a-port";
      expect(getMetroPort([])).toBe(8081);
    });

    it("reads a valid --port / --port= CLI arg", () => {
      expect(getMetroPort(["--port", "8090"])).toBe(8090);
      expect(getMetroPort(["--port=8091"])).toBe(8091);
    });

    it("ignores a malformed CLI port and uses the default", () => {
      expect(getMetroPort(["--port", "abc"])).toBe(8081);
      expect(getMetroPort(["--port=999999"])).toBe(8081);
    });

    it("defaults to 8081 when nothing is configured", () => {
      expect(getMetroPort([])).toBe(8081);
    });
  });

  describe("getLocalSupabasePort", () => {
    it("uses a valid env override", () => {
      process.env.SELFTEND_LOCAL_SUPABASE_PORT = "54321";
      expect(getLocalSupabasePort()).toBe(54321);
    });

    it("falls through a malformed env override to URL detection instead of returning NaN", () => {
      process.env.SELFTEND_LOCAL_SUPABASE_PORT = "garbage";
      process.env.EXPO_PUBLIC_SUPABASE_URL = "http://localhost:54321";
      expect(getLocalSupabasePort()).toBe(54321);
    });

    it("derives the port from a localhost URL", () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
      expect(getLocalSupabasePort()).toBe(54321);
    });

    it("returns null for a remote Supabase URL", () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
      expect(getLocalSupabasePort()).toBeNull();
    });

    it("returns null when nothing is configured", () => {
      expect(getLocalSupabasePort()).toBeNull();
    });
  });
});
