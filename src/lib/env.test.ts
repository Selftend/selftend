/**
 * env.ts is evaluated at module-load time (top-level `const appEnv = ...`), so we
 * must re-require it inside each isolated block AFTER setting process.env.
 *
 * `validateRequiredEnv` reads `Platform.OS` at call-time (not load-time), so we
 * can set Platform.OS BEFORE calling it - without resetting modules - as long as
 * we re-load env.ts with the env vars we want first.
 */

import { Platform } from "react-native";

// Capture the original env so we can restore it after each test.
const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  // Restore Platform.OS to the jest-expo default (ios).
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    value: "ios",
  });
  jest.resetModules();
});

// ---------------------------------------------------------------------------
// appEnv.supabaseKey precedence
// ---------------------------------------------------------------------------

describe("appEnv.supabaseKey", () => {
  it("uses EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY when set", () => {
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk-key";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    jest.resetModules();

    const { appEnv } = require("@/src/lib/env") as typeof import("@/src/lib/env");

    expect(appEnv.supabaseKey).toBe("pk-key");
  });

  it("falls back to EXPO_PUBLIC_SUPABASE_ANON_KEY when publishable key is absent", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    jest.resetModules();
    const { appEnv } = require("@/src/lib/env") as typeof import("@/src/lib/env");

    expect(appEnv.supabaseKey).toBe("anon-key");
  });

  it("is an empty string when neither key is set", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    jest.resetModules();
    const { appEnv } = require("@/src/lib/env") as typeof import("@/src/lib/env");

    expect(appEnv.supabaseKey).toBe("");
  });
});

// ---------------------------------------------------------------------------
// hasSupabaseConfig
// ---------------------------------------------------------------------------

describe("hasSupabaseConfig", () => {
  it("is true when both supabaseUrl and supabaseKey are present", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk-key";

    jest.resetModules();
    const { hasSupabaseConfig } = require("@/src/lib/env") as typeof import("@/src/lib/env");

    expect(hasSupabaseConfig).toBe(true);
  });

  it("is false when supabaseUrl is absent", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk-key";

    jest.resetModules();
    const { hasSupabaseConfig } = require("@/src/lib/env") as typeof import("@/src/lib/env");

    expect(hasSupabaseConfig).toBe(false);
  });

  it("is false when supabaseKey is absent", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    jest.resetModules();
    const { hasSupabaseConfig } = require("@/src/lib/env") as typeof import("@/src/lib/env");

    expect(hasSupabaseConfig).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateRequiredEnv - warn / error branches
//
// Strategy: set env vars, resetModules, require env.ts (so appEnv is baked in
// with the right values), then set Platform.OS BEFORE calling validateRequiredEnv
// (Platform.OS is a live read inside the function body - not captured at load time).
// ---------------------------------------------------------------------------

describe("validateRequiredEnv", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls console.error when supabaseUrl is missing", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";

    jest.resetModules();
    const { validateRequiredEnv } = require("@/src/lib/env") as typeof import("@/src/lib/env");

    validateRequiredEnv();

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("EXPO_PUBLIC_SUPABASE_URL"));
  });

  it("calls console.error when supabaseKey is missing", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    jest.resetModules();
    const { validateRequiredEnv } = require("@/src/lib/env") as typeof import("@/src/lib/env");

    validateRequiredEnv();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    );
  });

  it("calls console.warn on web when publicAppUrl is missing and not production", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";
    delete process.env.EXPO_PUBLIC_PUBLIC_APP_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    jest.resetModules();
    const { validateRequiredEnv } = require("@/src/lib/env") as typeof import("@/src/lib/env");

    // Set Platform.OS on the freshly-required react-native's Platform object.
    // env.ts reads Platform.OS at call-time from its own require("react-native").
    // We must get that same module instance and mutate it.
    const { Platform: freshPlatform } = require("react-native") as typeof import("react-native");
    Object.defineProperty(freshPlatform, "OS", { configurable: true, value: "web" });

    validateRequiredEnv();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("EXPO_PUBLIC_PUBLIC_APP_URL"),
    );
  });

  it("calls console.error (not warn) on web when publicAppUrl is missing in production", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";
    delete process.env.EXPO_PUBLIC_PUBLIC_APP_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    jest.resetModules();
    const { validateRequiredEnv } = require("@/src/lib/env") as typeof import("@/src/lib/env");
    const { Platform: freshPlatform } = require("react-native") as typeof import("react-native");
    Object.defineProperty(freshPlatform, "OS", { configurable: true, value: "web" });

    validateRequiredEnv();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("EXPO_PUBLIC_PUBLIC_APP_URL"),
    );
    // The production branch returns early after error - the warn message for
    // EXPO_PUBLIC_PUBLIC_APP_URL should NOT be called.
    const warnCalls = (console.warn as jest.Mock).mock.calls.map((c) => c[0] as string);
    const appUrlWarn = warnCalls.find((m) => m.includes("EXPO_PUBLIC_PUBLIC_APP_URL"));
    expect(appUrlWarn).toBeUndefined();
  });

  it("calls console.warn on web production when vapid key is missing", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";
    process.env.EXPO_PUBLIC_PUBLIC_APP_URL = "https://app.example.com";
    delete process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    jest.resetModules();
    const { validateRequiredEnv } = require("@/src/lib/env") as typeof import("@/src/lib/env");
    const { Platform: freshPlatform } = require("react-native") as typeof import("react-native");
    Object.defineProperty(freshPlatform, "OS", { configurable: true, value: "web" });

    validateRequiredEnv();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY"),
    );
  });

  it("emits no errors or warnings when all required env vars are present on native", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";
    process.env.EXPO_PUBLIC_PUBLIC_APP_URL = "https://app.example.com";
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    // Platform.OS stays "ios" by default

    jest.resetModules();
    const { validateRequiredEnv } = require("@/src/lib/env") as typeof import("@/src/lib/env");

    validateRequiredEnv();

    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });
});
