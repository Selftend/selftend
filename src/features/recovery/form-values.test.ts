import {
  defaultValues,
  sanitizeRecoveryValues,
  toEditableList,
} from "@/src/features/recovery/form-values";

describe("toEditableList", () => {
  it("returns a single blank row for an empty list", () => {
    expect(toEditableList([])).toEqual([""]);
  });

  it("returns the original values when non-empty", () => {
    expect(toEditableList(["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("sanitizeRecoveryValues", () => {
  it("trims and drops empty recovery keys and commitments", () => {
    const result = sanitizeRecoveryValues({
      recoveryKeys: ["  Walk first ", "", "   "],
      personalSlogan: "  Keep going  ",
      strategyIntegrationNotes: {},
      maintenanceCommitments: ["Weekly review", "  ", "Call friend  "],
    });

    expect(result.recoveryKeys).toEqual(["Walk first"]);
    expect(result.personalSlogan).toBe("Keep going");
    expect(result.maintenanceCommitments).toEqual(["Weekly review", "Call friend"]);
  });

  it("trims strategy notes and removes entries that become empty", () => {
    const result = sanitizeRecoveryValues({
      recoveryKeys: [],
      personalSlogan: "",
      strategyIntegrationNotes: {
        goals: "  do goals  ",
        thoughts: "   ",
        values: "",
      },
      maintenanceCommitments: [],
    });

    expect(result.strategyIntegrationNotes).toEqual({ goals: "do goals" });
  });

  it("has a default form value with one blank row per list", () => {
    expect(defaultValues).toEqual({
      recoveryKeys: [""],
      personalSlogan: "",
      strategyIntegrationNotes: {},
      maintenanceCommitments: [""],
    });
  });
});
