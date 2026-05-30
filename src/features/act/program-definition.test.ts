import {
  ACT_PROGRAM,
  atOrAfter,
  type ActProgramSignalData,
} from "@/src/features/act/program-definition";

// Mock the selected-date-store's toLocalDateKey to return YYYY-MM-DD slice
jest.mock("@/src/stores/selected-date-store", () => ({
  toLocalDateKey: (iso: string) => iso.slice(0, 10),
}));

const SINCE = new Date("2026-05-01T00:00:00.000Z").getTime();
const BEFORE = "2026-04-30T23:59:00.000Z"; // before SINCE
const AFTER = "2026-05-02T00:00:00.000Z"; // after SINCE

/** Minimal signal data with all arrays empty and no qualifying events */
const emptyData: ActProgramSignalData = {
  since: SINCE,
  selectedDate: "2026-05-10",
  choicePoints: [],
  valueEntries: [],
  connectionLogs: [],
  observingSessions: [],
  defusionLogs: [],
  expansionLogs: [],
  urgeSurfLogs: [],
  committedActions: [],
  actionSteps: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
describe("atOrAfter", () => {
  it("returns true when the iso is exactly at the since boundary", () => {
    expect(atOrAfter(new Date(SINCE).toISOString(), SINCE)).toBe(true);
  });

  it("returns true when the iso is after the since boundary", () => {
    expect(atOrAfter(AFTER, SINCE)).toBe(true);
  });

  it("returns false when the iso is before the since boundary", () => {
    expect(atOrAfter(BEFORE, SINCE)).toBe(false);
  });

  it("returns false for null", () => {
    expect(atOrAfter(null, SINCE)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(atOrAfter(undefined, SINCE)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ACT_PROGRAM structure
// ---------------------------------------------------------------------------
describe("ACT_PROGRAM", () => {
  it("has 4 ordered phases", () => {
    expect(ACT_PROGRAM).toHaveLength(4);
    expect(ACT_PROGRAM.map((p) => p.key)).toEqual([
      "foundation",
      "bePresent",
      "openUp",
      "doWhatMatters",
    ]);
  });

  it("gives every phase a title, sub, and description i18n key", () => {
    for (const phase of ACT_PROGRAM) {
      expect(phase.themeLabelKey).toBe(`program.phases.${phase.key}.title`);
      expect(phase.themeSubKey).toBe(`program.phases.${phase.key}.sub`);
      expect(phase.themeDescKey).toBe(`program.phases.${phase.key}.description`);
    }
  });

  it("gives every phase at least one milestone", () => {
    for (const phase of ACT_PROGRAM) {
      expect(phase.milestones.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every phase has a dailyPractice", () => {
    for (const phase of ACT_PROGRAM) {
      expect(phase.dailyPractice).toBeDefined();
    }
  });

  it("has all unique task keys across milestones and dailyPractice", () => {
    const keys = new Set<string>();
    for (const phase of ACT_PROGRAM) {
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

  it("gives every task a labelKey, route, and signal", () => {
    for (const phase of ACT_PROGRAM) {
      const tasks = [...phase.milestones, ...(phase.dailyPractice ? [phase.dailyPractice] : [])];
      for (const task of tasks) {
        expect(typeof task.labelKey).toBe("string");
        expect(task.route).toBeTruthy();
        expect(typeof task.signal).toBe("function");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Phase: foundation
// ---------------------------------------------------------------------------
describe("foundation phase signals", () => {
  const [foundation] = ACT_PROGRAM;

  describe("mapChoicePoint milestone (countSince)", () => {
    it("returns current=0, target=1 when no choicePoints", () => {
      expect(foundation.milestones[0].signal(emptyData)).toEqual({ current: 0, target: 1 });
    });

    it("counts only choicePoints created at/after since", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        choicePoints: [
          {
            id: "a",
            userId: "u",
            hooks: [],
            awayMoves: [],
            towardMoves: [],
            notes: "",
            createdAt: AFTER,
            updatedAt: AFTER,
          },
          {
            id: "b",
            userId: "u",
            hooks: [],
            awayMoves: [],
            towardMoves: [],
            notes: "",
            createdAt: BEFORE,
            updatedAt: BEFORE,
          },
        ],
      };
      expect(foundation.milestones[0].signal(data)).toEqual({ current: 1, target: 1 });
    });
  });

  describe("dropAnchorDaily dailyPractice", () => {
    const daily = foundation.dailyPractice!;

    it("returns current=0 when no connection logs on selectedDate", () => {
      expect(daily.signal(emptyData)).toEqual({ current: 0, target: 1 });
    });

    it("returns current=1 when a dropAnchor log matches selectedDate", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        selectedDate: "2026-05-10",
        connectionLogs: [
          {
            id: "cl1",
            userId: "u",
            technique: "dropAnchor",
            activityContext: "",
            noticesFromSenses: "",
            durationMinutes: null,
            moodAfter: null,
            notes: "",
            createdAt: "2026-05-10T09:00:00Z",
            updatedAt: "2026-05-10T09:00:00Z",
          },
        ],
      };
      expect(daily.signal(data)).toEqual({ current: 1, target: 1 });
    });

    it("ignores non-dropAnchor connection logs", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        selectedDate: "2026-05-10",
        connectionLogs: [
          {
            id: "cl2",
            userId: "u",
            technique: "bodyScan",
            activityContext: "",
            noticesFromSenses: "",
            durationMinutes: null,
            moodAfter: null,
            notes: "",
            createdAt: "2026-05-10T09:00:00Z",
            updatedAt: "2026-05-10T09:00:00Z",
          },
        ],
      };
      expect(daily.signal(data)).toEqual({ current: 0, target: 1 });
    });
  });
});

// ---------------------------------------------------------------------------
// Phase: bePresent
// ---------------------------------------------------------------------------
describe("bePresent phase signals", () => {
  const bePresent = ACT_PROGRAM[1];

  describe("observeSelfOnce milestone", () => {
    it("returns current=0, target=1 with no sessions", () => {
      expect(bePresent.milestones[0].signal(emptyData)).toEqual({ current: 0, target: 1 });
    });

    it("counts sessions at/after since", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        observingSessions: [
          {
            id: "os1",
            userId: "u",
            techniqueUsed: "tenDeepBreaths",
            whatWasObserved: "",
            durationMinutes: null,
            moodAfter: null,
            notes: "",
            createdAt: AFTER,
            updatedAt: AFTER,
          },
          {
            id: "os2",
            userId: "u",
            techniqueUsed: "tenDeepBreaths",
            whatWasObserved: "",
            durationMinutes: null,
            moodAfter: null,
            notes: "",
            createdAt: BEFORE,
            updatedAt: BEFORE,
          },
        ],
      };
      expect(bePresent.milestones[0].signal(data)).toEqual({ current: 1, target: 1 });
    });
  });

  describe("bePresentDaily dailyPractice (non-dropAnchor connection)", () => {
    const daily = bePresent.dailyPractice!;

    it("returns current=0 when no non-dropAnchor logs on selectedDate", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        selectedDate: "2026-05-10",
        connectionLogs: [
          {
            id: "cl1",
            userId: "u",
            technique: "dropAnchor",
            activityContext: "",
            noticesFromSenses: "",
            durationMinutes: null,
            moodAfter: null,
            notes: "",
            createdAt: "2026-05-10T09:00:00Z",
            updatedAt: "2026-05-10T09:00:00Z",
          },
        ],
      };
      expect(daily.signal(data)).toEqual({ current: 0, target: 1 });
    });

    it("returns current=1 for a non-dropAnchor log on selectedDate", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        selectedDate: "2026-05-10",
        connectionLogs: [
          {
            id: "cl2",
            userId: "u",
            technique: "bodyScan",
            activityContext: "",
            noticesFromSenses: "",
            durationMinutes: null,
            moodAfter: null,
            notes: "",
            createdAt: "2026-05-10T09:00:00Z",
            updatedAt: "2026-05-10T09:00:00Z",
          },
        ],
      };
      expect(daily.signal(data)).toEqual({ current: 1, target: 1 });
    });
  });
});

// ---------------------------------------------------------------------------
// Phase: openUp
// ---------------------------------------------------------------------------
describe("openUp phase signals", () => {
  const openUp = ACT_PROGRAM[2];

  describe("unhookOnce milestone (defusion)", () => {
    it("returns current=0 with no defusion logs", () => {
      expect(openUp.milestones[0].signal(emptyData)).toEqual({ current: 0, target: 1 });
    });

    it("counts defusion logs at/after since", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        defusionLogs: [
          {
            id: "d1",
            userId: "u",
            fusedThought: "x",
            thoughtCategory: "worry",
            fusionLevelBefore: null,
            techniqueUsed: "subtitles",
            defusedVersion: "",
            fusionLevelAfter: null,
            notes: "",
            createdAt: AFTER,
            updatedAt: AFTER,
          },
        ],
      };
      expect(openUp.milestones[0].signal(data)).toEqual({ current: 1, target: 1 });
    });
  });

  describe("makeRoomOnce milestone (expansion + urgeSurf union)", () => {
    it("returns current=0 with no logs", () => {
      expect(openUp.milestones[1].signal(emptyData)).toEqual({ current: 0, target: 1 });
    });

    it("counts expansion logs", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        expansionLogs: [
          {
            id: "e1",
            userId: "u",
            emotion: "fear",
            bodySensation: "",
            intensityBefore: null,
            struggleSwitchOn: null,
            discomfortType: null,
            techniqueUsed: "fourStepExpansion",
            intensityAfter: null,
            notes: "",
            createdAt: AFTER,
            updatedAt: AFTER,
          },
        ],
      };
      expect(openUp.milestones[1].signal(data)).toEqual({ current: 1, target: 1 });
    });

    it("counts urgeSurf logs", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        urgeSurfLogs: [
          {
            id: "u1",
            userId: "u",
            urgeDescription: "smoke",
            trigger: "",
            peakIntensity: null,
            surfingNotes: "",
            urgeActedOn: false,
            completedAt: AFTER,
            createdAt: AFTER,
            updatedAt: AFTER,
          },
        ],
      };
      expect(openUp.milestones[1].signal(data)).toEqual({ current: 1, target: 1 });
    });

    it("sums both expansion and urgeSurf logs", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        expansionLogs: [
          {
            id: "e1",
            userId: "u",
            emotion: "fear",
            bodySensation: "",
            intensityBefore: null,
            struggleSwitchOn: null,
            discomfortType: null,
            techniqueUsed: "fourStepExpansion",
            intensityAfter: null,
            notes: "",
            createdAt: AFTER,
            updatedAt: AFTER,
          },
        ],
        urgeSurfLogs: [
          {
            id: "u1",
            userId: "u",
            urgeDescription: "smoke",
            trigger: "",
            peakIntensity: null,
            surfingNotes: "",
            urgeActedOn: false,
            completedAt: AFTER,
            createdAt: AFTER,
            updatedAt: AFTER,
          },
        ],
      };
      expect(openUp.milestones[1].signal(data)).toEqual({ current: 2, target: 1 });
    });
  });

  describe("unhookOrMakeRoomDaily dailyPractice (defusion+expansion+urgeSurf union)", () => {
    const daily = openUp.dailyPractice!;

    it("returns current=0 when no logs on selectedDate", () => {
      expect(daily.signal(emptyData)).toEqual({ current: 0, target: 1 });
    });

    it("returns current=1 when any of defusion/expansion/urgeSurf happened on selectedDate", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        selectedDate: "2026-05-10",
        defusionLogs: [
          {
            id: "d1",
            userId: "u",
            fusedThought: "x",
            thoughtCategory: "worry",
            fusionLevelBefore: null,
            techniqueUsed: "subtitles",
            defusedVersion: "",
            fusionLevelAfter: null,
            notes: "",
            createdAt: "2026-05-10T09:00:00Z",
            updatedAt: "2026-05-10T09:00:00Z",
          },
        ],
      };
      expect(daily.signal(data)).toEqual({ current: 1, target: 1 });
    });
  });
});

