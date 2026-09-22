import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NOTIFICATION_TARGETS } from "@/src/features/notifications/registry";
import {
  HELD_OUT_REMINDER_TARGETS,
  isReminderTargetHeldOut,
} from "@/src/features/notifications/reminder-rollout";
import { stripCommentsAndStrings } from "@/test/source-scan";

/**
 * The reminder hold-out list (#2213, #2260) - the ONE source the cron and the
 * clients read. Lifting a target edits this test on purpose: the lift is a
 * release step (`docs/releasing.md`, "Post-release: lift held-out reminder
 * targets"), and a list that can change with no test moving is a list that
 * changes by accident.
 */
describe("HELD_OUT_REMINDER_TARGETS (#2260)", () => {
  it("is empty: nothing is held out, and every configured reminder is deliverable (#2698)", () => {
    // ☠️ The FIRST lift this list has ever had (#2698, 2026-09-22). `dbt` and
    // `general` left together once both their own conditions were true -
    // `/modules/dbt` shipped in v0.18.0, `/` in v0.21.0, and the App Store was
    // live on 0.21.0 with Google Play on 0.23.0. Named, not derived: the list is
    // the delta between the shipped native allowlist and this one, and nothing
    // in the repo can compute that, so emptiness is asserted rather than assumed.
    expect([...HELD_OUT_REMINDER_TARGETS]).toEqual([]);
  });

  it("names only targets the registry knows, so a typo cannot hold out nothing", () => {
    // ⚠️ Vacuous while the list is empty, and that is the point of the assertion
    // above: it pins the emptiness this loop depends on, so a target added here
    // without a registry key still fails rather than passing silently.
    const known = NOTIFICATION_TARGETS.map((target) => target.key);
    for (const target of HELD_OUT_REMINDER_TARGETS) {
      expect(known).toContain(target);
    }
  });

  it("answers the predicate false for every configured target, and for a name that is not one", () => {
    // The whole registry, not a sample: with the list empty, "no target is held
    // out" is the claim, and the only honest way to make it is to ask about each.
    for (const target of NOTIFICATION_TARGETS) {
      expect(isReminderTargetHeldOut(target.key)).toBe(false);
    }
    expect(isReminderTargetHeldOut("not-a-target")).toBe(false);
  });

  it("still answers true for a member, so an empty list has not made the predicate a constant", () => {
    // ☠️ The positive control, and the reason it exists: with nothing held out,
    // every assertion above passes equally well against `() => false`. This one
    // reads the source rather than the export - the predicate must still be a
    // membership test over the list, so the next target lands held out rather
    // than shipping straight to the cron.
    const source = stripCommentsAndStrings(
      readFileSync(join(__dirname, "reminder-rollout.ts"), "utf8"),
    );
    expect(source).toMatch(/HELD_OUT_REMINDER_TARGETS[^;]*\.includes\(\s*target\s*\)/);
  });
});

/**
 * ☠️☠️ **The module has to load under DENO, and nothing else in this repo checks
 * that.** `supabase/functions/_shared/web-reminders.ts` imports this file by
 * relative path so the cron and the clients read ONE list (#2260) - and the
 * constraint that keeps that possible was written only in prose in its docblock.
 * Four things made prose the whole enforcement: the file sits in
 * `src/features/notifications/`, where most modules DO import React Native (the
 * control below reads one of them); `eslint.config.js` ignores
 * `supabase/functions/**`, so no lint rule spans the boundary; CI starts Supabase
 * with `edge-runtime` excluded and runs no `deno check`; and `tsc` and jest both
 * resolve a React Native import happily. The first `import` added here would pass
 * every gate in the repo and break `supabase functions deploy` - after the
 * promotion merged, with the nightly reminder cron left on an older function.
 *
 * Text, not module introspection: a transpiled module's imports are gone by the
 * time jest can look at them, and it is the SOURCE Deno reads.
 */
describe("the edge function can load it (#2260)", () => {
  const DIR = __dirname;
  const read = (file: string) => readFileSync(join(DIR, file), "utf8");
  const IMPORTS = /^\s*import\b|\brequire\s*\(|^\s*export\s+(?:\*|\{[^}]*\})\s+from\b/m;

  it("imports nothing at all - no module, no `@/` alias, no React Native", () => {
    expect(stripCommentsAndStrings(read("reminder-rollout.ts"))).not.toMatch(IMPORTS);
  });

  it("would see an import if there were one", () => {
    // The positive control, and the reason this guard is worth having: its own
    // neighbour in this directory imports React Native, so an import here is the
    // local norm rather than an unusual act.
    const neighbour = read("channel-errors.ts");
    expect(stripCommentsAndStrings(neighbour)).toMatch(IMPORTS);
    expect(neighbour).toContain('from "react-native"');
  });
});
