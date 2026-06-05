import { changedWidgetIds } from "@/src/features/widgets/diff-snapshots";
import type { Snapshot, StatPayload } from "@/src/features/widgets/snapshot-types";

const stat = (v: string): StatPayload => ({
  kind: "stat",
  title: "t",
  emoji: "x",
  stats: [{ value: v, label: "l" }],
  open: { label: "o", path: "/p" },
});
const snap = (widgets: Snapshot["widgets"]): Snapshot => ({
  schemaVersion: 1,
  locale: "en",
  generatedAt: "x",
  dateKey: "2026-06-05",
  auth: "signed-in",
  appThemePref: "system",
  widgets,
});

describe("changedWidgetIds", () => {
  it("returns all ids when prev is null", () => {
    expect(changedWidgetIds(null, snap({ a: stat("1"), b: stat("2") })).sort()).toEqual(["a", "b"]);
  });
  it("returns only payloads whose content changed", () => {
    const prev = snap({ a: stat("1"), b: stat("2") });
    const next = snap({ a: stat("1"), b: stat("9") });
    expect(changedWidgetIds(prev, next)).toEqual(["b"]);
  });
  it("includes ids newly present in next", () => {
    expect(changedWidgetIds(snap({ a: stat("1") }), snap({ a: stat("1"), c: stat("3") }))).toEqual([
      "c",
    ]);
  });
});
