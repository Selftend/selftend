import { DEFAULT_WIDGET_IDS } from "@/src/features/home/seeding";
import {
  CONCERN_KEYS,
  isConcernKey,
  resolveConcernWidgetIds,
  START_HERE_TARGETS,
} from "@/src/features/onboarding/concerns";

describe("resolveConcernWidgetIds", () => {
  it("returns the defaults when nothing is picked", () => {
    expect(resolveConcernWidgetIds([])).toEqual([...DEFAULT_WIDGET_IDS]);
  });

  it("puts mood-checkin first, then picked concerns' widgets in pick order", () => {
    const result = resolveConcernWidgetIds(["sleep", "habits"]);
    expect(result[0]).toBe("mood-checkin");
    expect(result.slice(1, 4)).toEqual(["sleep-latest", "meditation-pick", "breathing-suggested"]);
    expect(result).toContain("habits-today");
  });

  it("dedupes widgets shared between concerns", () => {
    const result = resolveConcernWidgetIds(["anxious-thoughts", "stress-overwhelm"]);
    expect(result.filter((id) => id === "breathing-suggested")).toHaveLength(1);
  });

  it("always contains every default widget exactly once", () => {
    const result = resolveConcernWidgetIds(["low-mood"]);
    for (const id of DEFAULT_WIDGET_IDS) {
      expect(result.filter((r) => r === id)).toHaveLength(1);
    }
    expect(result).toHaveLength(DEFAULT_WIDGET_IDS.length);
  });

  it("ignores unknown keys", () => {
    expect(resolveConcernWidgetIds(["not-a-concern"])).toEqual([...DEFAULT_WIDGET_IDS]);
  });
});

describe("concern metadata", () => {
  it("has a start-here target for every concern", () => {
    for (const key of CONCERN_KEYS) {
      expect(START_HERE_TARGETS[key]).toMatch(/^\//);
    }
  });

  it("isConcernKey narrows correctly", () => {
    expect(isConcernKey("sleep")).toBe(true);
    expect(isConcernKey("nope")).toBe(false);
    expect(isConcernKey(3)).toBe(false);
  });
});
