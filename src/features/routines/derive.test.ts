import { groundingSlugs } from "@/src/constants/grounding";
import {
  deriveRoutine,
  deriveRoutineStrip,
  isSteppableToolId,
  stepDoneOnDate,
  type RoutineToolRecords,
  type SteppableToolId,
} from "@/src/features/routines/derive";

// Local-time ISO strings (no Z / offset suffix) parse in the runner's local
// timezone, which is also how toLocalDateKey buckets - so these tests are
// deterministic in any TZ without re-testing the shared date utilities.
const DAY = "2026-07-15";
const NEXT_DAY = "2026-07-16";
const PREV_DAY = "2026-07-14";
const onDayTs = `${DAY}T14:30:00`;
const lateOnDayTs = `${DAY}T23:59:59`;
const nextDayTs = `${NEXT_DAY}T00:00:01`;
const prevDayTs = `${PREV_DAY}T23:59:59`;

const steps = (...toolIds: SteppableToolId[]) => toolIds.map((toolId) => ({ toolId }));

const groundingSlug = groundingSlugs[0];

describe("stepDoneOnDate", () => {
  it("matches each dated-log tool's record on the day and rejects other days", () => {
    const records: RoutineToolRecords = {
      moodLogs: [{ dayKey: DAY }],
      journalEntries: [{ dayKey: DAY }],
      gratitudeEntries: [{ dayKey: PREV_DAY }],
      sleepLogs: [{ dayKey: NEXT_DAY }],
      thoughtRecords: [{ dayKey: DAY }],
    };

    expect(stepDoneOnDate("mood", records, DAY)).toBe(true);
    expect(stepDoneOnDate("journal", records, DAY)).toBe(true);
    expect(stepDoneOnDate("cbt", records, DAY)).toBe(true);
    expect(stepDoneOnDate("gratitude", records, DAY)).toBe(false);
    expect(stepDoneOnDate("sleep", records, DAY)).toBe(false);
  });

  // The captured-day modules (#250) and the timestamp-bucketed ones (#330) are
  // two different day models on purpose, so each needs its own boundary test.

  it("reads the captured day verbatim, even when it disagrees with the timestamp", () => {
    // The bug this fixes: an entry logged at 23:30 in Tokyo carries dayKey
    // 2026-07-15, but its UTC instant buckets to the 14th for a viewer in
    // London. The mood screen filed it under the 15th; the routine engine used
    // to file the same entry under the 14th. The captured day is the answer.
    const captured: RoutineToolRecords = { moodLogs: [{ dayKey: DAY }] };

    expect(stepDoneOnDate("mood", captured, DAY)).toBe(true);
    expect(stepDoneOnDate("mood", captured, PREV_DAY)).toBe(false);
    expect(stepDoneOnDate("mood", captured, NEXT_DAY)).toBe(false);
  });

  it("still buckets by the local midnight boundary for tools with no captured day", () => {
    // Exposure sessions have no occurrence offset (they are outside #330's scope),
    // so they convert through the viewer's timezone. Just-before the local midnight
    // boundary counts, just-after does not. This test used activities as its
    // example until activities gained a captured day of their own - the boundary
    // behaviour it guards belongs to whichever tools are still timestamp-bucketed.
    const records: RoutineToolRecords = { exposureSessions: [{ completedAt: lateOnDayTs }] };
    expect(stepDoneOnDate("exposure", records, DAY)).toBe(true);

    const after: RoutineToolRecords = { exposureSessions: [{ completedAt: nextDayTs }] };
    expect(stepDoneOnDate("exposure", after, DAY)).toBe(false);
    expect(stepDoneOnDate("exposure", after, NEXT_DAY)).toBe(true);
  });

  it("cbt reads the captured day verbatim, never the viewer's", () => {
    // A thought record written at 06:00 Monday in Tokyo carries dayKey
    // 2026-07-15 while its UTC instant (21:00 Sunday) buckets to the 14th
    // anywhere west of it. The engine must agree with the CBT history screen
    // rather than re-deriving the day from the timestamp (#330).
    const captured: RoutineToolRecords = { thoughtRecords: [{ dayKey: DAY }] };

    expect(stepDoneOnDate("cbt", captured, DAY)).toBe(true);
    expect(stepDoneOnDate("cbt", captured, PREV_DAY)).toBe(false);
    expect(stepDoneOnDate("cbt", captured, NEXT_DAY)).toBe(false);
  });

  it("a grounding session does not complete a breathing step, and vice versa", () => {
    const groundingOnly: RoutineToolRecords = {
      mindfulnessSessions: [{ exerciseName: groundingSlug, dayKey: DAY }],
    };
    expect(stepDoneOnDate("grounding", groundingOnly, DAY)).toBe(true);
    expect(stepDoneOnDate("breathing", groundingOnly, DAY)).toBe(false);

    // Built-in and user-defined custom breathing exercises both count as
    // breathing: grounding is the closed slug set, everything else breathes.
    const breathingOnly: RoutineToolRecords = {
      mindfulnessSessions: [
        { exerciseName: "box-breathing", dayKey: DAY },
        { exerciseName: "custom-user-exercise-id", dayKey: DAY },
      ],
    };
    expect(stepDoneOnDate("breathing", breathingOnly, DAY)).toBe(true);
    expect(stepDoneOnDate("grounding", breathingOnly, DAY)).toBe(false);
  });

  it("reads the captured day for breathing and grounding, sharing one offset column", () => {
    // Both tools live in mindfulness_sessions, so one captured offset settles both
    // (#330). A session finished at 23:30 in Tokyo carries dayKey 2026-07-15 even
    // though its UTC instant falls on the 14th for a London viewer.
    const captured: RoutineToolRecords = {
      mindfulnessSessions: [
        { exerciseName: "box-breathing", dayKey: DAY },
        { exerciseName: groundingSlug, dayKey: DAY },
      ],
    };

    for (const toolId of ["breathing", "grounding"] as const) {
      expect(stepDoneOnDate(toolId, captured, DAY)).toBe(true);
      expect(stepDoneOnDate(toolId, captured, PREV_DAY)).toBe(false);
      expect(stepDoneOnDate(toolId, captured, NEXT_DAY)).toBe(false);
    }
  });

  it("meditation reads the captured day verbatim, never the viewer's", () => {
    // A sit finished at 23:30 in Tokyo carries dayKey 2026-07-15 while its UTC
    // instant buckets to the 14th anywhere west of it. The engine must file it
    // on the 15th - where the meditation screen files it - whatever the viewer's
    // timezone says (#330).
    const records: RoutineToolRecords = { meditationSessions: [{ dayKey: DAY }] };

    expect(stepDoneOnDate("meditation", records, DAY)).toBe(true);
    expect(stepDoneOnDate("meditation", records, PREV_DAY)).toBe(false);
    expect(stepDoneOnDate("meditation", records, NEXT_DAY)).toBe(false);
    expect(stepDoneOnDate("meditation", { meditationSessions: [] }, DAY)).toBe(false);
  });

  it("habits compare the loggedOn date key directly", () => {
    expect(stepDoneOnDate("habits", { habitLogs: [{ loggedOn: DAY }] }, DAY)).toBe(true);
    expect(stepDoneOnDate("habits", { habitLogs: [{ loggedOn: "2026-07-14" }] }, DAY)).toBe(false);
  });

  it("activities count only completion - a scheduled-but-open activity stays open", () => {
    const records: RoutineToolRecords = {
      activityLogs: [{ completedDayKey: null }, { completedDayKey: DAY }],
    };
    expect(stepDoneOnDate("activities", records, DAY)).toBe(true);
    expect(stepDoneOnDate("activities", { activityLogs: [{ completedDayKey: null }] }, DAY)).toBe(
      false,
    );
    expect(
      stepDoneOnDate("activities", { activityLogs: [{ completedDayKey: PREV_DAY }] }, DAY),
    ).toBe(false);
  });

  it("activities read the captured completion day, never the viewer's", () => {
    // An activity finished at 23:30 in Tokyo carries completedDayKey 2026-07-15 even
    // though its UTC instant falls on the 14th for a London viewer. The engine has to
    // agree with the activities screen about which day that was (#330).
    const captured: RoutineToolRecords = { activityLogs: [{ completedDayKey: DAY }] };
    expect(stepDoneOnDate("activities", captured, DAY)).toBe(true);
    expect(stepDoneOnDate("activities", captured, PREV_DAY)).toBe(false);
    expect(stepDoneOnDate("activities", captured, NEXT_DAY)).toBe(false);
  });

  it("exposure reads the session's completedAt", () => {
    expect(stepDoneOnDate("exposure", { exposureSessions: [{ completedAt: onDayTs }] }, DAY)).toBe(
      true,
    );
    expect(
      stepDoneOnDate("exposure", { exposureSessions: [{ completedAt: prevDayTs }] }, DAY),
    ).toBe(false);
  });

  it("matches each createdAt-dated ACT log on the day and rejects other days", () => {
    const records: RoutineToolRecords = {
      defusionLogs: [{ createdAt: onDayTs }],
      expansionLogs: [{ createdAt: prevDayTs }],
      observingSelfSessions: [{ createdAt: onDayTs }],
      choicePoints: [{ createdAt: nextDayTs }],
    };
    expect(stepDoneOnDate("defusion", records, DAY)).toBe(true);
    expect(stepDoneOnDate("expansion", records, DAY)).toBe(false);
    expect(stepDoneOnDate("observingSelf", records, DAY)).toBe(true);
    expect(stepDoneOnDate("choicePoint", records, DAY)).toBe(false);
  });

  it("urge surfing reads completedAt and bulls-eye reads reviewedAt", () => {
    expect(stepDoneOnDate("urgeSurf", { urgeSurfLogs: [{ completedAt: onDayTs }] }, DAY)).toBe(
      true,
    );
    expect(stepDoneOnDate("urgeSurf", { urgeSurfLogs: [{ completedAt: null }] }, DAY)).toBe(false);
    expect(stepDoneOnDate("bullsEye", { bullsEyeSnapshots: [{ reviewedAt: onDayTs }] }, DAY)).toBe(
      true,
    );
    expect(
      stepDoneOnDate("bullsEye", { bullsEyeSnapshots: [{ reviewedAt: prevDayTs }] }, DAY),
    ).toBe(false);
  });

  it("a drop-anchor log completes BOTH the dropAnchor and connection steps (subset, not split)", () => {
    const dropAnchorLog: RoutineToolRecords = {
      connectionLogs: [{ technique: "dropAnchor", createdAt: onDayTs }],
    };
    expect(stepDoneOnDate("dropAnchor", dropAnchorLog, DAY)).toBe(true);
    expect(stepDoneOnDate("connection", dropAnchorLog, DAY)).toBe(true);

    // Any other connection technique completes connection but NOT drop anchor.
    const otherTechnique: RoutineToolRecords = {
      connectionLogs: [{ technique: "noticeFiveThings", createdAt: onDayTs }],
    };
    expect(stepDoneOnDate("connection", otherTechnique, DAY)).toBe(true);
    expect(stepDoneOnDate("dropAnchor", otherTechnique, DAY)).toBe(false);
  });

  it("committed action derives from any progress update: action created/patched or step added/ticked", () => {
    // Action patched today (created earlier).
    expect(
      stepDoneOnDate(
        "committedAction",
        { committedActions: [{ createdAt: prevDayTs, updatedAt: onDayTs }] },
        DAY,
      ),
    ).toBe(true);
    // Step ticked complete today.
    expect(
      stepDoneOnDate(
        "committedAction",
        { actionSteps: [{ createdAt: prevDayTs, completedAt: onDayTs }] },
        DAY,
      ),
    ).toBe(true);
    // Step added today but not completed (completedAt null) still counts.
    expect(
      stepDoneOnDate(
        "committedAction",
        { actionSteps: [{ createdAt: onDayTs, completedAt: null }] },
        DAY,
      ),
    ).toBe(true);
    // Nothing dated today: an old action with an old step stays open.
    expect(
      stepDoneOnDate(
        "committedAction",
        {
          committedActions: [{ createdAt: prevDayTs, updatedAt: prevDayTs }],
          actionSteps: [{ createdAt: prevDayTs, completedAt: null }],
        },
        DAY,
      ),
    ).toBe(false);
  });

  it("treats absent record slices as no records", () => {
    expect(stepDoneOnDate("mood", {}, DAY)).toBe(false);
    expect(stepDoneOnDate("breathing", {}, DAY)).toBe(false);
    expect(stepDoneOnDate("habits", {}, DAY)).toBe(false);
    expect(stepDoneOnDate("activities", {}, DAY)).toBe(false);
    expect(stepDoneOnDate("exposure", {}, DAY)).toBe(false);
    expect(stepDoneOnDate("defusion", {}, DAY)).toBe(false);
    expect(stepDoneOnDate("connection", {}, DAY)).toBe(false);
    expect(stepDoneOnDate("dropAnchor", {}, DAY)).toBe(false);
    expect(stepDoneOnDate("committedAction", {}, DAY)).toBe(false);
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
    const view = deriveRoutine(threeSteps, { journalEntries: [{ dayKey: DAY }] }, DAY);
    expect(view.status).toBe("in_progress");
    expect(view.doneCount).toBe(1);
    expect(view.steps.map((s) => s.done)).toEqual([false, true, false]);
    expect(view.nextStep?.toolId).toBe("mood");
  });

  it("all steps done derives complete with no next step", () => {
    const view = deriveRoutine(
      threeSteps,
      {
        moodLogs: [{ dayKey: DAY }],
        journalEntries: [{ dayKey: DAY }],
        meditationSessions: [{ dayKey: DAY }],
      },
      DAY,
    );
    expect(view.status).toBe("complete");
    expect(view.doneCount).toBe(3);
    expect(view.nextStep).toBeNull();
  });

  it("an empty routine is not_started, never a hollow complete", () => {
    const view = deriveRoutine([], { moodLogs: [{ dayKey: DAY }] }, DAY);
    expect(view.status).toBe("not_started");
    expect(view.totalCount).toBe(0);
    expect(view.nextStep).toBeNull();
  });

  it("a single-step routine flips straight from not_started to complete", () => {
    const single = steps("sleep");
    expect(deriveRoutine(single, {}, DAY).status).toBe("not_started");
    expect(deriveRoutine(single, { sleepLogs: [{ dayKey: DAY }] }, DAY).status).toBe("complete");
  });
});

