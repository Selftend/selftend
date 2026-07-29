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
  "sidebar.gratitudeLog": "Gratitude log",
  "breadcrumb.history": "History",
  "breadcrumb.favorites": "Favorites",
  "sidebar.routines": "Routines",
  "breadcrumb.edit": "Edit",
};
const t = (key: string) => LABELS[key] ?? key;

describe("computeBreadcrumbs", () => {
  it("resolves the meditation route to its static label", () => {
    const crumbs = computeBreadcrumbs("/tools/meditation", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Tools", "Meditation"]);
    expect(crumbs[0].href).toBe("/tools");
    expect(crumbs[1].href).toBeUndefined();
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

  // #468 sweep: the favorites page fell through to the dynamic-segment branch
  // and read "Tools · Gratitude log · Entry".
  it("labels the gratitude favorites page as Favorites, not a generic entry", () => {
    const crumbs = computeBreadcrumbs("/tools/gratitude-log/favorites", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Tools", "Gratitude log", "Favorites"]);
    expect(crumbs[2].href).toBeUndefined();
  });
});
