import { readFileSync } from "node:fs";
import { join } from "node:path";

import { computeBreadcrumbs, findUpCrumb } from "@/src/lib/breadcrumbs";
import { isOffTrail } from "@/src/lib/escape-origin";
import { sourceFiles, stripCommentsAndStrings } from "@/test/source-scan";

const ROOT = join(__dirname, "..");

/**
 * The tools, policy pages and remaining features navigate through the Origin
 * helper (#1267, clause O3 - migration batch 3 of 3).
 *
 * ☠️ **This suite exists because the migration it guards is invisible to every
 * other test in the repo.** `usePushWithOrigin` performs its push by calling
 * `router.push`, so every pre-existing `expect(router.push).toHaveBeenCalledWith(
 * "/privacy")` passes *identically* whether or not that call site was ever
 * migrated. A batch checked against the existing navigation assertions would
 * read as done while recording nothing at all - and the failure of an Origin
 * rule is always quiet: the destination screen just shows a plain Up.
 *
 * So the migration is pinned two ways, and neither is an assertion on
 * `router.push`:
 *
 * 1. **Statically**, here - no bare `router.push`/`navigate` may remain in the
 *    swept tree outside the declared exemptions below.
 * 2. **Behaviourally**, on the STORE - `src/features/policies/policy-origin.test.tsx`,
 *    `src/features/settings/settings-screen.test.tsx` and
 *    `src/features/habits/habit-detail-screen.test.tsx` press a real control and
 *    assert on `useNavigationOriginStore`.
 */

/**
 * Everything the three batches together swept, minus batch 2's own directories:
 * `app/(app)/modules`, `src/features/cbt` and `src/features/act` belong to
 * #1266 and are guarded by `test/therapy-modules-origin.test.ts`, and
 * `src/components/app` belongs to #1265 and is guarded by
 * `src/components/app/nav-chrome-origin.test.ts`. Between the three suites the
 * whole navigating tree is covered, which is what makes #1269's lint rule
 * enforceable rather than aspirational.
 */
const SCOPE = ["app", "src/features"];
const OTHER_BATCHES = /^(app\/\(app\)\/modules|src\/features\/(act|cbt))\//;

/**
 * The one navigation in scope that stays bare *by design*, recorded here the
 * way `nav-chrome-origin.test.ts` records the chrome opt-outs. A notification
 * deep link is a cold arrival by definition (O7): the app was backgrounded or
 * closed, there is no "screen the user left" to record, and the arrival must
 * fall back to Up. It is also `router.navigate` from a non-component hook fired
 * by a listener, where `usePushWithOrigin`'s `usePathname()` read has no screen
 * to describe.
 */
const DEEP_LINK_EXEMPTION = "src/features/notifications/use-notification-deep-link.ts";

/**
 * The editor forms whose local `goBack` is `router.canGoBack() ? router.back()
 * : router.push(fallbackHref)`. That push is a *backwards* move - the form
 * abandoning itself on a history-less arrival - so recording there would hand
 * the parent list an Origin pointing at its own just-abandoned descendant, and
 * because a descendant is never on the parent's trail, `isOffTrail` would fire
 * and the parent's Escape would turn around and lead back INTO the form. The
 * same reasoning keeps `ScreenBreadcrumb` bare (#1265) and the
 * save-then-redirect `router.replace`s bare (#1266).
 *
 * Each file is allowed exactly ONE bare push and it must be the fallback shape,
 * so the exemption cannot quietly grow a second, genuinely-forgotten call site
 * behind it - and it expires by failing the moment the fallback is refactored.
 */
const FALLBACK_EXEMPTIONS = [
  "src/features/gratitude/gratitude-entry-editor-screen.tsx",
  "src/features/habits/habit-editor-screen.tsx",
  "src/features/journal/journal-entry-editor-screen.tsx",
  "src/features/mood/mood-entry-editor-screen.tsx",
  "src/features/routines/routine-editor-screen.tsx",
  "src/features/sleep/sleep-log-screen.tsx",
];

/**
 * A forward navigation that bypasses the helper.
 *
 * `navigate` as well as `push`, matching the sibling suites: they are
 * interchangeable at a call site, and a push-only scan let a `router.navigate`
 * slip past silently in `nav-chrome-origin.test.ts` (mutation-proved).
 * `replace` is deliberately excluded - the Escape itself replaces (R4), as do
 * the save-then-redirect flows, and neither is a drill-down that leaves an
 * Origin behind.
 */
