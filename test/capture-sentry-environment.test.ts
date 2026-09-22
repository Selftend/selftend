/**
 * ☠️ **The App Store capture job must not report into production Sentry as a
 * user, and must not turn the gated modules on** (#2726).
 *
 * `src/lib/sentry.ts` reads `EXPO_PUBLIC_APP_ENV ?? "production"`. The capture
 * workflow passed `EXPO_PUBLIC_SENTRY_DSN` and never set the environment, so an
 * iPad simulator on a GitHub runner reported into the production issue stream
 * for weeks. Five App Hang issues arrived in 24 hours on 2026-09-21/22 — all of
 * them that one simulator, one of them *"fully blocked for 11.2–12.0 seconds"* —
 * and because a fresh simulator is created per run, each minted a fresh random
 * user id. `SELFTEND-7` reads **10 users impacted** with an unknown share of
 * them being CI.
 *
 * ⚠️ **The fix has a trap in it, which is the second half of this file.** The
 * same variable feeds `src/lib/env.ts`'s `appEnvName`, and
 * `src/lib/module-visibility.ts` gates CBT, DBT and ACT on it:
 * `MODULE_VISIBLE_APP_ENVS = ["development"]`. Setting it to `development` here
 * would publish the three gated modules as **App Store screenshots** — the exact
 * thing #2446's bar and #2715's guard exist to prevent. ☠️ And #2715's guard is
 * an index-list test in `verify`: it **cannot see a workflow env var**, so
 * nothing would go red. This file is the only thing standing there.
 *
 * Deliberately a text scan rather than a YAML parse, following
 * `workflow-supabase-cli-pin.test.ts`: no YAML parser is a declared dependency
 * and the repo's dependency policy would rather this convention test stayed
 * dependency-free.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { MODULE_VISIBLE_APP_ENVS } from "@/src/lib/module-visibility";

const WORKFLOW = resolve(__dirname, "../.github/workflows/app-store-screenshots.yml");

/** `EXPO_PUBLIC_APP_ENV: capture`, with or without quotes. */
const APP_ENV_LINE = /^\s*EXPO_PUBLIC_APP_ENV:\s*["']?([A-Za-z0-9_-]+)["']?\s*$/m;

function capturedAppEnv(source: string): string | null {
  const match = APP_ENV_LINE.exec(source);
  return match ? match[1] : null;
}

describe("the App Store capture job's Sentry environment", () => {
  const source = readFileSync(WORKFLOW, "utf8");

  it("passes the Sentry DSN, so the environment actually matters", () => {
    // Non-vacuous guard: if the DSN is ever dropped the job stops reporting at
    // all and the assertions below become moot rather than wrong. Failing here
    // is the signal to revisit this file, not to delete it.
    expect(source).toMatch(/EXPO_PUBLIC_SENTRY_DSN:/);
  });

  it("sets EXPO_PUBLIC_APP_ENV, so simulator events are not tagged production", () => {
    // The whole defect: unset means `?? "production"` in src/lib/sentry.ts.
    expect(capturedAppEnv(source)).not.toBeNull();
  });

  it("☠️ does not set it to a value that would show the gated modules", () => {
    // The trap. Any member of MODULE_VISIBLE_APP_ENVS here puts CBT, DBT and ACT
    // into the published screenshots. Read from the real constant rather than a
    // literal, so widening that list cannot quietly make this pass.
    const value = capturedAppEnv(source);
    expect({ value, moduleVisible: MODULE_VISIBLE_APP_ENVS.includes(value ?? "") }).toEqual({
      value,
      moduleVisible: false,
    });
  });

  it("does not claim to be production", () => {
    // `production` would be honest about nothing and would re-create the defect
    // explicitly rather than by omission.
    expect(capturedAppEnv(source)).not.toBe("production");
  });
});

/**
 * ☠️ **The positive controls.** The three assertions above read one real file,
 * so they would pass identically if the regex never matched anything. Each way
 * the guard can fail is driven against a synthetic workflow instead — the
 * probe-per-member shape `registry.test.ts` records, where six stems were
 * matched by no probe at all and a typo in any one would have passed forever.
 */
describe("the capture-environment guard, proved against fixtures", () => {
  it("reads the value off a well-formed line", () => {
    expect(capturedAppEnv("env:\n  EXPO_PUBLIC_APP_ENV: capture\n")).toBe("capture");
  });

  it("reads it through quotes, because YAML allows them", () => {
    expect(capturedAppEnv('env:\n  EXPO_PUBLIC_APP_ENV: "capture"\n')).toBe("capture");
  });

  it("returns null when the variable is absent — the original defect", () => {
    expect(capturedAppEnv("env:\n  EXPO_PUBLIC_SENTRY_DSN: x\n")).toBeNull();
  });

  it("☠️ would catch `development`, the value that leaks gated modules to the store", () => {
    const leaky = "env:\n  EXPO_PUBLIC_APP_ENV: development\n";
    expect(MODULE_VISIBLE_APP_ENVS.includes(capturedAppEnv(leaky) ?? "")).toBe(true);
  });

  it("is not fooled by the variable appearing inside a comment", () => {
    // The workflow's own explanatory comment names this variable several times.
    // A scan that matched those would pass while the real setting was missing.
    expect(capturedAppEnv("  # EXPO_PUBLIC_APP_ENV: development would leak modules\n")).toBeNull();
  });
});
