import { buildWidgetRecommendations } from "@/src/features/onboarding/recommendations";

describe("buildWidgetRecommendations", () => {
  it("returns nothing when the user chooses nothing", () => {
    expect(
      buildWidgetRecommendations({
        concerns: [],
        moduleInterests: [],
        guidance: "self-directed",
        selectedToolWidgetIds: [],
      }),
    ).toEqual([]);
  });

  it("suggests only shared tools for concerns", () => {
    const result = buildWidgetRecommendations({
      concerns: ["anxious-thoughts"],
      moduleInterests: [],
      guidance: "guided",
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

  it("uses program widgets for guided module choices", () => {
    const result = buildWidgetRecommendations({
      concerns: [],
      moduleInterests: ["act", "cbt"],
      guidance: "guided",
      selectedToolWidgetIds: [],
    });

    expect(result.map((item) => item.widgetId)).toEqual(["act-programme", "cbt-programme"]);
  });

  it("uses static module shortcuts for self-directed choices", () => {
    const result = buildWidgetRecommendations({
      concerns: [],
      moduleInterests: ["cbt", "act"],
      guidance: "self-directed",
      selectedToolWidgetIds: [],
    });

    expect(result.map((item) => item.widgetId)).toEqual([
      "cbt-module-shortcut",
      "act-module-shortcut",
    ]);
  });

  it("does not cap selected tools and removes duplicates without changing order", () => {
    const result = buildWidgetRecommendations({
      concerns: ["reflection", "sleep"],
      moduleInterests: [],
      guidance: "self-directed",
      selectedToolWidgetIds: [
        "mood-checkin",
        "mood-trend",
        "breathing-suggested",
        "journal-week",
        "grounding-log",
        "gratitude-latest",
        "meditation-pick",
        "sleep-latest",
        "habits-today",
      ],
    });

    expect(result).toHaveLength(9);
    expect(result.map((item) => item.widgetId)).toEqual([
      "mood-checkin",
      "mood-trend",
      "breathing-suggested",
      "journal-week",
      "grounding-log",
      "gratitude-latest",
      "meditation-pick",
      "sleep-latest",
      "habits-today",
    ]);
  });
});
