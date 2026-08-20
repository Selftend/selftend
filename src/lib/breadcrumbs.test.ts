import { computeBreadcrumbs } from "@/src/lib/breadcrumbs";

// Minimal label table covering the keys these paths resolve to. Unknown keys fall
// through to the key itself, which would surface as a bug in an assertion.
const LABELS: Record<string, string> = {
  "sidebar.tools": "Tools",
  "sidebar.meditation": "Meditation",
  "sidebar.modules": "Modules",
  "sidebar.cbt": "CBT",
  "breadcrumb.goals": "Goals",
  "breadcrumb.entry": "Entry",
  "breadcrumb.entries": "Entries",
  "sidebar.gratitudeLog": "Gratitude log",
  "breadcrumb.history": "History",
  "breadcrumb.favorites": "Favorites",
  "sidebar.routines": "Routines",
  "breadcrumb.edit": "Edit",
  "sidebar.moodTracker": "Check-in",
  "breadcrumb.practices": "Practices",
  "breadcrumb.new": "New",
  "breadcrumb.saved": "Saved",
  "breadcrumb.learn": "Learn",
  "breadcrumb.connection": "Connection",
  "breadcrumb.signIn": "Sign in",
  "breadcrumb.signUp": "Sign up",
  "breadcrumb.resetPassword": "Reset password",
  "breadcrumb.updatePassword": "Update password",
  "breadcrumb.verifyEmail": "Verify email",
  "sidebar.act": "ACT",
  "sidebar.habits": "Habits",
  "act:choicePoint.title": "Choice point",
  "act:dropAnchor.title": "Drop anchor",
  "habits:learn.cards.compounding.title": "The 1% compounding effect",
};
const t = (key: string) => LABELS[key] ?? key;

