import { computeBreadcrumbs } from "@/src/lib/breadcrumbs";

// Minimal label table covering the keys these paths resolve to. Unknown keys fall
// through to the key itself, which would surface as a bug in an assertion.
const LABELS: Record<string, string> = {
  "sidebar.tools": "Tools",
  "sidebar.mindfulness": "Mindfulness",
  "sidebar.modules": "Modules",
  "sidebar.cbt": "CBT",
  "breadcrumb.goals": "Goals",
  "breadcrumb.entry": "Entry",
  "cbt:mindfulness.exercises.loving-kindness.title": "Loving-kindness",
};
const t = (key: string) => LABELS[key] ?? key;

describe("computeBreadcrumbs", () => {
  it("resolves a mindfulness exercise slug to its real title", () => {
    const crumbs = computeBreadcrumbs("/tools/mindfulness/loving-kindness", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Tools", "Mindfulness", "Loving-kindness"]);
    // Parent crumbs are links; the current page is not.
    expect(crumbs[0].href).toBe("/tools");
    expect(crumbs[1].href).toBe("/tools/mindfulness");
    expect(crumbs[2].href).toBeUndefined();
  });

  it("falls back to a generic label for an opaque-id detail route", () => {
    const crumbs = computeBreadcrumbs("/modules/cbt/goals/3f9a-uuid", t);
    expect(crumbs.map((c) => c.label)).toEqual(["Modules", "CBT", "Goals", "Entry"]);
  });

  it("returns nothing for the root", () => {
    expect(computeBreadcrumbs("/", t)).toEqual([]);
  });
});
