import { DBT_PROGRAM } from "./program-definition";
import { deriveDbtProgram, type DeriveDbtProgramInput } from "./derive-dbt-program";
import enDbt from "@/src/i18n/locales/en/dbt.json";

/**
 * The DBT programme's derivation (spec §4).
 *
 * Every assertion here is about a RULE the spec states, not about the current
 * phase list: the phases are data, and a fifth one would not make any of these
 * wrong.
 */

const STARTED = "2026-06-01T09:00:00.000Z";
const AFTER = "2026-06-02T09:00:00.000Z";
const BEFORE = "2026-05-01T09:00:00.000Z";

function input(overrides: Partial<DeriveDbtProgramInput> = {}): DeriveDbtProgramInput {
  return {
    startedAt: STARTED,
    completedAt: null,
    selectedDate: "2026-06-02",
    phaseIndex: 0,
    phaseStartedAt: STARTED,
    copingPlan: null,
    sessions: [],
    wiseMindCheckins: [],
    judgements: [],
    emotionRecords: [],
    oppositeActionPlans: [],
    scripts: [],
    ...overrides,
  };
}

const session = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "s",
    userId: "u",
    sessionSlug: "muscle-relaxation",
    variant: "full",
    durationSeconds: 720,
    completedAt: AFTER,
    completedOffsetMinutes: 0,
    dayKey: "2026-06-02",
    createdAt: AFTER,
    updatedAt: AFTER,
    ...overrides,
  }) as DeriveDbtProgramInput["sessions"][number];

const record = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "r",
    userId: "u",
    createdAt: AFTER,
    createdOffsetMinutes: 0,
    dayKey: "2026-06-02",
    updatedAt: AFTER,
    ...overrides,
  }) as never;

describe("the DBT programme's shape", () => {
  it("is the four skill groups, in the book's order", () => {
    expect(DBT_PROGRAM.map((phase) => phase.key)).toEqual([
      "distressTolerance",
      "mindfulness",
      "emotionRegulation",
      "interpersonal",
    ]);
  });

  /**
   * ☠️ The phase's words ARE the home's group words. Reading them from one
   * place is what keeps the programme and the module home from describing the
   * same group differently.
   */
  it("names each phase with the home's own group strings", () => {
    for (const phase of DBT_PROGRAM) {
      expect(phase.themeLabelKey).toBe(`groups.${phase.key}.name`);
      expect((enDbt.groups as Record<string, { name: string }>)[phase.key]!.name).toBeTruthy();
    }
  });

  it("gives every task a label in the copy", () => {
    for (const phase of DBT_PROGRAM) {
      for (const task of [
        ...phase.milestones,
        ...(phase.dailyPractice ? [phase.dailyPractice] : []),
      ]) {
        const key = task.labelKey.replace("program.tasks.", "");
        expect((enDbt.program.tasks as Record<string, string>)[key]).toBeTruthy();
      }
    }
  });

  it("gives every phase two milestones and one daily practice, each with target 1", () => {
    const view = deriveDbtProgram(input());
    expect(view.phase?.milestones).toHaveLength(2);
    expect(view.phase?.dailyPractice).not.toBeNull();
    for (const task of view.phase!.milestones) expect(task.target).toBe(1);
    expect(view.phase!.dailyPractice!.target).toBe(1);
  });
});

describe("the programme's states", () => {
  it("is not started until it is started", () => {
    expect(deriveDbtProgram(input({ startedAt: null })).status).toBe("not_started");
  });

  it("is graduated once it is completed, whatever the phase says", () => {
    const view = deriveDbtProgram(input({ completedAt: AFTER, phaseIndex: 3 }));
    expect(view.status).toBe("graduated");
    expect(view.phase).toBeNull();
  });

  it("clamps a phase index that has run past the end", () => {
    expect(deriveDbtProgram(input({ phaseIndex: 99 })).phaseIndex).toBe(3);
    expect(deriveDbtProgram(input({ phaseIndex: -4 })).phaseIndex).toBe(0);
  });
});

describe("phase one, distress tolerance", () => {
  /**
   * ☠️ The plan is a SINGLETON, so "one exists" would be true forever after the
   * first build - and a replayed programme would open with its first task
   * already done. What counts is that it was touched since the phase began.
   */
  it("counts the coping plan only when it was touched since the phase began", () => {
    const old = deriveDbtProgram(
      input({
        copingPlan: {
          id: "p",
          userId: "u",
          plan: { items: [], fallback: [] },
          createdAt: BEFORE,
          updatedAt: BEFORE,
        },
      }),
    );
    expect(old.phase!.milestones[0]!.done).toBe(false);

    const touched = deriveDbtProgram(
      input({
        copingPlan: {
          id: "p",
          userId: "u",
          plan: { items: [], fallback: [] },
          createdAt: BEFORE,
          updatedAt: AFTER,
        },
      }),
    );
    expect(touched.phase!.milestones[0]!.done).toBe(true);
  });

  it("counts a muscle-relaxation session completed since the phase began", () => {
    expect(deriveDbtProgram(input({ sessions: [session()] })).phase!.milestones[1]!.done).toBe(
      true,
    );
    expect(
      deriveDbtProgram(input({ sessions: [session({ completedAt: BEFORE })] })).phase!
        .milestones[1]!.done,
    ).toBe(false);
  });

  /**
   * ☠️ The row's OWN captured day, never the viewer's. A session recorded at
   * 11pm in Sofia still names that day after the person flies west - which is
   * the whole point of the captured frame, and the reason ACT's viewer-local
   * predicate is the wrong one to copy here.
   */
  it("buckets the daily practice by the row's own captured day", () => {
    const onDay = deriveDbtProgram(
      input({ sessions: [session({ dayKey: "2026-06-02" })], selectedDate: "2026-06-02" }),
    );
    expect(onDay.phase!.dailyPractice!.done).toBe(true);

    const otherDay = deriveDbtProgram(
      input({ sessions: [session({ dayKey: "2026-06-01" })], selectedDate: "2026-06-02" }),
    );
    expect(otherDay.phase!.dailyPractice!.done).toBe(false);
  });
});

