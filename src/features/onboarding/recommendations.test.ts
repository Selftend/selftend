import { CONCERN_KEYS } from "@/src/features/onboarding/concerns";
import {
  SHARED_TOOL_WIDGET_IDS,
  buildWidgetRecommendations,
} from "@/src/features/onboarding/recommendations";

describe("buildWidgetRecommendations", () => {
  it("returns nothing when the user chooses nothing", () => {
    expect(
      buildWidgetRecommendations({
        concerns: [],
        moduleInterests: [],
        selectedToolWidgetIds: [],
      }),
    ).toEqual([]);
  });

  it("suggests only shared tools for concerns", () => {
    const result = buildWidgetRecommendations({
      concerns: ["anxious-thoughts"],
      moduleInterests: [],
      selectedToolWidgetIds: ["mood-checkin", "breathing-suggested", "journal-week"],
    });

    expect(result.map((item) => item.widgetId)).toEqual([
      "mood-checkin",
      "breathing-suggested",
      "journal-week",
    ]);
    expect(result.map((item) => item.widgetId)).not.toEqual(
      expect.arrayContaining(["cbt-open-record", "act-drop-anchor"]),
    );
  });

  // There used to be a second case here: the same call with `guidance:
  // "self-directed"`, expecting the two `-module-shortcut` ids. #973 retired
  // those ids, so the onboarding guidance answer has nothing left to select and
  // a picked module resolves to its programme id either way. The input no
  // longer carries `guidance` at all, which is what makes the pair of cases one.
  it("uses the programme widget for a picked module, in the order picked", () => {
    const result = buildWidgetRecommendations({
      concerns: [],
      moduleInterests: ["act", "cbt"],
      selectedToolWidgetIds: [],
    });

    expect(result.map((item) => item.widgetId)).toEqual(["act-programme", "cbt-programme"]);
    expect(result.map((item) => item.reason)).toEqual(["module", "module"]);
  });

  it("does not cap selected tools and removes duplicates without changing order", () => {
    const result = buildWidgetRecommendations({
      concerns: ["reflection", "sleep"],
      moduleInterests: [],
      selectedToolWidgetIds: [
        "mood-checkin",
        "breathing-suggested",
        "journal-week",
        "grounding-log",
        "gratitude-latest",
        "meditation-pick",
        "sleep-latest",
        "habits-today",
      ],
    });

    expect(result).toHaveLength(8);
    expect(result.map((item) => item.widgetId)).toEqual([
      "mood-checkin",
      "breathing-suggested",
      "journal-week",
      "grounding-log",
      "gratitude-latest",
      "meditation-pick",
      "sleep-latest",
      "habits-today",
    ]);
  });

  it("no longer offers the three collapsed ids (#973)", () => {
    const result = buildWidgetRecommendations({
      concerns: [...CONCERN_KEYS],
      moduleInterests: ["cbt", "act"],
      selectedToolWidgetIds: [...SHARED_TOOL_WIDGET_IDS],
    });

    const offered = result.map((item) => item.widgetId);
    for (const retired of ["mood-trend", "cbt-module-shortcut", "act-module-shortcut"]) {
      expect(offered).not.toContain(retired);
    }
  });
});
