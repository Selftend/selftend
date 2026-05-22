import {
  existingWidgetToolIds,
  normalizeWidgetToolId,
  resolveWidget,
  visibleDashboardItems,
} from "@/src/features/home/widget-registry";
import type { CarePlanItem } from "@/src/features/plan/types";

function item(id: string, toolId: string, order: number): CarePlanItem {
  return {
    id,
    userId: "user-1",
    title: toolId,
    toolId,
    route: "/modules/cbt",
    frequency: "daily",
    reminderEnabled: false,
    order,
    active: true,
    createdAt: "2026-05-22T00:00:00.000Z",
    updatedAt: "2026-05-22T00:00:00.000Z",
  };
}

describe("widget registry CBT aliases", () => {
  it("normalizes legacy CBT thought-record widgets to the CBT module widget", () => {
    expect(normalizeWidgetToolId("cbt")).toBe("module-cbt");
    expect(resolveWidget(item("legacy", "cbt", 0), "user-1").type).toBe(
      resolveWidget(item("module", "module-cbt", 0), "user-1").type,
    );
  });

  it("keeps legacy CBT visible when it is the only CBT widget", () => {
    const items = [item("legacy", "cbt", 0), item("mood", "mood", 1)];
    expect(visibleDashboardItems(items).map((candidate) => candidate.id)).toEqual([
      "legacy",
      "mood",
    ]);
  });

  it("hides legacy CBT when the canonical module CBT widget is present", () => {
    const items = [item("legacy", "cbt", 0), item("module", "module-cbt", 1)];
    expect(visibleDashboardItems(items).map((candidate) => candidate.id)).toEqual(["module"]);
    expect(existingWidgetToolIds(items)).toEqual(["module-cbt"]);
  });
});
