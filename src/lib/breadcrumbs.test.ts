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