describe("phase three, emotion regulation", () => {
  const phaseThree = (overrides: Partial<DeriveDbtProgramInput> = {}) =>
    deriveDbtProgram(input({ phaseIndex: 2, ...overrides }));

  /** ☠️ A plan's EXISTENCE is never the fact: writing one down is not doing it. */
  it("counts an opposite-action plan only once it is done", () => {
    const planned = phaseThree({
      oppositeActionPlans: [record({ doneAt: null, doneDayKey: null })],
    });
    expect(planned.phase!.milestones[1]!.done).toBe(false);

    const done = phaseThree({
      oppositeActionPlans: [record({ doneAt: AFTER, doneDayKey: "2026-06-02" })],
    });
    expect(done.phase!.milestones[1]!.done).toBe(true);
  });

  it("takes its daily practice from a record OR a finished plan", () => {
    expect(phaseThree({ emotionRecords: [record()] }).phase!.dailyPractice!.done).toBe(true);
    expect(
      phaseThree({ oppositeActionPlans: [record({ doneDayKey: "2026-06-02" })] }).phase!
        .dailyPractice!.done,
    ).toBe(true);
  });
});

describe("phase four, interpersonal effectiveness", () => {
  const phaseFour = (overrides: Partial<DeriveDbtProgramInput> = {}) =>
    deriveDbtProgram(input({ phaseIndex: 3, ...overrides }));

  it("takes its daily practice from any DBT record", () => {
    expect(phaseFour({ judgements: [record()] }).phase!.dailyPractice!.done).toBe(true);
    expect(phaseFour({ scripts: [record()] }).phase!.dailyPractice!.done).toBe(true);
  });

  /**
   * ☠️ The coping plan is NOT a daily fact: its `updatedAt` moves when someone
   * reorders a list, which is not a day's practice.
   */
  it("does not take a touched coping plan as the day's practice", () => {
    const view = phaseFour({
      copingPlan: {
        id: "p",
        userId: "u",
        plan: { items: [], fallback: [] },
        createdAt: AFTER,
        updatedAt: AFTER,
      },
    });
    expect(view.phase!.dailyPractice!.done).toBe(false);
  });
});

describe("readiness and the graduation lines", () => {
  /**
   * ☠️ The daily practice is a practice, not a gate. A phase is ready on its
   * milestones alone, so a day without the daily task never holds anyone shut.
   */
  it("is ready on the milestones alone, with no daily practice done", () => {
    const view = deriveDbtProgram(
      input({
        copingPlan: {
          id: "p",
          userId: "u",
          plan: { items: [], fallback: [] },
          createdAt: AFTER,
          updatedAt: AFTER,
        },
        sessions: [session({ dayKey: "1999-01-01" })],
      }),
    );

    expect(view.phase!.dailyPractice!.done).toBe(false);
    expect(view.phaseReady).toBe(true);
  });

  it("counts the graduation stats since the programme started, not since the phase", () => {
    const view = deriveDbtProgram(
      input({
        phaseIndex: 3,
        phaseStartedAt: "2026-07-01T09:00:00.000Z",
        wiseMindCheckins: [record({ createdAt: AFTER })],
        emotionRecords: [record({ createdAt: BEFORE })],
      }),
    );

    // Written after the programme started but before this phase did: still
    // counted, because a graduation is about the whole walk.
    expect(view.summaryStats.wiseMindCheckins).toBe(1);
    // Written before the programme started: not counted.
    expect(view.summaryStats.emotionRecords).toBe(0);
  });

  it("counts a session by its completion and a script by its follow-through", () => {
    const view = deriveDbtProgram(
      input({
        sessions: [session({ completedAt: AFTER, createdAt: BEFORE })],
        scripts: [record({ doneAt: AFTER }), record({ id: "open", doneAt: null })],
      }),
    );

    expect(view.summaryStats.sessions).toBe(1);
    expect(view.summaryStats.scriptsDone).toBe(1);
  });

  it("has a zero-safe stat block before anything is done", () => {
    const view = deriveDbtProgram(input({ startedAt: null }));
    expect(view.summaryStats).toEqual({
      sessions: 0,
      wiseMindCheckins: 0,
      emotionRecords: 0,
      scriptsDone: 0,
    });
  });
});

/**
 * ☠️ A DBT phase reads DBT tables only. Nothing in this definition mentions a
 * breathing session, a meditation sit, a journal entry or a thought record -
 * even though CBT's `calmingDaily` counts any meditation row, which would have
 * been the precedent for doing otherwise.
 */
describe("what the programme refuses to read", () => {
  it("names no other module's table in any signal", () => {
    const source = JSON.stringify(
      DBT_PROGRAM.map((phase) =>
        phase.milestones
          .concat(phase.dailyPractice ? [phase.dailyPractice] : [])
          .map((task) => task.route),
      ),
    );
    expect(source).not.toMatch(
      /\/tools\/(breathing|meditation|journal|check-in|sleep|habits|grounding)/,
    );
    expect(source).not.toMatch(/\/modules\/(cbt|act)/);
  });
});
