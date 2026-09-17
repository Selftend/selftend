import { appEnv } from "@/src/lib/env";

/**
 * Whether this build shows the three modules (CBT, ACT, DBT) at all.
 *
 * ☠️ **This gate reverses a decision the repo had written down in three places, and it
 * was added on an explicit instruction rather than discovered as a bug.** Until now the
 * modules section rendered *unconditionally*, and `CONTEXT.md` gave the reason: "a Home
 * that shows the tools without the method is the inventory `docs/positioning.md`
 * forbids". DBT shipped in v0.18.0, ACT stopped being a placeholder before it, and CBT
 * is the module `sanitizeEnabledModules` force-inserts into every account. None of that
 * was an accident, so none of it is safe to quietly re-derive later: if this gate is
 * ever removed, the three docs it changed have to come back with it.
 *
 * What it does NOT do, deliberately:
 *
 * - **It does not touch the database.** Every `*_program_*` column, every `act_*` and
 *   `dbt_*` table and every thought record stays exactly where it was. A person who
 *   used a module on a shipped build still owns those rows, and they still leave
 *   through export and deletion - hiding a surface must never strand data a person can
 *   no longer reach or erase.
 * - **It does not uninstall anything.** The routes and screens are still in the bundle;
 *   they are unreachable, not absent. Making them absent is a bundler concern and a
 *   much larger change.
 *
 * `enabled_modules` is deliberately not the mechanism. That column looks like the right
 * lever and is not one: it is inert (nothing reads it to decide anything), it is
 * per-account rather than per-build, and it is force-seeded with `cbt` - so a person who
 * has it set would still see CBT in production. A build-level gate is what "only dev
 * builds" asks for.
 */

/**
 * The environments that show modules. `development` only, per the instruction that
 * reversed this - **`preview` is deliberately excluded and that is worth re-reading**:
 * preview is the internal-distribution profile, so a preview build on a real device can
 * no longer reach a module at all, and the modules cannot be device-tested outside a
 * dev build. That is the literal ask; widen this array if it proves wrong in practice.
 */
export const MODULE_VISIBLE_APP_ENVS = ["development"];

/**
 * The pure form, so the decision can be tested without re-requiring the module to move
 * `__DEV__` and `process.env` around. Mirrors `shouldEnableSentry(dsn, isDev)`.
 *
 * `isDev` is the Metro/debug bundle - a contributor running `npm start`, whatever
 * profile installed the shell around it. `appEnvName` is the EAS environment baked into
 * the bundle at build time, which is what an installed `development`-profile build has
 * when it is running its own release bundle with `__DEV__` false.
 *
 * Either one is enough. An unset `appEnvName` must read as production, which is why the
 * caller below defaults it rather than passing `undefined` through: the fail-safe
 * direction for a visibility gate is hidden, so a build that was told nothing hides.
 */
export function shouldShowModules(appEnvName: string, isDev: boolean): boolean {
  return isDev || MODULE_VISIBLE_APP_ENVS.includes(appEnvName);
}

/**
 * {@link shouldShowModules} against this build's own globals.
 *
 * Reads `appEnv.appEnvName` rather than `process.env.EXPO_PUBLIC_APP_ENV` directly:
 * `babel-preset-expo` inlines every `EXPO_PUBLIC_*` lookup at transform time, so a read
 * written here would be frozen to a literal and no test could move it. `appEnv` does the
 * lookup once, in the one place this repo already keeps it.
 */
export function modulesAreVisible(): boolean {
  return shouldShowModules(appEnv.appEnvName, __DEV__);
}