describe("deriveRoutineStrip", () => {
  const weekKeys = [
    "2026-07-09",
    "2026-07-10",
    "2026-07-11",
    "2026-07-12",
    "2026-07-13",
    "2026-07-14",
    "2026-07-15",
  ];

  it("fills exactly the days the whole routine derived complete, in day order", () => {
    // Mood logged on days -3 and -1 relative to DAY; every other day is open.
    const strip = deriveRoutineStrip(
      steps("mood"),
      { moodLogs: [{ dayKey: "2026-07-14" }, { dayKey: "2026-07-12" }] },
      weekKeys,
    );

    expect(strip.map((day) => day.dayKey)).toEqual(weekKeys);
    expect(strip.filter((day) => day.complete).map((day) => day.dayKey)).toEqual([
      "2026-07-12",
      "2026-07-14",
    ]);
  });

  it("a partially-done day stays open on a multi-step routine", () => {
    const strip = deriveRoutineStrip(steps("mood", "journal"), { moodLogs: [{ dayKey: DAY }] }, [
      DAY,
    ]);
    expect(strip).toEqual([{ dayKey: DAY, complete: false }]);
  });

  it("an empty routine never fills a day (no hollow complete)", () => {
    const strip = deriveRoutineStrip([], { moodLogs: [{ dayKey: DAY }] }, [DAY]);
    expect(strip).toEqual([{ dayKey: DAY, complete: false }]);
  });
});

