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
});
