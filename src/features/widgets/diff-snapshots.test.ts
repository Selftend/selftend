import { changedWidgetIds } from "@/src/features/widgets/diff-snapshots";
import type { Snapshot, PromptCardPayload } from "@/src/features/widgets/snapshot-types";

const prompt = (v: string): PromptCardPayload => ({
  kind: "prompt",
  title: "t",
  moduleLabel: "m",
  prompt: v,
  cta: { label: "o", path: "/p" },
});
const snap = (widgets: Snapshot["widgets"]): Snapshot => ({
  schemaVersion: 4,
  locale: "en",
  generatedAt: "x",
  dateKey: "2026-06-05",
  auth: "signed-in",
  appThemePref: "system",
  widgets,
});

describe("changedWidgetIds", () => {
  it("returns all ids when prev is null", () => {
    expect(changedWidgetIds(null, snap({ a: prompt("1"), b: prompt("2") })).sort()).toEqual([
      "a",
      "b",
    ]);
  });
  it("returns only payloads whose content changed", () => {
    const prev = snap({ a: prompt("1"), b: prompt("2") });
    const next = snap({ a: prompt("1"), b: prompt("9") });
    expect(changedWidgetIds(prev, next)).toEqual(["b"]);
  });
  it("includes ids newly present in next", () => {
    expect(
      changedWidgetIds(snap({ a: prompt("1") }), snap({ a: prompt("1"), c: prompt("3") })),
    ).toEqual(["c"]);
  });
});
