import { NOTIFICATION_TARGETS } from "@/src/features/notifications/registry";
import {
  HELD_OUT_REMINDER_TARGETS,
  isReminderTargetHeldOut,
} from "@/src/features/notifications/reminder-rollout";

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
