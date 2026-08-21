import { readFileSync } from "node:fs";
import { join } from "node:path";

import { computeBreadcrumbs, findUpCrumb } from "@/src/lib/breadcrumbs";
import { isOffTrail } from "@/src/lib/escape-origin";
import { sourceFiles, stripCommentsAndStrings } from "@/test/source-scan";

const ROOT = join(__dirname, "..");

/**
 * The therapy modules navigate through the Origin helper (#1266, clause O3).
 *
 * ☠️ **This suite exists because the migration it guards is invisible to every
 * other test in the repo.** `usePushWithOrigin` performs its push by calling
 * `router.push`, so every pre-existing `expect(router.push).toHaveBeenCalledWith(
 * "/modules/cbt/goals")` passes *identically* whether or not that call site was
 * ever migrated. A batch checked against the existing navigation assertions
 * would read as done while recording nothing at all - and the failure of an
 * Origin rule is always quiet: the destination screen just shows a plain Up.
 *
 * So the migration is pinned two ways, and neither is an assertion on
 * `router.push`:
 *
 * 1. **Statically**, here - no bare `router.push`/`navigate` may remain in the
 *    three directories this batch cleared.
 * 2. **Behaviourally**, on the STORE - `src/features/act/related-tools.test.tsx`,
 *    `src/features/self-care/self-care-origin.test.tsx` and
 *    `src/components/app/shared-tools-row.test.tsx` press a real control and
 *    assert on `useNavigationOriginStore`.
 *
 * The point of migrating the drill-downs is not that each one needs an Origin -
 * most do not, and recording an on-trail push is harmless because the off-trail
 * test runs at render on the destination and ignores it. The point is that the
 * helper becomes the only way to navigate, so the next cross-link cannot forget.
 */
const SCOPE = ["app/(app)/modules", "src/features/cbt", "src/features/act"];

/**
 * A forward navigation that bypasses the helper.
 *
 * `navigate` as well as `push`, matching `src/components/app/nav-chrome-origin.test.ts`:
 * they are interchangeable at a call site, and a push-only scan let a
 * `router.navigate` slip past silently there (mutation-proved). `replace` is
 * deliberately excluded - the Escape itself replaces (R4), as do the
 * save-then-redirect flows all over these modules, and neither is a drill-down
 * that leaves an Origin behind.
 */
const BARE_NAVIGATION = /router\.(push|navigate)\(/;

/** Comments and strings blanked: this file's own prose names the pattern it bans. */
const sources = () =>
  sourceFiles(ROOT, { dirs: SCOPE }).map((file) => ({
    file,
    code: stripCommentsAndStrings(readFileSync(join(ROOT, file), "utf8")),
  }));

describe("every therapy-module navigation goes through the helper", () => {
  it("leaves no bare router.push or router.navigate in the migrated tree", () => {
    const offenders = sources()
      .filter(({ code }) => BARE_NAVIGATION.test(code))
      .map(({ file }) => file);

    expect(offenders.sort()).toEqual([]);
  });

  /**
   * The anti-vacuity floor, and the one that actually rots. The assertion above
   * is an emptiness check: it would pass just as happily if these directories
   * were renamed, emptied, or stopped navigating altogether, and would then be
   * enforcing nothing while reading green.
   *
   * The floor is deliberately a count of *helper* call sites rather than "at
   * least one file exists": what has to stay true is that this tree still
   * navigates and still does it through the helper. 53 call sites were migrated
   * across 30 files - counted, not estimated: `git grep -o` finds exactly 53
   * bare `router.push`/`navigate` in these directories on the commit before
   * this batch. The floor sits under that with room for ordinary churn.
   */
  it("still navigates - through the helper - so the check above has a subject", () => {
    const callSites = sources().reduce(
      (total, { code }) => total + (code.match(/pushWithOrigin\(/g)?.length ?? 0),
      0,
    );

    expect(callSites).toBeGreaterThan(35);
  });

  /**
   * `router.replace` is untouched by this batch, and that is a decision rather
   * than an oversight - so it gets a floor too. If a later sweep "finished the
   * job" by routing the replaces through the helper as well, every
   * save-then-redirect in these modules would start recording an Origin for a
   * screen the user is being sent to *instead of* the one they left, and the
   * Escape would offer to return them to a form that no longer exists.
   */
  it("leaves the save-then-redirect replaces alone", () => {
    const withReplace = sources().filter(({ code }) => /router\.replace\(/.test(code));

    expect(withReplace.length).toBeGreaterThan(10);
  });
});

/**
 * AC3, decided by the real route map rather than asserted about in prose: a
 * drill-down inside a module still shows a plain Up.
 *
 * This is what makes migrating the same-subtree pushes safe - which is most of
 * the 53. They now all
 * record an Origin, and every one of those Origins must be *ignored* on arrival.
 * `isOffTrail` is what ignores them, so it is what gets exercised here - if a
 * future change to it made an on-trail Origin win, this fails and the whole
 * batch's "recording is harmless" argument is revoked in one place.
 */
describe("a drill-down inside a module still escapes to Up", () => {
  const t = (key: string) => key;

  it.each([
    ["/modules/cbt", "/modules/cbt/goals"],
    ["/modules/cbt/goals", "/modules/cbt/goals/new"],
    ["/modules/act", "/modules/act/defusion"],
    ["/modules/act/expansion", "/modules/act/expansion/urge-surfing"],
  ])("ignores an Origin of %s on %s", (origin, pathname) => {
    const crumbs = computeBreadcrumbs(pathname, t);
    const upHref = findUpCrumb(crumbs)?.href ?? "/";

    expect(isOffTrail(origin, pathname, crumbs, upHref)).toBe(false);
  });

  /**
   * The other half of the same claim, and the reason the batch is worth doing:
   * the pushes that leave the module ARE off-trail, so the recording they now do
   * is the thing that gets the user back.
   *
   * ⚠️ The first two are the pair the ticket did not name. It flagged the CBT
   * home's shared-tool chips as "the one genuinely off-trail set in this batch",
   * but those chips render through `SharedToolsRow`, which lives in
   * `src/components/app` and was migrated by batch 1 (#1265). `self-care.tsx`
   * is where CBT actually still crossed into `/tools` unmigrated - two pushes,
   * unmentioned - which is the ticket's own argument for opt-out recording
   * landing on a set the ticket itself had missed.
   */
  it.each([
    ["/modules/cbt/self-care", "/tools/sleep"],
    ["/modules/cbt/self-care", "/tools/gratitude-log"],
    ["/modules/cbt/exposure", "/modules/cbt/worry"],
    ["/modules/cbt/goals/new", "/modules/cbt/values"],
    ["/modules/act/values", "/tools/habits"],
  ])("follows an Origin of %s on %s", (origin, pathname) => {
    const crumbs = computeBreadcrumbs(pathname, t);
    const upHref = findUpCrumb(crumbs)?.href ?? "/";

    expect(isOffTrail(origin, pathname, crumbs, upHref)).toBe(true);
  });
});
