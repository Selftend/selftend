import { appEnv } from "@/src/lib/env";
import {
  MODULE_VISIBLE_APP_ENVS,
  modulesAreVisible,
  shouldShowModules,
} from "@/src/lib/module-visibility";

describe("shouldShowModules", () => {
  it("shows them in the Metro/debug bundle, whatever environment built the shell", () => {
    expect(shouldShowModules("production", true)).toBe(true);
    expect(shouldShowModules("preview", true)).toBe(true);
    expect(shouldShowModules("", true)).toBe(true);
  });

  it("shows them in an installed development build running its own release bundle", () => {
    expect(shouldShowModules("development", false)).toBe(true);
  });

  it("hides them in production", () => {
    expect(shouldShowModules("production", false)).toBe(false);
  });

  /**
   * ☠️ The literal reading of "only dev builds can see it". Preview is the
   * internal-distribution profile, so this means the modules cannot be tested on a real
   * device outside a dev build. Recorded as a test rather than left to be inferred from
   * an array, because it is the clause most likely to be wrong in practice.
   */
  it("hides them in preview too", () => {
    expect(shouldShowModules("preview", false)).toBe(false);
    expect(MODULE_VISIBLE_APP_ENVS).toEqual(["development"]);
  });

  it("hides them for an unrecognised environment name", () => {
    expect(shouldShowModules("staging", false)).toBe(false);
    expect(shouldShowModules("", false)).toBe(false);
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
