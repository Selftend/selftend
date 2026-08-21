import fs from "node:fs";
import path from "node:path";

/**
 * The global nav chrome records no Origin (#1261, O3).
 *
 * Recording is opt-out: every push through `usePushWithOrigin` records where the
 * user was, and these three surfaces are the exception. The opt-out is
 * substantive rather than an optimisation - they are "go somewhere else
 * entirely" affordances whose targets are top-level routes already rooted
 * correctly, and an Escape reading "Back to CBT" on Settings would compete with
 * the sidebar itself as the way back.
 *
 * ⚠️ Today they opt out **structurally, not by choice**. The sidebar's rows and
 * the brand home link navigate with `<Link href>`, which never reaches the
 * helper; the hamburger does not navigate at all - it calls `onMenuPress` and
 * opens the navigation panel. So there is no call to leave out anywhere here.
 *
 * That makes the rule invisible in the source - nothing in these files says "no
 * Origin here" - and a future refactor to `router.push` would start recording
 * with nothing on screen to notice, since the failure of an Origin rule is
 * always a quiet one. Hence this guard, which fails on the refactor rather than
 * on the bug it would cause.
 *
 * A source scan rather than a render: `<Link>` navigation cannot be exercised
 * against a mocked router the way a press handler can, and what is being pinned
 * is the *absence* of a call, which a render can only ever fail to observe.
 */
const OPT_OUT_FILES = [
  // The sidebar: the app's primary way to go somewhere else entirely.
  "src/components/app/sidebar-nav.tsx",
  // The hamburger and the brand home link both live here, above the `<Stack>`,
  // so they render on every route signed in and out.
  "src/components/app/invisible-header.tsx",
];

const REPO = path.join(__dirname, "..", "..", "..");

describe("global nav chrome opts out of recording an Origin", () => {
  it.each(OPT_OUT_FILES)("%s records nothing", (file) => {
    const source = fs.readFileSync(path.join(REPO, file), "utf8");

    expect(source).not.toContain("usePushWithOrigin");
    expect(source).not.toContain("recordOrigin");
  });

  /**
   * The anti-vacuity floor. If these files stopped navigating at all - renamed,
   * emptied, split - the assertions above would pass by describing nothing, and
   * the opt-out would read as enforced while the real nav chrome had moved
   * somewhere unguarded.
   */
  it.each(OPT_OUT_FILES)("%s still navigates, so the check above has a subject", (file) => {
    const source = fs.readFileSync(path.join(REPO, file), "utf8");

    expect(source).toMatch(/<Link\b/);
  });
});
