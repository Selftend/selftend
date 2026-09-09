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
  it("holds DBT out until the native build that routes /modules/dbt is live on both stores", () => {
    // Named, not derived - the list is the delta between the shipped native
    // allowlist and this one, and nothing in the repo can compute that.
    expect([...HELD_OUT_REMINDER_TARGETS]).toEqual(["dbt"]);
  });

  it("names only targets the registry knows, so a typo cannot hold out nothing", () => {
    const known = NOTIFICATION_TARGETS.map((target) => target.key);
    for (const target of HELD_OUT_REMINDER_TARGETS) {
      expect(known).toContain(target);
    }
  });

  it("answers the predicate from the list, for members and non-members", () => {
    for (const target of HELD_OUT_REMINDER_TARGETS) {
      expect(isReminderTargetHeldOut(target)).toBe(true);
    }
    for (const target of NOTIFICATION_TARGETS) {
      if ((HELD_OUT_REMINDER_TARGETS as readonly string[]).includes(target.key)) continue;
      expect(isReminderTargetHeldOut(target.key)).toBe(false);
    }
    expect(isReminderTargetHeldOut("not-a-target")).toBe(false);
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
