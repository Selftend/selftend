import type { RoutineToolRecords } from "@/src/features/routines/derive";
import {
  areOfferRecordsReady,
  areToolRecordsReady,
  countToolsWithRecords,
  DISTINCT_STEPPABLE_TOOLS,
  SECOND_ACTION_MIN,
  toolsWithRecords,
  type OfferOnlyRecords,
} from "@/src/features/routines/starter-offer";
import { buildStarterSteps, STARTER_STEP_MIN } from "@/src/features/routines/starter";

// Every slice fetched and empty: the loaded-but-recordless baseline.
function emptyRecords(): RoutineToolRecords {
  return {
    moodLogs: [],
    journalEntries: [],
    gratitudeEntries: [],
    sleepLogs: [],
    thoughtRecords: [],
    mindfulnessSessions: [],
    meditationSessions: [],
    habitLogs: [],
    activityLogs: [],
    exposureSessions: [],
    defusionLogs: [],
    expansionLogs: [],
    urgeSurfLogs: [],
    connectionLogs: [],
    observingSelfSessions: [],
    bullsEyeSnapshots: [],
    choicePoints: [],
    committedActions: [],
    actionSteps: [],
  };
}

// The three prompting tools a routine cannot admit, fetched and empty.
function emptyOfferOnly(): OfferOnlyRecords {
  return { worryEntries: [], angerLogs: [], selfCareLogs: [] };
}

describe("areOfferRecordsReady", () => {
  it("is ready only when every slice has been fetched", () => {
    expect(areOfferRecordsReady(emptyRecords(), emptyOfferOnly())).toBe(true);
  });

  it("is not ready while any routine-tool slice is still unfetched", () => {
    const records = emptyRecords();
    delete records.connectionLogs;
    expect(areOfferRecordsReady(records, emptyOfferOnly())).toBe(false);
  });

  it("is not ready while any offer-only slice is still unfetched", () => {
    const offerOnly = emptyOfferOnly();
    delete offerOnly.angerLogs;
    expect(areOfferRecordsReady(emptyRecords(), offerOnly)).toBe(false);
  });

  it("is not ready for the all-absent shape", () => {
    expect(areOfferRecordsReady({}, {})).toBe(false);
  });
});

describe("countToolsWithRecords", () => {
  it("counts zero for a user with no records anywhere", () => {
    expect(countToolsWithRecords(emptyRecords(), emptyOfferOnly())).toBe(0);
  });

  it("counts each tool with at least one record once", () => {
    const records = {
      ...emptyRecords(),
      moodLogs: [{ dayKey: "2026-09-01" }, { dayKey: "2026-09-02" }],
      journalEntries: [{ dayKey: "2026-09-02" }],
    };
    expect(countToolsWithRecords(records, emptyOfferOnly())).toBe(2);
  });

  it("counts a tool a routine cannot admit as the second action too", () => {
    // Mood then worry: two in-app actions in two tools. The routine offered is
    // composed from the kept widgets, not from these records, so the second
    // tool need not be one a routine can hold (#1677, decided 2026-09-02).
    const records = { ...emptyRecords(), moodLogs: [{ dayKey: "2026-09-01" }] };
    const offerOnly = { ...emptyOfferOnly(), worryEntries: [{ id: "w1" }] };
    expect(countToolsWithRecords(records, offerOnly)).toBe(2);
  });

  it("counts worry, anger and self-care once each", () => {
    const offerOnly: OfferOnlyRecords = {
      worryEntries: [{ id: "w1" }, { id: "w2" }],
      angerLogs: [{ id: "a1" }],
      selfCareLogs: [{ logDate: "2026-09-02" }],
    };
    expect(countToolsWithRecords(emptyRecords(), offerOnly)).toBe(3);
  });

  it("splits the shared mindfulness table into breathing and grounding by slug", () => {
    const grounding = {
      ...emptyRecords(),
      mindfulnessSessions: [{ exerciseName: "54321", dayKey: "2026-09-02" }],
    };
    expect(countToolsWithRecords(grounding, emptyOfferOnly())).toBe(1);

    const both = {
      ...emptyRecords(),
      mindfulnessSessions: [
        { exerciseName: "54321", dayKey: "2026-09-02" },
        { exerciseName: "box-breathing", dayKey: "2026-09-02" },
      ],
    };
    expect(countToolsWithRecords(both, emptyOfferOnly())).toBe(2);
  });

  it("counts a drop-anchor log as one tool, not two", () => {
    // dropAnchor logs live inside connectionLogs as a subset; counting the
    // subset and the superset separately would turn one save into two
    // "distinct tools" and fire the offer at the first action.
    const records = {
      ...emptyRecords(),
      connectionLogs: [{ technique: "dropAnchor", createdAt: "2026-09-02T10:00:00Z" }],
    };
    expect(countToolsWithRecords(records, emptyOfferOnly())).toBe(1);
  });

  it("ignores scheduled-but-never-completed activities", () => {
    const records = {
      ...emptyRecords(),
      activityLogs: [{ completedDayKey: null }],
    };
    expect(countToolsWithRecords(records, emptyOfferOnly())).toBe(0);
  });

  it("counts committed action from a step alone", () => {
    const records = {
      ...emptyRecords(),
      actionSteps: [{ createdAt: "2026-09-02T10:00:00Z", completedAt: null }],
    };
    expect(countToolsWithRecords(records, emptyOfferOnly())).toBe(1);
  });

  it("treats an unfetched slice as recordless rather than crashing", () => {
    const records: RoutineToolRecords = { moodLogs: [{ dayKey: "2026-09-02" }] };
    expect(countToolsWithRecords(records, {})).toBe(1);
  });
});