// ---------------------------------------------------------------------------
// Phase: doWhatMatters
// ---------------------------------------------------------------------------
describe("doWhatMatters phase signals", () => {
  const doWhatMatters = ACT_PROGRAM[3];

  describe("clarifyValue milestone (uses updatedAt)", () => {
    it("returns current=0 with no value entries", () => {
      expect(doWhatMatters.milestones[0].signal(emptyData)).toEqual({ current: 0, target: 1 });
    });

    it("counts value entries where updatedAt is at/after since", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        valueEntries: [
          {
            id: "v1",
            userId: "u",
            lifeDomain: "work",
            valueStatement: "s",
            importanceRating: null,
            currentAlignmentRating: null,
            currentActionsNote: "",
            desiredActionsNote: "",
            barriers: "",
            createdAt: BEFORE,
            updatedAt: AFTER,
          },
          {
            id: "v2",
            userId: "u",
            lifeDomain: "work",
            valueStatement: "s",
            importanceRating: null,
            currentAlignmentRating: null,
            currentActionsNote: "",
            desiredActionsNote: "",
            barriers: "",
            createdAt: BEFORE,
            updatedAt: BEFORE,
          },
        ],
      };
      expect(doWhatMatters.milestones[0].signal(data)).toEqual({ current: 1, target: 1 });
    });
  });

  describe("commitActionOnce milestone", () => {
    it("returns current=0 with no committed actions", () => {
      expect(doWhatMatters.milestones[1].signal(emptyData)).toEqual({ current: 0, target: 1 });
    });

    it("counts committed actions at/after since", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        committedActions: [
          {
            id: "ca1",
            userId: "u",
            lifeDomain: "work",
            title: "t",
            description: "",
            status: "active",
            targetDate: null,
            obstacles: "",
            createdAt: AFTER,
            updatedAt: AFTER,
          },
        ],
      };
      expect(doWhatMatters.milestones[1].signal(data)).toEqual({ current: 1, target: 1 });
    });
  });

  describe("valuesStepDaily dailyPractice (keyed by completedAt)", () => {
    const daily = doWhatMatters.dailyPractice!;

    it("returns current=0 with no action steps", () => {
      expect(daily.signal(emptyData)).toEqual({ current: 0, target: 1 });
    });

    it("returns current=1 when an action step was completed on selectedDate", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        selectedDate: "2026-05-10",
        actionSteps: [
          {
            id: "s1",
            userId: "u",
            actionId: "a1",
            description: "d",
            isCompleted: true,
            completedAt: "2026-05-10T10:00:00Z",
            createdAt: AFTER,
            updatedAt: AFTER,
          },
        ],
      };
      expect(daily.signal(data)).toEqual({ current: 1, target: 1 });
    });

    it("returns current=0 when action step completedAt is on a different date", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        selectedDate: "2026-05-10",
        actionSteps: [
          {
            id: "s1",
            userId: "u",
            actionId: "a1",
            description: "d",
            isCompleted: true,
            completedAt: "2026-05-11T10:00:00Z",
            createdAt: AFTER,
            updatedAt: AFTER,
          },
        ],
      };
      expect(daily.signal(data)).toEqual({ current: 0, target: 1 });
    });

    it("returns current=0 when action step has null completedAt", () => {
      const data: ActProgramSignalData = {
        ...emptyData,
        selectedDate: "2026-05-10",
        actionSteps: [
          {
            id: "s1",
            userId: "u",
            actionId: "a1",
            description: "d",
            isCompleted: false,
            completedAt: null,
            createdAt: AFTER,
            updatedAt: AFTER,
          },
        ],
      };
      expect(daily.signal(data)).toEqual({ current: 0, target: 1 });
    });
  });
});