const BARE_NAVIGATION = /router\.(push|navigate)\(/;

/** Comments and strings blanked: this file's own prose names the pattern it bans. */
const sources = () =>
  sourceFiles(ROOT, { dirs: SCOPE })
    .filter((file) => !OTHER_BATCHES.test(file))
    .map((file) => ({
      file,
      code: stripCommentsAndStrings(readFileSync(join(ROOT, file), "utf8")),
    }));

describe("every remaining navigation goes through the helper", () => {
  it("leaves no bare router.push or router.navigate outside the declared exemptions", () => {
    const offenders = sources()
      .filter(({ file }) => file !== DEEP_LINK_EXEMPTION && !FALLBACK_EXEMPTIONS.includes(file))
      .filter(({ code }) => BARE_NAVIGATION.test(code))
      .map(({ file }) => file);

    expect(offenders.sort()).toEqual([]);
  });

  /**
   * The exemptions stay exactly the shape they were exempted for. The deep-link
   * hook must still be the navigate it was excused as, and each editor may hold
   * one bare push - the fallback - and no more. A second `router.push` creeping
   * into one of these files would otherwise hide behind the exemption forever.
   */
  it("keeps each fallback exemption to exactly the one fallback push", () => {
    const byFile = new Map(sources().map(({ file, code }) => [file, code]));

    for (const file of FALLBACK_EXEMPTIONS) {
      const code = byFile.get(file);
      expect(code).toBeDefined();
      expect(code?.match(/router\.push\(/g)).toHaveLength(1);
      expect(code).toMatch(/router\.push\(fallbackHref\)/);
    }

    expect(byFile.get(DEEP_LINK_EXEMPTION)).not.toMatch(/router\.push\(/);
  });

  /**
   * The anti-vacuity floor, and the one that actually rots. The emptiness check
   * above would pass just as happily if these directories were renamed or
   * stopped navigating altogether, and would then be enforcing nothing while
   * reading green.
   *
   * 80 call sites were migrated across 40 files - counted, not estimated:
   * `git grep -o` finds exactly 80 helper calls in this scope on the batch's
   * own commit. The floor sits under that with room for ordinary churn.
   */
  it("still navigates - through the helper - so the check above has a subject", () => {
    const callSites = sources().reduce(
      (total, { code }) => total + (code.match(/pushWithOrigin\(/g)?.length ?? 0),
      0,
    );

    expect(callSites).toBeGreaterThan(60);
  });

  /**
   * `router.replace` is untouched by this batch, and that is a decision rather
   * than an oversight - so it gets a floor too. Routing the save-then-redirect
   * replaces through the helper would record an Origin for a screen the user is
   * being sent to *instead of* the one they left, and the Escape would offer to
   * return them to a form that no longer exists.
   */
  it("leaves the save-then-redirect replaces alone", () => {
    const withReplace = sources().filter(({ code }) => /router\.replace\(/.test(code));

    expect(withReplace.length).toBeGreaterThan(12);
  });
});

/**
 * AC2/AC5 decided by the real route map rather than asserted about in prose.
 *
 * Migrating the same-subtree drill-downs is safe - which is most of the 80 -
 * because every Origin they record must be *ignored* on arrival. `isOffTrail`
 * is what ignores them, so it is what gets exercised here.
 */
describe("a drill-down inside a tool still escapes to Up", () => {
  const t = (key: string) => key;

  it.each([
    ["/tools/journal", "/tools/journal/3f9a-uuid"],
    ["/tools/habits", "/tools/habits/new"],
    ["/tools/gratitude-log", "/tools/gratitude-log/entries"],
    // A one-crumb screen reached from Home. Was `/arrange` until #1959 deleted that route.
    ["/", "/routines"],
  ])("ignores an Origin of %s on %s", (origin, pathname) => {
    const crumbs = computeBreadcrumbs(pathname, t);
    const upHref = findUpCrumb(crumbs)?.href ?? "/";

    expect(isOffTrail(origin, pathname, crumbs, upHref)).toBe(false);
  });

  /**
   * The other half of the same claim, and the reason the batch is worth doing.
   *
   * The policy pages are the ticket's headline set: they cross-link heavily to
   * each other (legal → privacy → security → privacy...), every one of them is
   * a one-crumb screen whose trail hides, and before this batch the only exit
   * at every step was a jump to Home that discarded the whole excursion.
   *
   * `/settings` → `/notifications` is the stray the sibling batches left
   * unclaimed twice (#1261, #1266): `settings-screen.tsx` sits outside every
   * batch directory named by the tickets, and Settings IS off-trail from
   * Reminders, whose own Up is Home.
   */
  it.each([
    ["/legal", "/privacy"],
    ["/privacy", "/security"],
    ["/security", "/privacy"],
    ["/support", "/crisis"],
    ["/legal", "/account-deletion"],
    ["/settings", "/notifications"],
    ["/", "/tools/check-in/new"],
    ["/modules/cbt/new", "/crisis"],
  ])("follows an Origin of %s on %s", (origin, pathname) => {
    const crumbs = computeBreadcrumbs(pathname, t);
    const upHref = findUpCrumb(crumbs)?.href ?? "/";

    expect(isOffTrail(origin, pathname, crumbs, upHref)).toBe(true);
  });
});
