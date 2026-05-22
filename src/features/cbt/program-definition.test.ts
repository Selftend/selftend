import { CBT_PROGRAM } from "@/src/features/cbt/program-definition";

describe("CBT_PROGRAM", () => {
  it("has 4 ordered weeks tagged with pillars", () => {
    expect(CBT_PROGRAM).toHaveLength(4);
    expect(CBT_PROGRAM.map((w) => w.pillar)).toEqual(["foundation", "think", "act", "be"]);
  });

  it("gives every task a unique key, a label key, a route, and a signal", () => {
    const keys = new Set<string>();
    for (const week of CBT_PROGRAM) {
      expect(week.tasks.length).toBeGreaterThan(0);
      for (const task of week.tasks) {
        expect(typeof task.labelKey).toBe("string");
        expect(task.route).toBeTruthy();
        expect(typeof task.signal).toBe("function");
        expect(keys.has(task.key)).toBe(false);
        keys.add(task.key);
      }
    }
  });
});
