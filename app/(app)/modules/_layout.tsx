import { Redirect, Stack } from "expo-router";

import { modulesAreVisible } from "@/src/lib/module-visibility";

/**
 * The route half of the module gate (2026-09-17, owner instruction), and the navigator
 * that owns every module screen.
 *
 * Hiding the entry points is not enough on its own: `/modules/cbt` is a real URL on the
 * web build, so a build that only dropped the Home section would still serve every module
 * to anyone who typed, bookmarked or was linked one. This layout is the choke point —
 * every module screen is nested under it, so one redirect covers all 80 module routes
 * without touching any of them.
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
 *
 * ☠️ **The screens below are declared HERE because this is the navigator that owns them
 * (#2847).** When this layout arrived (#2579) it made `modules` a navigator boundary, but
 * its 80 screen declarations (`name="modules/…"`) stayed behind in
 * `protected-layout.tsx` — where each one matched nothing: expo-router logged
 * `[Layout children]: No route named … exists in nested children` ~80 times on every
 * mount of the shell, and every option the declarations carried (`dangerouslySingular`,
 * #1027) was silently dead. A `<Slot />` cannot host them — it ignores `Screen` children
 * outright — so the gate renders a `<Stack>` whose `screenOptions` mirror the shell's
 * (`headerShown: false`, the 220ms fade): module screens keep rendering header-less and
 * transition the way every sibling screen in the shell does, as they did before #2579.
 *
 * `dangerouslySingular` follows the rule written up in `protected-layout.tsx` (#1027):
 * LIST and OVERVIEW screens are single-instance; screens holding per-visit state —
 * creation, editing, dynamic records, unsaved work — are not, because singular reuses the
 * route rather than remounting it. `test/nav-singular.test.ts` derives and enforces both
 * directions for this layout exactly as it does for the shell's.
 */
export default function ModulesGateLayout() {
  if (!modulesAreVisible()) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 220,
      }}
    >
      <Stack.Screen name="index" dangerouslySingular />
      <Stack.Screen name="cbt/index" dangerouslySingular />
      <Stack.Screen name="cbt/learn" dangerouslySingular />
      <Stack.Screen name="cbt/history/index" dangerouslySingular />
      <Stack.Screen name="cbt/history/[id]" />
      <Stack.Screen name="cbt/new" />
      <Stack.Screen name="cbt/[id]" />
      <Stack.Screen name="cbt/saved/[id]" />
      <Stack.Screen name="cbt/goals/index" dangerouslySingular />
      <Stack.Screen name="cbt/goals/new" />
      <Stack.Screen name="cbt/goals/[id]" />
      <Stack.Screen name="cbt/activities/index" dangerouslySingular />
      <Stack.Screen name="cbt/activities/new" />
      <Stack.Screen name="cbt/activities/[id]" />
      <Stack.Screen name="cbt/values" dangerouslySingular />
      <Stack.Screen name="cbt/weekly-review" dangerouslySingular />
      <Stack.Screen name="cbt/beliefs/index" dangerouslySingular />
      <Stack.Screen name="cbt/beliefs/new" />
      <Stack.Screen name="cbt/beliefs/[id]" />
      <Stack.Screen name="cbt/exposure/index" dangerouslySingular />
      <Stack.Screen name="cbt/exposure/new" />
      <Stack.Screen name="cbt/exposure/[id]" />
      <Stack.Screen name="cbt/worry/index" dangerouslySingular />
      <Stack.Screen name="cbt/worry/new" />
      <Stack.Screen name="cbt/worry/[id]" />
      <Stack.Screen name="cbt/tasks/index" dangerouslySingular />
      <Stack.Screen name="cbt/tasks/new" />
      <Stack.Screen name="cbt/tasks/[id]" />
      <Stack.Screen name="cbt/anger/index" dangerouslySingular />
      <Stack.Screen name="cbt/anger/new" />
      <Stack.Screen name="cbt/anger/[id]" />
      <Stack.Screen name="cbt/self-care" dangerouslySingular />
      <Stack.Screen name="cbt/recovery" dangerouslySingular />
      <Stack.Screen name="act/index" dangerouslySingular />
      <Stack.Screen name="act/choice-point/index" dangerouslySingular />
      <Stack.Screen name="act/choice-point/new" />
      <Stack.Screen name="act/choice-point/[id]" />
      <Stack.Screen name="act/committed-action/index" dangerouslySingular />
      <Stack.Screen name="act/committed-action/new" />
      <Stack.Screen name="act/committed-action/[id]" />
      <Stack.Screen name="act/connection/index" dangerouslySingular />
      <Stack.Screen name="act/connection/drop-anchor" dangerouslySingular />
      <Stack.Screen name="act/connection/new" />
      <Stack.Screen name="act/connection/[id]" />
      <Stack.Screen name="act/defusion/index" dangerouslySingular />
      <Stack.Screen name="act/defusion/new" />
      <Stack.Screen name="act/defusion/[id]" />
      <Stack.Screen name="act/expansion/index" dangerouslySingular />
      {/* Plain: a nine-state exercise, mid-practice. See `MUST_REMOUNT` in
          `test/nav-singular.test.ts`. */}
      <Stack.Screen name="act/expansion/urge-surfing/index" />
      <Stack.Screen name="act/expansion/urge-surfing/[id]" />
      <Stack.Screen name="act/expansion/new" />
      <Stack.Screen name="act/expansion/[id]" />
      <Stack.Screen name="act/observing-self/index" dangerouslySingular />
      <Stack.Screen name="act/observing-self/new" />
      <Stack.Screen name="act/observing-self/[id]" />
      <Stack.Screen name="act/values/index" dangerouslySingular />
      {/* A `<Redirect>` stub since #1379 - marked like `tools/act`, the other pure
          redirect in the shell. It never stays mounted, so singular is inert on it;
          it is stated rather than left blank so the guard's marking rules cover
          the route rather than excusing it. */}
      <Stack.Screen name="act/values/bulls-eye" dangerouslySingular />
      <Stack.Screen name="act/values/[domain]" />
      <Stack.Screen name="dbt/index" dangerouslySingular />
      <Stack.Screen name="dbt/learn/index" dangerouslySingular />
      <Stack.Screen name="dbt/learn/[group]" />
      <Stack.Screen name="dbt/coping-plan/index" dangerouslySingular />
      <Stack.Screen name="dbt/coping-plan/edit" />
      <Stack.Screen name="dbt/pause" />
      <Stack.Screen name="dbt/sessions/muscle-relaxation" />
      <Stack.Screen name="dbt/emotions/index" dangerouslySingular />
      <Stack.Screen name="dbt/emotions/new" />
      <Stack.Screen name="dbt/emotions/[id]" />
      <Stack.Screen name="dbt/wise-mind/index" dangerouslySingular />
      <Stack.Screen name="dbt/wise-mind/new" />
      <Stack.Screen name="dbt/wise-mind/[id]" />
      <Stack.Screen name="dbt/judgements/index" dangerouslySingular />
      <Stack.Screen name="dbt/judgements/new" />
      <Stack.Screen name="dbt/judgements/[id]" />
      <Stack.Screen name="dbt/opposite-action/index" dangerouslySingular />
      <Stack.Screen name="dbt/opposite-action/new" />
      <Stack.Screen name="dbt/opposite-action/[id]" />
      <Stack.Screen name="dbt/scripts/index" dangerouslySingular />
      <Stack.Screen name="dbt/scripts/new" />
      <Stack.Screen name="dbt/scripts/[id]" />
    </Stack>
  );
}
