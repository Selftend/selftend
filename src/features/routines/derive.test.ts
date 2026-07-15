import { groundingSlugs } from "@/src/constants/grounding";
import {
  deriveRoutine,
  isSteppableToolId,
  stepDoneOnDate,
  type RoutineToolRecords,
  type SteppableToolId,
} from "@/src/features/routines/derive";

// Local-time ISO strings (no Z / offset suffix) parse in the runner's local
// timezone, which is also how toLocalDateKey buckets - so these tests are
// deterministic in any TZ without re-testing the shared date utilities.
const DAY = "2026-07-15";
const onDayTs = `${DAY}T14:30:00`;
const lateOnDayTs = `${DAY}T23:59:59`;
const nextDayTs = "2026-07-16T00:00:01";
const prevDayTs = "2026-07-14T23:59:59";

const steps = (...toolIds: SteppableToolId[]) => toolIds.map((toolId) => ({ toolId }));

const groundingSlug = groundingSlugs[0];

describe("stepDoneOnDate", () => {
  it("matches each dated-log tool's record on the day and rejects other days", () => {
    const records: RoutineToolRecords = {
      moodLogs: [{ loggedAt: onDayTs }],
      journalEntries: [{ occurredAt: onDayTs, createdAt: prevDayTs }],
      gratitudeEntries: [{ loggedAt: prevDayTs }],
      sleepLogs: [{ loggedAt: nextDayTs }],
      thoughtRecords: [{ createdAt: onDayTs }],
    };

    expect(stepDoneOnDate("mood", records, DAY)).toBe(true);
    expect(stepDoneOnDate("journal", records, DAY)).toBe(true);
    expect(stepDoneOnDate("cbt", records, DAY)).toBe(true);
    expect(stepDoneOnDate("gratitude", records, DAY)).toBe(false);
    expect(stepDoneOnDate("sleep", records, DAY)).toBe(false);
  });

  it("buckets by the local midnight boundary: just-before counts, just-after does not", () => {
    const records: RoutineToolRecords = { moodLogs: [{ loggedAt: lateOnDayTs }] };
    expect(stepDoneOnDate("mood", records, DAY)).toBe(true);

    const after: RoutineToolRecords = { moodLogs: [{ loggedAt: nextDayTs }] };
    expect(stepDoneOnDate("mood", after, DAY)).toBe(false);
    expect(stepDoneOnDate("mood", after, "2026-07-16")).toBe(true);
  });

  it("journal entries without occurredAt fall back to createdAt", () => {
    const records: RoutineToolRecords = {
      journalEntries: [{ occurredAt: null, createdAt: onDayTs }],
    };
    expect(stepDoneOnDate("journal", records, DAY)).toBe(true);
  });

  it("a grounding session does not complete a breathing step, and vice versa", () => {
    const groundingOnly: RoutineToolRecords = {
      mindfulnessSessions: [{ exerciseName: groundingSlug, completedAt: onDayTs }],
    };
    expect(stepDoneOnDate("grounding", groundingOnly, DAY)).toBe(true);
    expect(stepDoneOnDate("breathing", groundingOnly, DAY)).toBe(false);

    // Built-in and user-defined custom breathing exercises both count as
    // breathing: grounding is the closed slug set, everything else breathes.
    const breathingOnly: RoutineToolRecords = {
      mindfulnessSessions: [
        { exerciseName: "box-breathing", completedAt: onDayTs },
        { exerciseName: "custom-user-exercise-id", completedAt: onDayTs },
      ],
    };
    expect(stepDoneOnDate("breathing", breathingOnly, DAY)).toBe(true);
    expect(stepDoneOnDate("grounding", breathingOnly, DAY)).toBe(false);
  });

  it("meditation reads completedAt and ignores incomplete sessions", () => {
    const records: RoutineToolRecords = {
      meditationSessions: [{ completedAt: null }, { completedAt: onDayTs }],
    };
    expect(stepDoneOnDate("meditation", records, DAY)).toBe(true);
    expect(stepDoneOnDate("meditation", { meditationSessions: [{ completedAt: null }] }, DAY)).toBe(
      false,
    );
  });

  it("habits compare the loggedOn date key directly", () => {
    expect(stepDoneOnDate("habits", { habitLogs: [{ loggedOn: DAY }] }, DAY)).toBe(true);
    expect(stepDoneOnDate("habits", { habitLogs: [{ loggedOn: "2026-07-14" }] }, DAY)).toBe(false);
  });

  it("treats absent record slices as no records", () => {
    expect(stepDoneOnDate("mood", {}, DAY)).toBe(false);
    expect(stepDoneOnDate("breathing", {}, DAY)).toBe(false);
    expect(stepDoneOnDate("habits", {}, DAY)).toBe(false);
  });
});

describe("deriveRoutine", () => {
  const threeSteps = steps("mood", "journal", "meditation");

  it("zero records derives not_started", () => {
    const view = deriveRoutine(threeSteps, {}, DAY);
    expect(view.status).toBe("not_started");
    expect(view.doneCount).toBe(0);
    expect(view.totalCount).toBe(3);
    expect(view.nextStep?.toolId).toBe("mood");
  });

  it("some steps done derives in_progress and points at the first open step", () => {
    const view = deriveRoutine(
      threeSteps,
      { journalEntries: [{ occurredAt: onDayTs, createdAt: onDayTs }] },
      DAY,
    );
    expect(view.status).toBe("in_progress");
    expect(view.doneCount).toBe(1);
    expect(view.steps.map((s) => s.done)).toEqual([false, true, false]);
    expect(view.nextStep?.toolId).toBe("mood");
  });

  it("all steps done derives complete with no next step", () => {
    const view = deriveRoutine(
      threeSteps,
      {
        moodLogs: [{ loggedAt: onDayTs }],
        journalEntries: [{ occurredAt: lateOnDayTs, createdAt: prevDayTs }],
        meditationSessions: [{ completedAt: onDayTs }],
      },
      DAY,
    );
    expect(view.status).toBe("complete");
    expect(view.doneCount).toBe(3);
    expect(view.nextStep).toBeNull();
  });

  it("an empty routine is not_started, never a hollow complete", () => {
    const view = deriveRoutine([], { moodLogs: [{ loggedAt: onDayTs }] }, DAY);
    expect(view.status).toBe("not_started");
    expect(view.totalCount).toBe(0);
    expect(view.nextStep).toBeNull();
  });

  it("a single-step routine flips straight from not_started to complete", () => {
    const single = steps("sleep");
    expect(deriveRoutine(single, {}, DAY).status).toBe("not_started");
    expect(deriveRoutine(single, { sleepLogs: [{ loggedAt: onDayTs }] }, DAY).status).toBe(
      "complete",
    );
  });
});

describe("isSteppableToolId", () => {
  it("accepts the steppable set and rejects other strings", () => {
    expect(isSteppableToolId("breathing")).toBe(true);
    expect(isSteppableToolId("habits")).toBe(true);
    expect(isSteppableToolId("plan")).toBe(false);
    expect(isSteppableToolId("")).toBe(false);
  });
});
