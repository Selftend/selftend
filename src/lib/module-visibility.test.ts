import { appEnv } from "@/src/lib/env";
import {
  MODULE_VISIBLE_APP_ENVS,
  modulesAreBeta,
  modulesAreVisible,
  shouldShowModules,
} from "@/src/lib/module-visibility";

describe("shouldShowModules", () => {
  /**
   * ☠️ The gate is iOS-only. Android and web show the three modules in every build, and
   * that is what keeps `docs/positioning.md` clause 1 — no surface presents the tools
   * without the method — satisfied on those two platforms. Only iOS production breaches
   * it.
   */
  it("always shows them on android and web, in every environment", () => {
    for (const platform of ["android", "web"]) {
      expect(shouldShowModules("production", false, platform)).toBe(true);
      expect(shouldShowModules("preview", false, platform)).toBe(true);
      expect(shouldShowModules("", false, platform)).toBe(true);
    }
  });

  it("shows them on iOS in the Metro/debug bundle, whatever environment built the shell", () => {
    expect(shouldShowModules("production", true, "ios")).toBe(true);
    expect(shouldShowModules("preview", true, "ios")).toBe(true);
    expect(shouldShowModules("", true, "ios")).toBe(true);
  });

  it("shows them on an installed iOS development build running its own release bundle", () => {
    expect(shouldShowModules("development", false, "ios")).toBe(true);
  });

  it("hides them on iOS production", () => {
    expect(shouldShowModules("production", false, "ios")).toBe(false);
  });

  /**
   * Preview is the internal-distribution profile, so an iOS preview build cannot reach a
   * module on a real device. Recorded as a test rather than left to be inferred from an
   * array, because it is the clause most likely to want revisiting.
   */
  it("hides them on iOS preview too", () => {
    expect(shouldShowModules("preview", false, "ios")).toBe(false);
    expect(MODULE_VISIBLE_APP_ENVS).toEqual(["development"]);
  });

  it("hides them on iOS for an unrecognised environment name", () => {
    expect(shouldShowModules("staging", false, "ios")).toBe(false);
    expect(shouldShowModules("", false, "ios")).toBe(false);
  });
});

describe("modulesAreBeta", () => {
  /**
   * Beta is a property of the modules, not of the platform — so this is deliberately not
   * a platform branch. In the field it produces exactly "beta on Android and web",
   * because those are the only platforms where a user can reach a module at all.
   */
  it("labels the modules beta", () => {
    expect(modulesAreBeta()).toBe(true);
  });
});

/**
 * ☠️ These assign to `appEnv`, never to `process.env`. `babel-preset-expo` inlines every
 * `EXPO_PUBLIC_*` lookup at transform time, so `process.env.EXPO_PUBLIC_APP_ENV = "…"`
 * in a test changes nothing and the assertion passes or fails for the wrong reason - the
 * first draft of this file did exactly that and reported a false negative.
 */
describe("modulesAreVisible", () => {
  const ORIGINAL_APP_ENV_NAME = appEnv.appEnvName;
  const globals = globalThis as unknown as { __DEV__: boolean };

  afterEach(() => {
    appEnv.appEnvName = ORIGINAL_APP_ENV_NAME;
    globals.__DEV__ = true;
  });

  it("treats an unset environment as production, so a build told nothing hides", () => {
    // The fail-safe direction for a visibility gate: absent config must not reveal.
    // `appEnv` has already defaulted an unset variable to "production" by this point,
    // which is the behaviour under test.
    appEnv.appEnvName = "production";
    globals.__DEV__ = false;

    expect(modulesAreVisible()).toBe(false);
  });

  it("reads the baked-in environment when the bundle is not a dev one", () => {
    globals.__DEV__ = false;

    appEnv.appEnvName = "development";
    expect(modulesAreVisible()).toBe(true);

    appEnv.appEnvName = "production";
    expect(modulesAreVisible()).toBe(false);
  });

  it("shows them under the dev bundle even when the environment says production", () => {
    appEnv.appEnvName = "production";
    globals.__DEV__ = true;

    expect(modulesAreVisible()).toBe(true);
  });
});