describe("computeBreadcrumbs", () => {
  it("resolves the meditation route to its static label", () => {
    const crumbs = computeBreadcrumbs("/tools/meditation", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Tools", "Meditation"]);
    expect(crumbs[0].href).toBe("/tools");
    expect(crumbs[1].href).toBeUndefined();
  });

  it("resolves the meditation practices route to its own label, not the Entry fallback", () => {
    // An unregistered static route reads as an opaque dynamic segment and
    // renders the generic "Entry" - which is how #921's review caught this one.
    const crumbs = computeBreadcrumbs("/tools/meditation/practices", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Tools", "Meditation", "Practices"]);
  });

  it("falls back to a generic label for an opaque-id detail route", () => {
    const crumbs = computeBreadcrumbs("/modules/cbt/goals/3f9a-uuid", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Modules", "CBT", "Goals", "Entry"]);
  });

  it("returns nothing for the root", () => {
    expect(computeBreadcrumbs("/", t)).toEqual([]);
  });

  it("resolves the routines detail and edit routes", () => {
    const crumbs = computeBreadcrumbs("/routines/3f9a-uuid/edit", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Routines", "Entry", "Edit"]);
    expect(crumbs[0].href).toBe("/routines");
    expect(crumbs[2].href).toBeUndefined();
  });

  it("labels the gratitude entries list as History, not a generic entry", () => {
    const crumbs = computeBreadcrumbs("/tools/gratitude-log/entries", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Tools", "Gratitude log", "History"]);
    expect(crumbs[2].href).toBeUndefined();
  });

  it("labels the journal entries list as Entries, not a singular record", () => {
    const crumbs = computeBreadcrumbs("/tools/journal/entries", t);

    expect(crumbs.at(-1)).toEqual({ label: "Entries" });
  });

  // `history` sits beside the `[id]` detail route, so without a static entry it
  // would fall through to the dynamic branch and read "Tools · Check-in · Entry".
  it("labels the check-in all-history screen as History, not a generic entry", () => {
    const crumbs = computeBreadcrumbs("/tools/check-in/history", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Tools", "Check-in", "History"]);
    expect(crumbs[1].href).toBe("/tools/check-in");
    expect(crumbs[2].href).toBeUndefined();
  });

  /**
   * #876: grounding and breathing map dynamic segments through
   * `…techniques/exercises.<slug>.title`, so an unclaimed `history` segment
   * rode the template into a key that doesn't exist and the trail rendered
   * the raw uppercased key — a user-visible untranslated string. The static
   * entry must win before the slug template.
   */
  it("labels the grounding all-history screen as History, never the raw slug-template key", () => {
    const crumbs = computeBreadcrumbs("/tools/grounding/history", t);
    expect(crumbs.at(-1)).toEqual({ label: "History" });
    expect(crumbs.some((c) => c.label.includes("techniques"))).toBe(false);
  });

  it("labels the breathing all-history screen as History, never the raw slug-template key", () => {
    const crumbs = computeBreadcrumbs("/tools/breathing/history", t);
    expect(crumbs.at(-1)).toEqual({ label: "History" });
    expect(crumbs.some((c) => c.label.includes("exercises"))).toBe(false);
  });

  // Sleep's history had no slug template to fall into, so it read the merely
  // wrong "Entry" instead of a raw key — same family, same fix.
  it("labels the sleep all-history screen as History, not a generic entry", () => {
    const crumbs = computeBreadcrumbs("/tools/sleep/history", t);
    expect(crumbs.at(-1)).toEqual({ label: "History" });
  });

  // #468 sweep: the favorites page fell through to the dynamic-segment branch
  // and read "Tools · Gratitude log · Entry".
  it("labels the gratitude favorites page as Favorites, not a generic entry", () => {
    const crumbs = computeBreadcrumbs("/tools/gratitude-log/favorites", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Tools", "Gratitude log", "Favorites"]);
    expect(crumbs[2].href).toBeUndefined();
  });
});

// #1251 (T1): the three static segments that fell through to "Entry". Their
// labels are reused from the screens themselves - only `saved` needed a new key,
// because `cbt:saved.title` is the headline "You examined a thought." and a trail
// reading *Modules · CBT · You examined a thought.* is absurd.
describe("computeBreadcrumbs - the unmapped static segments (#1251)", () => {
  it("names the ACT choice point instead of falling back to Entry", () => {
    const crumbs = computeBreadcrumbs("/modules/act/choice-point", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Modules", "ACT", "Choice point"]);
    expect(crumbs.at(-1)?.href).toBeUndefined();
  });

  it("names drop anchor instead of falling back to Entry", () => {
    const crumbs = computeBreadcrumbs("/modules/act/connection/drop-anchor", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Modules", "ACT", "Connection", "Drop anchor"]);
  });

  it("names the saved thought record with its own crumb key, not the screen headline", () => {
    const crumbs = computeBreadcrumbs("/modules/cbt/saved", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Modules", "CBT", "Saved"]);
    // The headline would read "You examined a thought." - guard against anyone
    // pointing this entry at `cbt:saved.title` later.
    expect(crumbs.at(-1)?.label).not.toContain("examined");
  });

  it("resolves a habits learn card to its real title", () => {
    const crumbs = computeBreadcrumbs("/tools/habits/learn/compounding", t);
    expect(crumbs.map((c) => c.label)).toEqual([
      "Tools",
      "Habits",
      "Learn",
      "The 1% compounding effect",
    ]);
  });

  // T3: the six (auth) routes are one-crumb screens whose trail hides, so this
  // changes nothing on screen. It exists so the generic fallback is not live.
  it.each([
    ["/sign-in", "Sign in"],
    ["/sign-up", "Sign up"],
    ["/reset-password", "Reset password"],
    ["/update-password", "Update password"],
    ["/verify-email", "Verify email"],
    ["/auth-callback", "Sign in"],
  ])("gives %s a real crumb rather than the Entry fallback", (path, label) => {
    const crumbs = computeBreadcrumbs(path, t);
    expect(crumbs.map((c) => c.label)).toEqual([label]);
    expect(crumbs.at(-1)?.href).toBeUndefined();
  });
});

/**
 * #1251 (T1a) - the mechanism, which is the actual bug.
 *
 * An unmapped segment used to set "previous was known" false, and the branch
 * below then silently SKIPPED the segment after it. `/modules/act/choice-point/new`
 * produced *Modules · ACT · Entry* with no crumb for `new` - and, fatally, a
 * terminal crumb that carried an href.
 *
 * That breaks the invariant the Escape is defined on: "one hop along the screen's
 * own trail" assumes the trail ends AT the current screen, and this code's own
 * marker for "this is the current screen" is an absent href. With a trailing
 * href the Escape reads one crumb too shallow.
 *
 * These tests use paths that are deliberately NOT in the route table, because
 * fixing only the data would leave the next unmapped segment to recur silently -
 * which is the rot this whole effort exists to stop.
 */
describe("computeBreadcrumbs - an unmapped segment never swallows the next (#1251)", () => {
  it("keeps the segment after an unmapped one instead of dropping it", () => {
    const crumbs = computeBreadcrumbs("/modules/cbt/not-a-mapped-route/new", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Modules", "CBT", "Entry", "New"]);
  });

  it("terminates href-less even when the current screen's own segment is unmapped", () => {
    const crumbs = computeBreadcrumbs("/modules/cbt/not-a-mapped-route/also-unmapped", t);
    expect(crumbs.at(-1)?.href).toBeUndefined();
  });

  it("never lets a transparent segment be the last word, which would strand an href", () => {
    // `session` is transparent, so it is skipped where it groups sub-routes. If
    // it lands last on a path with no static entry, skipping it would leave the
    // PARENT as the terminal crumb - carrying its href.
    const crumbs = computeBreadcrumbs("/tools/not-a-mapped-tool/session", t);
    expect(crumbs.at(-1)?.href).toBeUndefined();
  });

  /**
   * The invariant itself, over one path per branch of the resolver. The
   * repo-wide version - every route in `app/` - ships with the gate suite in a
   * later ticket; this ticket is what makes it true.
   */
  it.each([
    ["/notifications"], // static, one crumb
    ["/tools/meditation"], // static, nested
    ["/tools/breathing/session"], // static entry that shadows a transparent segment
    ["/tools/breathing/box-breathing"], // slug template
    ["/tools/habits/learn/compounding"], // slug template, newly added
    ["/modules/cbt/goals/3f9a-uuid"], // opaque id
    ["/routines/3f9a-uuid/edit"], // known sub-segment after an opaque id
    ["/tools/habits/3f9a-uuid/log"], // the other known sub-segment
    ["/modules/act/choice-point"], // newly mapped static
    ["/modules/act/choice-point/new"], // the swallow case
    ["/modules/cbt/saved/3f9a-uuid"], // newly mapped static, then an id
    ["/sign-in"], // (auth)
    ["/modules/cbt/not-a-mapped-route/new"], // wholly unmapped
  ])("%s terminates in an href-less crumb", (path) => {
    const crumbs = computeBreadcrumbs(path, t);
    expect(crumbs.length).toBeGreaterThan(0);
    expect(crumbs.at(-1)?.href).toBeUndefined();
    // And every crumb ABOVE the last one must be navigable, or the Escape's
    // "deepest crumb with an href" lookup would skip past a real ancestor.
    for (const crumb of crumbs.slice(0, -1)) expect(crumb.href).toBeDefined();
  });
});
