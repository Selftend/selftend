import type { Href } from "expo-router";

import {
  DBT_PROGRAM,
  atOrAfter,
  type DbtProgramSignalData,
} from "@/src/features/dbt/program-definition";
import type {
  CopingPlan,
  DbtSession,
  EmotionRecord,
  Judgement,
  OppositeActionPlan,
  Script,
  WiseMindCheckin,
} from "@/src/features/dbt/types";
import type { ProgramStatus, ProgramTaskView } from "@/src/features/modules/program-types";

/**
 * The DBT programme's derived view (spec §4).
 *
 * A per-module fork of ACT's `derive-act-program.ts`, which is itself a fork of
 * CBT's. ⚠️ A third fork is the shipped pattern rather than an oversight: the
 * three differ in their signal data, their summary stats and their day
 * predicate, and generalising them is a separate decision. What is NOT forked
 * is the presentation - `ProgramCard` and `ProgramGraduation` are already
 * parameterised by namespace, and this module passes `ns="dbt"`.
 */

export interface DeriveDbtProgramInput {
  startedAt: string | null;
  completedAt: string | null;
  selectedDate: string;
  phaseIndex: number;
  phaseStartedAt: string | null;
  copingPlan: CopingPlan | null;
  sessions: DbtSession[];
  wiseMindCheckins: WiseMindCheckin[];
  judgements: Judgement[];
  emotionRecords: EmotionRecord[];
  oppositeActionPlans: OppositeActionPlan[];
  scripts: Script[];
}

export interface CurrentDbtPhaseView {
  key: string;
  themeLabelKey: string;
  themeSubKey: string;
  themeDescKey: string;
  milestones: ProgramTaskView[];
  dailyPractice: ProgramTaskView | null;
}

/**
 * The counts the graduation lines read - **since the programme started**, not
 * lifetime. ⚠️ That leaves a one-off gap against the module header's lifetime
 * stats, which is the same gap the CBT and ACT homes already show: shipped
 * behaviour, and a deliberate one, because a graduation is about the walk and a
 * header is about the whole history.
 */
interface DbtProgramSummaryStats {
  sessions: number;
  wiseMindCheckins: number;
  emotionRecords: number;
  scriptsDone: number;
}

export interface DbtProgramView {
  status: ProgramStatus;
  startedAt: string | null;
  phaseIndex: number;
  totalPhases: number;
  isLastPhase: boolean;
  phase: CurrentDbtPhaseView | null;
  phaseReady: boolean;
  summaryStats: DbtProgramSummaryStats;
}

function buildSignalData(input: DeriveDbtProgramInput, since: number): DbtProgramSignalData {
  return {
    since,
    selectedDate: input.selectedDate,
    copingPlan: input.copingPlan,
    sessions: input.sessions,
    wiseMindCheckins: input.wiseMindCheckins,
    judgements: input.judgements,
    emotionRecords: input.emotionRecords,
    oppositeActionPlans: input.oppositeActionPlans,
    scripts: input.scripts,
  };
}

export function deriveDbtProgram(input: DeriveDbtProgramInput): DbtProgramView {
  const totalPhases = DBT_PROGRAM.length;
  const startedSince = input.startedAt ? new Date(input.startedAt).getTime() : 0;
  const countSince = (items: { createdAt: string }[]) =>
    items.filter((item) => atOrAfter(item.createdAt, startedSince)).length;

  const summaryStats: DbtProgramSummaryStats = {
    // Sessions are counted by their COMPLETION, not their row creation: a row
    // only exists once the session finished, but `completedAt` is the fact the
    // line is about.
    sessions: input.sessions.filter((session) => atOrAfter(session.completedAt, startedSince))
      .length,
    wiseMindCheckins: countSince(input.wiseMindCheckins),
    emotionRecords: countSince(input.emotionRecords),
    scriptsDone: input.scripts.filter((script) => atOrAfter(script.doneAt, startedSince)).length,
  };

  if (!input.startedAt) {
    return {
      status: "not_started",
      startedAt: null,
      phaseIndex: 0,
      totalPhases,
      isLastPhase: false,
      phase: null,
      phaseReady: false,
      summaryStats,
    };
  }
  if (input.completedAt) {
    return {
      status: "graduated",
      startedAt: input.startedAt,
      phaseIndex: input.phaseIndex,
      totalPhases,
      isLastPhase: input.phaseIndex >= totalPhases - 1,
      phase: null,
      phaseReady: false,
      summaryStats,
    };
  }

  const phaseIndex = Math.min(Math.max(input.phaseIndex, 0), totalPhases - 1);
  const def = DBT_PROGRAM[phaseIndex]!;
  const since = new Date(input.phaseStartedAt ?? input.startedAt).getTime();
  const data = buildSignalData(input, since);

  const toView = (task: {
    key: string;
    labelKey: string;
    route: Href;
    signal: (d: DbtProgramSignalData) => { current: number; target: number };
  }): ProgramTaskView => {
    const { current, target } = task.signal(data);
    return {
      key: task.key,
      labelKey: task.labelKey,
      route: task.route,
      current,
      target,
      done: current >= target,
    };
  };

  const milestones = def.milestones.map(toView);
  const dailyPractice = def.dailyPractice ? toView(def.dailyPractice) : null;
  // ☠️ Milestones ONLY. The daily practice is a practice, not a gate: a day
  // without it changes nothing and is never named, so it must not hold a phase
  // shut either.
  const phaseReady = milestones.every((milestone) => milestone.done);

  return {
    status: "in_progress",
    startedAt: input.startedAt,
    phaseIndex,
    totalPhases,
    isLastPhase: phaseIndex >= totalPhases - 1,
    phase: {
      key: def.key,
      themeLabelKey: def.themeLabelKey,
      themeSubKey: def.themeSubKey,
      themeDescKey: def.themeDescKey,
      milestones,
      dailyPractice,
    },
    phaseReady,
    summaryStats,
  };
}
