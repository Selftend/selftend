import { Redirect, Slot } from "expo-router";

import { modulesAreVisible } from "@/src/lib/module-visibility";

/**
 * The route half of the module gate (2026-09-17, owner instruction).
 *
 * Hiding the entry points is not enough on its own: `/modules/cbt` is a real URL on the
 * web build, so a build that only dropped the Home section would still serve every module
 * to anyone who typed, bookmarked or was linked one. This layout is the choke point —
 * every module screen is nested under it, so one redirect covers all 80 of the
 * `<Stack.Screen name="modules/…">` routes registered in `protected-layout.tsx` without
 * touching any of them.
 *
 * ☠️ **It redirects; it does not 404.** Three live things still point into `/modules/...`
 * on a production build and are deliberately NOT being rewritten:
 *
 * - **Already-scheduled reminders.** `ALLOWED_REMINDER_ROUTES` (`src/lib/notifications.ts`)
 *   still allows the three module routes, and it must: that allowlist is checked before
 *   navigation, and de-allowlisting a route the server has already minted pushes for turns
 *   a tap into a silent dead end that no redirect can rescue. Letting the tap through to
 *   this redirect lands the person on Home instead, which is a poor outcome but a
 *   *coherent* one.
 * - **Existing routine steps.** `TOOL_STEP_ROUTES` (`src/features/routines/tool-routes.ts`)
 *   still knows every module tool. Removing entries there would make `routeForTool()`
 *   return undefined for a step somebody already saved, and `continue-routine-sheet` hands
 *   that straight to `pushWithOrigin` — an uncaught `TypeError`, documented at
 *   `step-tool-rollout.ts`. A redirect is strictly better than a crash.
 * - **`/tools/act`**, which is a `<Redirect href="/modules/act" />`. It now redirects into
 *   a redirect, and lands on Home. Left as-is: the two-hop is harmless and collapsing it
 *   would mean editing a file that has nothing to do with this gate.
 *
 * So the rule is: nothing that can already be holding a `/modules/...` path is edited, and
 * this layout catches all of them in one place. What the gate stops is *new* ones being
 * offered — the Home section, the reminder rows and the routine step picker.
 */
export default function ModulesGateLayout() {
  if (!modulesAreVisible()) {
    return <Redirect href="/" />;
  }

  return <Slot />;
}
