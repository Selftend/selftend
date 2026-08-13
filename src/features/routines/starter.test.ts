import { buildStarterSteps, STARTER_STEP_CAP, STARTER_STEP_MIN } from "./starter";

describe("buildStarterSteps", () => {
  it("maps kept tool widgets to steppable tools, preserving the kept order", () => {
    expect(buildStarterSteps(["gratitude-latest", "mood-checkin", "journal-week"])).toEqual([
      "gratitude",
      "mood",
      "journal",
    ]);
  });

  it("caps the starter at the first three candidates", () => {
    const steps = buildStarterSteps([
      "mood-checkin",
      "journal-week",
      "gratitude-latest",
      "sleep-latest",
      "meditation-pick",
    ]);
    expect(steps).toHaveLength(STARTER_STEP_CAP);
    expect(steps).toEqual(["mood", "journal", "gratitude"]);
  });

  it("returns null below the two-candidate minimum (no offer)", () => {
    expect(STARTER_STEP_MIN).toBe(2);
    expect(buildStarterSteps(["mood-checkin"])).toBeNull();
    expect(buildStarterSteps([])).toBeNull();
  });

  it("excludes Habits from auto-composition even when the widget was kept", () => {
    expect(buildStarterSteps(["habits-today", "mood-checkin", "journal-week"])).toEqual([
      "mood",
      "journal",
    ]);
    // Habits alone plus one candidate stays below the minimum.
    expect(buildStarterSteps(["habits-today", "mood-checkin"])).toBeNull();
  });

  it("dedupes widgets that exercise the same tool and ignores unknown widgets", () => {
    // `mood-trend` used to be the duplicate here; #973 collapsed it into
    // `mood-checkin`, so a repeat of the same id stands in for the same case.
    expect(
      buildStarterSteps(["mood-checkin", "mood-checkin", "cbt-programme", "breathing-suggested"]),
    ).toEqual(["mood", "breathing"]);
  });
});