/**
 * DBT's six steps (#1980).
 *
 * ☠️ Every DBT table captures an offset beside its timestamp, so the module is
 * the ONLY one whose every leg is `onCapturedDay`. These tests pass a `dayKey`
 * that disagrees with the timestamps around it on purpose: if a leg ever
 * re-bucketed a timestamp through the runner's clock, the row would file under a
 * different day and the assertion would flip. A test that fed matching values
 * would pass either way and notice nothing.
 */
describe("stepDoneOnDate - DBT", () => {
  it("counts a muscle-relaxation session on its own captured day", () => {
    const records: RoutineToolRecords = {
      dbtSessions: [{ sessionSlug: "muscle-relaxation", dayKey: DAY }],
    };
    expect(stepDoneOnDate("muscleRelaxation", records, DAY)).toBe(true);
    expect(stepDoneOnDate("muscleRelaxation", records, NEXT_DAY)).toBe(false);
  });

  it("ignores a session of some other slug", () => {
    // `muscle-relaxation` is the only slug today, but the filter is what stops a
    // second session kind from silently ticking this step when one ships.
    const records: RoutineToolRecords = {
      dbtSessions: [{ sessionSlug: "some-other-session", dayKey: DAY }],
    };
    expect(stepDoneOnDate("muscleRelaxation", records, DAY)).toBe(false);
  });

  it("counts wise mind, judgements, emotion records and scripts on their captured day", () => {
    expect(stepDoneOnDate("wiseMind", { dbtWiseMindCheckins: [{ dayKey: DAY }] }, DAY)).toBe(true);
    expect(stepDoneOnDate("judgement", { dbtJudgements: [{ dayKey: DAY }] }, DAY)).toBe(true);
    expect(stepDoneOnDate("emotionRecord", { dbtEmotionRecords: [{ dayKey: DAY }] }, DAY)).toBe(
      true,
    );
    expect(stepDoneOnDate("script", { dbtScripts: [{ dayKey: DAY }] }, DAY)).toBe(true);

    expect(stepDoneOnDate("wiseMind", { dbtWiseMindCheckins: [{ dayKey: PREV_DAY }] }, DAY)).toBe(
      false,
    );
    expect(stepDoneOnDate("script", { dbtScripts: [{ dayKey: PREV_DAY }] }, DAY)).toBe(false);
  });

  /**
   * ☠️ The opposite-action step is the DONE day, never the created one - and a
   * plan that was never carried out files under no day at all. Writing an
   * opposite action down is not doing it.
   */
  it("counts an opposite-action plan on the day it was DONE, and never while open", () => {
    expect(
      stepDoneOnDate("oppositeAction", { dbtOppositeActionPlans: [{ doneDayKey: DAY }] }, DAY),
    ).toBe(true);
    expect(
      stepDoneOnDate("oppositeAction", { dbtOppositeActionPlans: [{ doneDayKey: null }] }, DAY),
    ).toBe(false);
    expect(
      stepDoneOnDate("oppositeAction", { dbtOppositeActionPlans: [{ doneDayKey: PREV_DAY }] }, DAY),
    ).toBe(false);
  });

  it("derives a DBT routine end to end", () => {
    const view = deriveRoutine(
      steps("wiseMind", "emotionRecord"),
      {
        dbtWiseMindCheckins: [{ dayKey: DAY }],
        dbtEmotionRecords: [{ dayKey: PREV_DAY }],
      },
      DAY,
    );

    expect(view.status).toBe("in_progress");
    expect(view.doneCount).toBe(1);
    expect(view.nextStep?.toolId).toBe("emotionRecord");
  });
});

describe("isSteppableToolId", () => {
  it("accepts the steppable set and rejects other strings", () => {
    expect(isSteppableToolId("breathing")).toBe(true);
    expect(isSteppableToolId("habits")).toBe(true);
    expect(isSteppableToolId("defusion")).toBe(true);
    expect(isSteppableToolId("committedAction")).toBe(true);
    expect(isSteppableToolId("oppositeAction")).toBe(true);
    expect(isSteppableToolId("plan")).toBe(false);
    // Weekly review stays out by decision (weekly by design; a daily routine
    // would read open 6/7 days).
    expect(isSteppableToolId("weeklyReview")).toBe(false);
    expect(isSteppableToolId("")).toBe(false);
  });
});
