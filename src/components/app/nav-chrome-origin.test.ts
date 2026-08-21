import fs from "node:fs";
import path from "node:path";

import { computeBreadcrumbs, findUpCrumb } from "@/src/lib/breadcrumbs";
import { isOffTrail } from "@/src/lib/escape-origin";

/**
 * The global nav chrome records no Origin (#1261 / #1265, O3).
 *
 * Recording is opt-out: every push through `usePushWithOrigin` records where the
 * user was, and these surfaces are the exception. The opt-out is substantive
 * rather than an optimisation - they are "go somewhere else entirely"
 * affordances whose targets are top-level routes already rooted correctly, and
 * an Escape reading "Back to CBT" on Settings would compete with the sidebar
 * itself as the way back.
 *
 * The set splits by HOW each surface navigates, because the two halves can only
 * be pinned by different assertions - and the second half did not exist when
 * this guard was written.
 *
 * ⚠️ The `<Link>` half opts out **structurally, not by choice**. The sidebar's
 * rows and the brand home link navigate with `<Link href>`, which never reaches
 * the helper; the hamburger does not navigate at all - it calls `onMenuPress`
 * and opens the navigation panel. So there is no call to leave out anywhere
 * there. That makes the rule invisible in the source - nothing in those files
 * says "no Origin here" - and a future refactor to `router.push` would start
 * recording with nothing on screen to notice, since the failure of an Origin
 * rule is always a quiet one. Hence this guard, which fails on the refactor
 * rather than on the bug it would cause.
 *
 * A source scan rather than a render: `<Link>` navigation cannot be exercised
 * against a mocked router the way a press handler can, and what is being pinned
 * is the *absence* of a call, which a render can only ever fail to observe.
 */
const LINK_NAV_CHROME = [
  // The sidebar: the app's primary way to go somewhere else entirely.
  "src/components/app/sidebar-nav.tsx",
  // The hamburger and the brand home link both live here, above the `<Stack>`,
  // so they render on every route signed in and out.
  "src/components/app/invisible-header.tsx",
];

/**
 * The chrome that navigates with a real `router.push` - so unlike the half
 * above, each of these is a call someone migrating a batch has to decide to
 * leave alone. #1265 moved every other push in `src/components/app` onto the
 * helper; these two are the declared exceptions, and neither was named by the
 * ticket, which named only the brand link.
 *
 * ⚠️ The two rest on DIFFERENT arguments, and conflating them overstates the
 * second. Both pass `dangerouslySingular`, which `usePushWithOrigin` cannot
 * express - it forwards only an `Href` - but that flag is only load-bearing at
 * one of these call sites. `protected-layout.tsx` and `app-shell.tsx` declare it
 * **per screen** for every non-dynamic route, `/settings` and `/support`
 * included, precisely so it "covers every one of them, including calls written
 * later". So dropping it in `user-menu.tsx` would change nothing; the breadcrumb
 * is the real case, because its crumbs "reach routes the layouts never declare".
 *
 * `user-menu.tsx` therefore stands on the Origin argument alone - the same one
 * the helper makes for the sidebar, which its own docblock states in terms of
 * this exact screen: an Escape reading "Back to CBT" on Settings would compete
 * with the sidebar as the way back.
 */
const PUSH_NAV_CHROME = [
  // The breadcrumb trail. Its crumbs target ANCESTORS - see the test below for
  // what recording one would do to the screen it lands on - and it is the one
  // place where the `dangerouslySingular` at the call site is doing real work.
  "src/components/app/screen-breadcrumb.tsx",
  // The account menu in the persistent header, reachable from every route. Its
  // two destinations - Settings and Support - are top-level routes already
  // rooted correctly, which is the sidebar's own argument verbatim.
  "src/components/app/user-menu.tsx",
];

