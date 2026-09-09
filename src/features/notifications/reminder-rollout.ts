/**
 * Reminder targets held out of delivery until the native build that routes
 * their deep link is live on BOTH stores (#2213, #2260).
 *
 * ☠️☠️ **One list, read by two builds that are never the same build.** The
 * `send-web-reminders` edge function and the web client go live the moment a
 * promotion merges; the Android and iOS builds only enter store review. A push
 * minted for a url the phone's `ALLOWED_REMINDER_ROUTES` has never heard of is
 * a daily dead end the person explicitly opted into. So a new target lands
 * here first and the cron skips it - and, since #2260, the clients read the
 * same list: no post-save offer for a reminder the cron will not send, and the
 * reminders screen shows the row switched off with a note instead of taking an
 * opt-in it cannot honour.
 *
 * ⚠️ NO imports, no `@/` alias, no React Native: the edge function imports this
 * file by relative path under Deno (the same route `send-web-reminders/index.ts`
 * takes to the `notifications` locale JSON), and jest loads it for both sides.
 * Keep it a plain constant - never an env flag the app could read differently
 * per build.
 *
 * Lifting a target is a release step, not a code comment: `docs/releasing.md`,
 * "Post-release: lift held-out reminder targets". The tests that pin this list
 * (`reminder-rollout.test.ts`, `web-reminders.test.ts`) are edited in the same
 * change, so the lift cannot happen by accident and cannot half-happen.
 */
export const HELD_OUT_REMINDER_TARGETS = [
  // DBT (#1980): `/modules/dbt` is allowlisted by the client that ships with
  // this list and by no earlier one. Lift once the native build carrying
  // `/modules/dbt` in ALLOWED_REMINDER_ROUTES is live on Google Play and the
  // App Store.
  "dbt",
] as const;

/** Is `target` held out right now? A string predicate so both sides can ask without sharing a type. */
export function isReminderTargetHeldOut(target: string): boolean {
  return (HELD_OUT_REMINDER_TARGETS as readonly string[]).includes(target);
}
