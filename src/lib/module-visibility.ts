import { Platform } from "react-native";

import { appEnv } from "@/src/lib/env";

/**
 * Whether this build shows the three modules (CBT, ACT, DBT), and whether it calls them
 * beta.
 *
 * **The shape, in one line: Android and web always show them, labelled beta; iOS shows
 * them only in a dev build.**
 *
 * ☠️ **This gate reverses a decision the repo had written down in three places, and it
 * was added on an explicit instruction rather than discovered as a bug.** Until now the
 * modules section rendered *unconditionally*, and `CONTEXT.md` gave the reason: "a Home
 * that shows the tools without the method is the inventory `docs/positioning.md`
 * forbids". DBT shipped in v0.18.0, ACT stopped being a placeholder before it, and CBT
 * is the module `sanitizeEnabledModules` force-inserts into every account. None of that
 * was an accident, so none of it is safe to quietly re-derive later: if this gate is
 * ever removed, the docs it changed have to come back with it.
 *
 * ✅ **Narrowing it to iOS repaired most of what the first draft cost.** A gate that hid
 * modules on every production build put `positioning.md` clause 1 in breach everywhere
 * and left the Play listing and the landing page promising a programme the app did not
 * ship. Android and web now keep the method on Home, so the breach is confined to iOS —
 * and only the App Store surfaces still overstate what their platform delivers.
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
 * The environments an **iOS** build must be in to show modules. `development` only —
 * `preview` is excluded, so an internal-distribution iOS build cannot reach a module on a
 * real device.
 */
export const MODULE_VISIBLE_APP_ENVS = ["development"];

/**
 * ☠️ **The gate is iOS-only, and every other platform is unconditional.** Android and web
 * show the three modules in every build, labelled beta ({@link modulesAreBeta}); iOS
 * shows them only in a dev build. That asymmetry is the instruction, and it is worth
 * stating why it matters beyond iOS: it is what keeps `docs/positioning.md` clause 1 —
 * "no surface presents the tools without the method" — **satisfied on Android and web**,
 * because the method is still on Home there. Only iOS production breaches it.
 *
 * `isDev` is the Metro/debug bundle. `appEnvName` is the EAS environment baked into the
 * bundle at build time, which is what an installed `development`-profile build has while
 * running its own release bundle with `__DEV__` false. Either is enough on iOS.
 *
 * An unset `appEnvName` reads as production, so an iOS build told nothing hides — the
 * fail-safe direction for a visibility gate.
 */
export function shouldShowModules(appEnvName: string, isDev: boolean, platform: string): boolean {
  if (platform !== "ios") {
    return true;
  }

  return isDev || MODULE_VISIBLE_APP_ENVS.includes(appEnvName);
}

/**
 * Whether a visible module is labelled **beta**.
 *
 * ☠️ Beta is a property of the **modules**, not of the platform, so this is deliberately
 * not a second platform branch. The instruction said "beta for Android and web", and
 * that is exactly what this produces in the field: those are the platforms where a *user*
 * can reach a module at all, since iOS shows them only in a dev build. Making it
 * `platform !== "ios"` would say something different and worse — that the same three
 * modules are beta or not depending on where you stand, and that an iOS dev build should
 * present them as finished while Android calls them beta.
 *
 * A separate function from {@link shouldShowModules} even though it currently returns a
 * constant: the two answer different questions, and the day beta is lifted is not the day
 * the iOS gate opens.
 */
export function modulesAreBeta(): boolean {
  return true;
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
  return shouldShowModules(appEnv.appEnvName, __DEV__, Platform.OS);
}