describe("SECOND_ACTION_MIN", () => {
  it("is the glossary's second action", () => {
    expect(SECOND_ACTION_MIN).toBe(2);
  });
});

describe("toolsWithRecords (#1954)", () => {
  it("lists the distinct steppable tools with a record, in the fixed array order", () => {
    // Records "arrived" gratitude-first; the answer is still array order.
    const records = emptyRecords();
    records.gratitudeEntries = [{ dayKey: "2026-09-03" }];
    records.moodLogs = [{ dayKey: "2026-09-01" }];
    records.connectionLogs = [{ technique: "dropAnchor", createdAt: "2026-09-02T08:00:00.000Z" }];

    expect(toolsWithRecords(records)).toEqual(["mood", "gratitude", "connection"]);
    expect(toolsWithRecords(emptyRecords())).toEqual([]);
  });

  it("is a subsequence of DISTINCT_STEPPABLE_TOOLS, so it can never name dropAnchor", () => {
    const records = emptyRecords();
    records.connectionLogs = [{ technique: "dropAnchor", createdAt: "2026-09-02T08:00:00.000Z" }];
    const tools = toolsWithRecords(records);
    expect(tools).toEqual(["connection"]);
    expect(tools.every((tool) => DISTINCT_STEPPABLE_TOOLS.includes(tool))).toBe(true);
  });
});

describe("areToolRecordsReady", () => {
  it("is the steppable half of the offer readiness", () => {
    expect(areToolRecordsReady(emptyRecords())).toBe(true);
    const { moodLogs: _unfetched, ...rest } = emptyRecords();
    expect(areToolRecordsReady(rest)).toBe(false);
    expect(areToolRecordsReady({})).toBe(false);
  });
});

/**
 * Sub-decision 2 of spec #1885 §5.3: composition and the gate now read ONE set, so a
 * successful composition implies the gate (`STARTER_STEP_MIN` = `SECOND_ACTION_MIN`) -
 * which is why `/routines`' empty state adds no records gate. But NOT the other way
 * round, and this pins the direction that still matters.
 */
describe("composition against the second-action gate", () => {
  it("can pass the gate and still compose nothing: records only in worry, anger and self-care", () => {
    const offerOnly = { worryEntries: [{}], angerLogs: [{}], selfCareLogs: [{}] };
    expect(countToolsWithRecords(emptyRecords(), offerOnly)).toBeGreaterThanOrEqual(
      SECOND_ACTION_MIN,
    );
    expect(buildStarterSteps(toolsWithRecords(emptyRecords()))).toBeNull();
  });

  it("can pass the gate and still compose nothing: habits plus one everyday tool", () => {
    const records = emptyRecords();
    records.habitLogs = [{ loggedOn: "2026-09-01" }];
    records.moodLogs = [{ dayKey: "2026-09-01" }];
    expect(countToolsWithRecords(records, emptyOfferOnly())).toBe(2);
    expect(buildStarterSteps(toolsWithRecords(records))).toBeNull();
  });

  it("never composes without passing the gate", () => {
    // Every composition has >= STARTER_STEP_MIN distinct steppable tools, and the
    // count is a superset of those - the arithmetic the dissolved gate rested on.
    expect(STARTER_STEP_MIN).toBe(SECOND_ACTION_MIN);
    const records = emptyRecords();
    records.thoughtRecords = [{ dayKey: "2026-09-01" }];
    records.defusionLogs = [{ createdAt: "2026-09-02T08:00:00.000Z" }];
    const composed = buildStarterSteps(toolsWithRecords(records));
    expect(composed).toEqual(["cbt", "defusion"]);
    expect(countToolsWithRecords(records, {})).toBeGreaterThanOrEqual(SECOND_ACTION_MIN);
  });
});
