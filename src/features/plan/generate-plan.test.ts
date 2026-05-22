import { generatePlan, TOOL_DEFS } from "@/src/features/plan/generate-plan";

describe("generatePlan", () => {
  it("respects the light routine cap of 3", () => {
    const plan = generatePlan(
      ["anxiety", "low_mood", "negative_thoughts"],
      ["mood", "breathing", "meditation", "gratitude", "journal", "module-cbt", "habits"],
      "light",
    );
    expect(plan).toHaveLength(3);
  });

  it("respects the standard routine cap of 5", () => {
    const plan = generatePlan(
      ["anxiety", "low_mood", "negative_thoughts"],
      ["mood", "breathing", "meditation", "gratitude", "journal", "module-cbt", "habits"],
      "standard",
    );
    expect(plan).toHaveLength(5);
  });

  it("custom routine has no cap", () => {
    const plan = generatePlan(
      ["anxiety", "low_mood", "negative_thoughts"],
      ["mood", "breathing", "meditation", "gratitude", "journal", "module-cbt", "habits"],
      "custom",
    );
    expect(plan).toHaveLength(7);
  });

  it("orders items by concern-driven priority", () => {
    const plan = generatePlan(
      ["anxiety", "negative_thoughts"],
      ["habits", "breathing", "mood", "meditation", "module-cbt"],
      "standard",
    );
    expect(plan.map((p) => p.toolId)).toEqual([
      "mood",
      "breathing",
      "meditation",
      "module-cbt",
      "habits",
    ]);
  });

  it("appends user-selected tools not driven by any concern", () => {
    const plan = generatePlan(["anxiety"], ["journal"], "standard");
    expect(plan.map((p) => p.toolId)).toEqual(["journal"]);
  });

  it("never duplicates a tool even when multiple concerns add it", () => {
    const plan = generatePlan(["anxiety", "emotional_regulation"], ["breathing"], "standard");
    expect(plan.map((p) => p.toolId)).toEqual(["breathing"]);
  });

  it("returns no items when no tools are selected", () => {
    const plan = generatePlan(["anxiety"], [], "standard");
    expect(plan).toEqual([]);
  });

  it("sets reminderEnabled=false, active=true, and incremental order", () => {
    const plan = generatePlan(
      ["anxiety", "low_mood"],
      ["mood", "breathing", "gratitude"],
      "standard",
    );
    plan.forEach((item, idx) => {
      expect(item.reminderEnabled).toBe(false);
      expect(item.active).toBe(true);
      expect(item.order).toBe(idx);
    });
  });

  it("uses TOOL_DEFS metadata for title, route, frequency", () => {
    const plan = generatePlan([], ["mood"], "standard");
    expect(plan[0].title).toBe(TOOL_DEFS.mood.title);
    expect(plan[0].route).toBe(TOOL_DEFS.mood.route);
    expect(plan[0].frequency).toBe(TOOL_DEFS.mood.frequency);
  });

  it("sleep concern prioritizes meditation and journal", () => {
    const plan = generatePlan(["sleep"], ["habits", "journal", "meditation", "mood"], "standard");
    expect(plan.map((p) => p.toolId)).toEqual(["mood", "meditation", "journal", "habits"]);
  });
});