/**
 * A forward navigation that bypasses the helper.
 *
 * `navigate` as well as `push`, because the acceptance criterion is written over
 * both and they are interchangeable at a call site - `useNotificationDeepLink`
 * already uses `navigate` elsewhere in the app, so the next cross-link written
 * here could reach for it and slip past a push-only scan without recording a
 * thing. `replace` is deliberately NOT included: the Escape itself replaces (R4)
 * and so do the post-auth redirects, and neither is a drill-down that leaves an
 * Origin behind.
 */
const BARE_NAVIGATION = /router\.(push|navigate)\(/;

const REPO = path.join(__dirname, "..", "..", "..");

function read(file: string): string {
  return fs.readFileSync(path.join(REPO, file), "utf8");
}

describe("global nav chrome opts out of recording an Origin", () => {
  it.each([...LINK_NAV_CHROME, ...PUSH_NAV_CHROME])("%s records nothing", (file) => {
    const source = read(file);

    expect(source).not.toContain("usePushWithOrigin");
    expect(source).not.toContain("recordOrigin");
  });

  /**
   * The anti-vacuity floor. If these files stopped navigating at all - renamed,
   * emptied, split - the assertions above would pass by describing nothing, and
   * the opt-out would read as enforced while the real nav chrome had moved
   * somewhere unguarded.
   */
  it.each(LINK_NAV_CHROME)("%s still navigates by link, so the check has a subject", (file) => {
    expect(read(file)).toMatch(/<Link\b/);
  });

  it.each(PUSH_NAV_CHROME)("%s still navigates, so the check has a subject", (file) => {
    expect(read(file)).toMatch(BARE_NAVIGATION);
  });

  /**
   * The same floor from the other side, and the one that actually rots: this
   * guard is a list, and a list is only as good as its claim to be complete.
   * #1265 moved every other push in this directory onto the helper, so a bare
   * `router.push` appearing in a file that is not declared above is either a new
   * opt-out nobody wrote down or a migration someone forgot - and both fail the
   * same quiet way.
   *
   * Scoped to `src/components/app` because that is the directory #1265 cleared;
   * the therapy modules and the tools tree are #1266 and #1267, and #1269 turns
   * the whole rule into lint once all three have landed.
   */
  it("declares every remaining bare router navigation in src/components/app", () => {
    const dir = path.join(REPO, "src", "components", "app");
    const offenders = fs
      .readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
      .filter((name) => BARE_NAVIGATION.test(fs.readFileSync(path.join(dir, name), "utf8")))
      .map((name) => `src/components/app/${name.split(path.sep).join("/")}`);

    expect(offenders.sort()).toEqual([...PUSH_NAV_CHROME].sort());
  });
});

/**
 * Why the breadcrumb trail is an opt-out and not a missed migration.
 *
 * A crumb targets an ANCESTOR of the current screen, so recording it would hand
 * that ancestor an Origin pointing at its own DESCENDANT - and a descendant is
 * never on the ancestor's trail, so the off-trail test says yes and the
 * ancestor's Escape turns around and leads back down into the screen the user
 * just climbed out of. The Escape would stop being a way out.
 *
 * Run against the real `computeBreadcrumbs` and the real `isOffTrail` rather
 * than argued in a comment, because this is a claim about behaviour and the one
 * way this file could be wrong is by reasoning about the rule instead of
 * exercising it. If a future change to `isOffTrail` makes an ancestor-to-
 * descendant Origin harmless, this test fails and the opt-out can be revisited.
 */
describe("a crumb press must not record an Origin", () => {
  const t = (key: string) => key;

  it("would point the ancestor's Escape back down at the screen it was left from", () => {
    const descendant = "/modules/cbt/history";
    const ancestor = "/modules/cbt";

    const crumbs = computeBreadcrumbs(ancestor, t);
    const upHref = findUpCrumb(crumbs)?.href ?? "/";

    // The ancestor really is above, so the crumb press really is an Up hop.
    expect(computeBreadcrumbs(descendant, t).some((crumb) => crumb.href === ancestor)).toBe(true);

    // And the hazard: the reverse is not on the trail, so it would win.
    expect(isOffTrail(descendant, ancestor, crumbs, upHref)).toBe(true);
  });
});
