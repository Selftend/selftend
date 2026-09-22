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
 * per build. That rule is a TEST, not just this sentence
 * (`reminder-rollout.test.ts`, "the edge function can load it"): nothing else in
 * the repo can see the breakage - eslint ignores `supabase/functions/**`, CI runs
 * no Deno, and tsc and jest both resolve a React Native import happily, so the
 * first one added here would surface at `supabase functions deploy`, after the
 * merge.
 *
 * Lifting a target is a release step, not a code comment: `docs/releasing.md`,
 * "Post-release: lift held-out reminder targets". The tests that pin this list
 * (`reminder-rollout.test.ts`, `web-reminders.test.ts`) are edited in the same
 * change, so the lift cannot happen by accident and cannot half-happen.
 *
 * ✅ **Empty since 2026-09-22 (#2698), the first lift this list has ever had.**
 * `dbt` and `general` left together because both their conditions had come
 * true: `/modules/dbt` shipped in v0.18.0 and `/` in v0.21.0, and the App Store
 * was live on 0.21.0 while Google Play was live on 0.23.0. The two had sat past
 * their own gates for 13 and 5 days, because nothing goes red while a target
 * stays held out - see `docs/releasing.md`, which now says so in the section
 * that owns this list.
 *
 * ⚠️ **Empty is the normal state, not a retired mechanism.** The two-step
 * rollout is still how a new target ships: it lands here in the change that
 * adds its url to `ALLOWED_REMINDER_ROUTES`, and leaves once that build is live
 * on BOTH stores. The row's held-out rendering and its copy stay wired for
 * exactly that reason, and `notification-target-row.test.ts` drives them from a
 * mocked predicate so they keep their coverage while nothing is held out.
 */
export const HELD_OUT_REMINDER_TARGETS = [] as const;

/** Is `target` held out right now? A string predicate so both sides can ask without sharing a type. */
export function isReminderTargetHeldOut(target: string): boolean {
  return (HELD_OUT_REMINDER_TARGETS as readonly string[]).includes(target);
}
