import { CBT_PROGRAM } from "@/src/features/cbt/program-definition";

describe("CBT_PROGRAM", () => {
  it("has 5 ordered workbook-arc phases", () => {
    expect(CBT_PROGRAM).toHaveLength(5);
    expect(CBT_PROGRAM.map((p) => p.key)).toEqual([
      "assessment",
      "formulation",
      "thinking",
      "behavioural",
      "resilience",
    ]);
  });

  it("gives every phase a title, subtitle, and description i18n key", () => {
    for (const phase of CBT_PROGRAM) {
      expect(phase.themeLabelKey).toBe(`program.weeks.${phase.key}.title`);
      expect(phase.themeSubKey).toBe(`program.weeks.${phase.key}.sub`);
      expect(phase.themeDescKey).toBe(`program.weeks.${phase.key}.description`);
    }
  });

  it("gives every phase at least one milestone", () => {
    for (const phase of CBT_PROGRAM) {
      expect(phase.milestones.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("gives assessment, thinking, behavioural, and resilience a dailyPractice; formulation has none", () => {
    const withPractice = CBT_PROGRAM.filter((p) => p.dailyPractice !== undefined).map((p) => p.key);
    const withoutPractice = CBT_PROGRAM.filter((p) => p.dailyPractice === undefined).map(
      (p) => p.key,
    );
    expect(withPractice).toEqual(["assessment", "thinking", "behavioural", "resilience"]);
    expect(withoutPractice).toEqual(["formulation"]);
  });

  it("has all unique task keys across milestones and dailyPractice", () => {
    const keys = new Set<string>();
    for (const phase of CBT_PROGRAM) {
      for (const task of phase.milestones) {
        expect(keys.has(task.key)).toBe(false);
        keys.add(task.key);
      }
      if (phase.dailyPractice) {
        expect(keys.has(phase.dailyPractice.key)).toBe(false);
        keys.add(phase.dailyPractice.key);
      }
    }
  });

  it("gives every task a label key, a route, and a signal", () => {
    for (const phase of CBT_PROGRAM) {
      const tasks = [...phase.milestones, ...(phase.dailyPractice ? [phase.dailyPractice] : [])];
      expect(tasks.length).toBeGreaterThan(0);
      for (const task of tasks) {
        expect(typeof task.labelKey).toBe("string");
        expect(task.route).toBeTruthy();
        expect(typeof task.signal).toBe("function");
      }
    }
  });
});
